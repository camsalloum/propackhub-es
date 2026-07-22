import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, and, desc, sql, isNull, asc, count as drizzleCount } from 'drizzle-orm';
import { type VisibilityProfile, derivePrintingWebClass, defaultOrderQuantityUnit, mergePackagingConfigDefaults, mergeConsumablesConfigDefaults } from '@es/engine';
import { getEffectiveProfile, stripEstimateRow, stripCalculationResult } from '../utils/visibility';
import { calculateAndPersistEstimate, buildEngineMaterialMap, type MaterialRow } from '../services/estimate-calculation';
import { loadTenantMaterialsForEstimate } from '../utils/material-map';
import { getMasterDataVersion } from '../db/platform-master-data';
import { buildLayerInsertValues, toMaterialLineageSource } from '../utils/layer-lineage';
import {
  buildEstimateClassificationSnapshot,
  mergeEstimateDimensionsClassification,
  stripConfigureFromTemplateFlag,
} from '../utils/estimate-classification';
import { parsePagination, paginate } from '../utils/pagination';
import {
  computeEstimateStructureSignature,
  computeTemplateStructureSignature,
  detectProcessInsertMode,
  findEstimateTemplate,
  insertProcessCompat,
  loadEstimateStructureLayers,
  resolveEstimateProcesses,
} from '../utils/estimate-processes';
import {
  validateProcessesCustomizeTransition,
  detectStateTransition,
  buildStateSnapshot,
  type EstimateState,
} from '../utils/state-validation';
import {
  logEstimateStateTransition,
} from '../utils/estimate-audit';
import { AppError, isAuthError, isFkViolation, sendCaughtError } from '../utils/errors';
import { generateRefNumber } from '../utils/ref-numbers';
import { cloneEstimate } from '../services/clone-estimate';
import {
  createQuote,
  deriveToolingFromColors,
  inheritedQuoteFieldsFromParent,
  isQuoteLocked,
  loadQuoteForEstimate,
  mapEstimateStatusToQuoteStatus,
  maybeCopyDeliveryTermToQuote,
  nextEstimateSortOrder,
  syncQuoteStatusFromEstimates,
  validateEstimateSaveRefs,
} from '../services/quote-helpers';
import { commercialDefaultsFromCustomer } from '../utils/customer-address';
import { logQuoteStatusTransition } from '../utils/quote-audit';

export { generateRefNumber };

type EstimateRow = typeof schema.estimates.$inferSelect;

/** Returns 409 payload when parent quote is sent/locked; null when editable. */
async function quoteLockError(
  db: ReturnType<typeof getDatabase>,
  tenantId: string,
  quoteId: string | null | undefined
): Promise<{ error: string } | null> {
  if (!quoteId) return null;
  const [quote] = await db
    .select({ status: schema.quotes.status, sentAt: schema.quotes.sentAt })
    .from(schema.quotes)
    .where(
      and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.tenantId, tenantId),
        isNull(schema.quotes.deletedAt)
      )
    );
  if (isQuoteLocked(quote)) {
    return { error: 'Quote is sent and locked. Unlock or re-quote to edit.' };
  }
  return null;
}
type LayerRow = typeof schema.layers.$inferSelect;

function signatureLayerType(
  materialType: string | null | undefined
): 'substrate' | 'ink' | 'adhesive' {
  if (materialType === 'ink') return 'ink';
  if (materialType === 'adhesive') return 'adhesive';
  return 'substrate';
}

async function getUserVisibilityProfile(db: any, userId: string): Promise<VisibilityProfile> {
  const [userRecord] = await db
    .select({ visibilityProfile: schema.users.visibilityProfile, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  return getEffectiveProfile(userRecord?.role, userRecord?.visibilityProfile);
}

const LaminationRecipeComponentSchema = z.object({
  role: z.enum(['adhesive', 'hardener', 'solvent', 'other']),
  name: z.string(),
  parts: z.number().positive(),
  solidPercent: z.number().min(0).max(100),
  pricePerKgUsd: z.number().optional(),
  solventKey: z.string().optional(),
});

const LaminationRecipeSchema = z.object({
  tier: z.enum(['GP', 'MP', 'HP', 'HP_SF', 'CUSTOM']),
  components: z.array(LaminationRecipeComponentSchema).min(1),
});

const EstimateCreateSchema = z.object({
  customerId: z.string().uuid().optional(),
  jobName: z.string().min(1),
  productType: z.enum(['roll', 'sleeve', 'pouch', 'bag']),
  productSubtype: z.string().max(64).optional(),
  printingWebClass: z.enum(['wide_web', 'narrow_web']).default('wide_web'),
  dimensions: z.record(z.any()),
  markupPercent: z.coerce.number().default(15),
  operatingCostMethod: z
    .enum(['process_per_kg', 'markup_over_rm', 'fixed_per_group'])
    .nullable()
    .optional(),
  profitMarginPercent: z.coerce.number().min(0).max(100).nullable().optional(),
  platesPerKg: z.coerce.number().default(0),
  deliveryPerKg: z.coerce.number().default(0),
  layers: z.array(z.object({
    materialId: z.string().uuid(),
    micron: z.coerce.number().positive(),
    position: z.coerce.number().nonnegative(),
    gsm: z.coerce.number().nonnegative().optional(),
    unitCostSnapshotUsd: z.coerce.number().nonnegative().optional(), // per-layer price override
  })),
  processes: z.array(z.object({
    name: z.string(),
    costPerHour: z.coerce.number(),
    costPerKgUsd: z.coerce.number().nonnegative().default(0),
    speedBasis: z.enum(['kg_per_hour', 'm_per_min', 'pcs_per_min']),
    speedValue: z.coerce.number(),
    setupHours: z.coerce.number().default(0),
    enabled: z.boolean().default(true),
    processKey: z.string().nullable().optional(),
    processQuantity: z.coerce.number().int().positive().default(1),
  })).default([]),
  slabs: z.array(z.object({
    quantityKg: z.coerce.number().positive(),
    pricePerKg: z.coerce.number().nonnegative(),
  })).default([]),
  orderQuantityKg: z.coerce.number().positive().optional(),
  orderQuantityUnit: z.string().max(32).optional(),
  sourceTemplateKey: z.string().max(128).optional(),
  // Pricing model v2
  pricingMethod: z.enum(['markup', 'margin_per_kg']).optional(),
  marginValuePerKgUsd: z.coerce.number().nonnegative().optional(),
  cormPerKgUsd: z.coerce.number().nonnegative().optional(),
  cormPerKgPlain: z.coerce.number().nonnegative().optional(),
  moqKg: z.coerce.number().nonnegative().optional(),
  toolingChargeUsd: z.coerce.number().nonnegative().optional(),
  toolingBilledToCustomer: z.boolean().optional(),
  deliveryTerm: z.string().max(32).optional(),
  deliveryChargeUsd: z.coerce.number().nonnegative().optional(),
  // wasteBands removed from per-estimate payload — now platform-wide (Master Data → Waste Bands).
  solventMaterialId: z.string().uuid().optional(),
  solventCostPerKgUsd: z.coerce.number().nonnegative().optional(),
  solventRatio: z.coerce.number().positive().optional(),
  laminationRecipeOverrides: z.record(z.string(), LaminationRecipeSchema).optional(),
  cleaningSolventKgPerJob: z.coerce.number().nonnegative().optional(),
  sleeveSeamingSolventGsm: z.coerce.number().nonnegative().optional(),
  packagingConfig: z
    .object({
      loadPerPalletKg: z.coerce.number().positive().optional(),
      cartonsPerPallet: z.coerce.number().positive().optional(),
      pcsPerCarton: z.coerce.number().positive().optional(),
      ldWrapPasses: z.coerce.number().positive().optional(),
      ldWrapFilmWidthMm: z.coerce.number().positive().optional(),
      ldWrapGsm: z.coerce.number().positive().optional(),
      stretchWrapLayers: z.coerce.number().positive().optional(),
      palletFootprintLm: z.coerce.number().positive().optional(),
      palletFootprintWm: z.coerce.number().positive().optional(),
      coreMaterialId: z.string().uuid().optional().nullable(),
      ldWrapMaterialId: z.string().uuid().optional().nullable(),
      stretchMaterialId: z.string().uuid().optional().nullable(),
      palletMaterialId: z.string().uuid().optional().nullable(),
      cartonMaterialId: z.string().uuid().optional().nullable(),
      unitPriceOverridesUsd: z.record(z.string(), z.coerce.number().nonnegative()).optional(),
      qtyOverrides: z.record(z.string(), z.coerce.number().nonnegative()).optional(),
    })
    .optional()
    .nullable(),
  consumablesConfig: z
    .object({
      mountingTapeMaterialId: z.string().uuid().optional().nullable(),
      otherMaterialId: z.string().uuid().optional().nullable(),
      mountWidthM: z.coerce.number().positive().optional(),
      repeatM: z.coerce.number().positive().optional(),
      colors: z.coerce.number().int().nonnegative().optional(),
      tapeM2Override: z.coerce.number().nonnegative().optional().nullable(),
      unitPriceOverridesUsd: z.record(z.string(), z.coerce.number().nonnegative()).optional(),
    })
    .optional()
    .nullable(),
  inkPrintingProcess: z.enum(['flexo', 'rotogravure']).optional().nullable(),
  status: z.enum(['draft', 'sent', 'won', 'lost']).optional(),
  notes: z.string().optional(),
  note: z.string().optional(), // used in activity log
  structureForked: z.boolean().optional(),
  processesCustomized: z.boolean().optional(),
  // Multi-SKU quote fields
  quoteId: z.string().uuid().optional(),
  /** When creating without quoteId: mark the auto-created parent as a price check. */
  isPriceCheck: z.boolean().optional(),
  skuLabel: z.string().max(255).optional().nullable(),
  brand: z.string().max(255).optional().nullable(),
  specsCode: z.string().max(64).optional().nullable(),
  printColorCount: z.coerce.number().int().nonnegative().optional().nullable(),
  costPerColor: z.coerce.number().nonnegative().optional().nullable(),
  toolingBillingMode: z.enum(['amortized', 'separate', 'not_billed']).optional().nullable(),
  toolingScenario: z.enum(['new', 'existing', 'modification']).optional().nullable(),
  billableColorCount: z.coerce.number().int().nonnegative().optional().nullable(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

/** PATCH accepts any subset of the create fields. */
const EstimateUpdateSchema = EstimateCreateSchema.partial();

const RequoteBodySchema = z.object({
  quoteName: z.string().min(1).optional(),
  skuLabel: z.string().optional(),
  variantDescription: z.string().optional().nullable(),
});

export async function getEstimatesRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Querystring: { limit?: string; offset?: string; sourceTemplateKey?: string; status?: string };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const db = getDatabase();
    const { limit, offset } = parsePagination(request.query);
    const { sourceTemplateKey, status } = request.query;

    const profile = await getUserVisibilityProfile(db, user.userId);

    const conditions = [
      eq(schema.estimates.tenantId, tenantId),
      isNull(schema.estimates.deletedAt),
    ];
    if (sourceTemplateKey) {
      conditions.push(eq(schema.estimates.sourceTemplateKey, sourceTemplateKey));
    }
    if (status) {
      conditions.push(eq(schema.estimates.status, status as 'draft' | 'sent' | 'won' | 'lost'));
    }
    const whereClause = and(...conditions);

    // Count total (for pagination metadata)
    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(schema.estimates)
      .where(whereClause);

    const estimates = await db
      .select()
      .from(schema.estimates)
      .where(whereClause)
      .orderBy(
        desc(sourceTemplateKey ? schema.estimates.updatedAt : schema.estimates.createdAt)
      )
      .limit(limit)
      .offset(offset);

    // Enrich with customer names
    const customers = await db
      .select({ id: schema.customers.id, companyName: schema.customers.companyName })
      .from(schema.customers)
      .where(eq(schema.customers.tenantId, tenantId));
    const customerMap = new Map(customers.map((c: (typeof customers)[number]) => [c.id, c.companyName]));

    const visibleEstimates = estimates.map((est: (typeof estimates)[number]) => ({
      ...stripEstimateRow(est, profile),
      customerName: est.customerId ? (customerMap.get(est.customerId) ?? null) : null,
    }));

    return reply.send(paginate(visibleEstimates, Number(total), limit, offset));
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to fetch estimates', 'Get estimates error:');
  }
}

export async function createEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof EstimateCreateSchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const data = EstimateCreateSchema.parse(request.body);

    const db = getDatabase();

    const refErr = await validateEstimateSaveRefs(db, tenantId, {
      layers: data.layers,
      solventMaterialId: data.solventMaterialId,
    });
    if (refErr) {
      return reply.status(409).send({ error: refErr });
    }

    // Get tenant for currency
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    // Generate ref number
    const refNumber = await generateRefNumber(db, tenantId);

    // Resolve parent quote (auto-create one-estimate quote when omitted — D5).
    let quoteId = data.quoteId ?? null;
    let displayCurrency = tenant.displayCurrency;
    let exchangeRateUsdToDisplay = tenant.exchangeRateUsdToDisplay.toString();
    let customerId = data.customerId ?? null;
    let printColorCount = data.printColorCount ?? null;
    let costPerColor = data.costPerColor ?? null;
    let toolingBillingMode = data.toolingBillingMode ?? null;
    let toolingScenario = data.toolingScenario ?? 'new';
    let billableColorCount = data.billableColorCount ?? null;
    let sortOrder = data.sortOrder ?? 0;

    if (quoteId) {
      const [quote] = await db
        .select()
        .from(schema.quotes)
        .where(
          and(
            eq(schema.quotes.id, quoteId),
            eq(schema.quotes.tenantId, tenantId),
            isNull(schema.quotes.deletedAt)
          )
        );
      if (!quote) {
        return reply.status(404).send({ error: 'Quote not found' });
      }
      if (isQuoteLocked(quote)) {
        return reply.status(409).send({
          error: 'Quote is sent and locked. Unlock or re-quote to edit.',
        });
      }
      displayCurrency = quote.displayCurrency;
      exchangeRateUsdToDisplay = String(quote.exchangeRateUsdToDisplay);
      customerId = quote.customerId ?? customerId;
      if (printColorCount == null && quote.defaultPrintColorCount != null) {
        printColorCount = quote.defaultPrintColorCount;
      }
      if (costPerColor == null && quote.defaultCostPerColor != null) {
        costPerColor = Number(quote.defaultCostPerColor);
      }
      if (toolingBillingMode == null && quote.defaultToolingBillingMode != null) {
        toolingBillingMode = quote.defaultToolingBillingMode as
          | 'amortized'
          | 'separate'
          | 'not_billed';
      }
      if (data.sortOrder == null) {
        sortOrder = await nextEstimateSortOrder(db, quote.id);
      }
    } else {
      const asPriceCheck = data.isPriceCheck === true;
      if (asPriceCheck) {
        customerId = null;
      }
      let paymentTerms: string | null = null;
      let deliveryTerm = data.deliveryTerm ?? 'EXW';
      if (customerId) {
        const [customer] = await db
          .select({ paymentTerms: schema.customers.paymentTerms })
          .from(schema.customers)
          .where(
            and(eq(schema.customers.id, customerId), eq(schema.customers.tenantId, tenantId))
          )
          .limit(1);
        paymentTerms = commercialDefaultsFromCustomer(customer).paymentTerms;
        if (!data.deliveryTerm) {
          deliveryTerm = commercialDefaultsFromCustomer(customer).deliveryTerm ?? 'EXW';
        }
      }
      const quote = await createQuote(db, {
        tenantId,
        customerId: asPriceCheck ? null : customerId,
        name: data.jobName,
        displayCurrency,
        exchangeRateUsdToDisplay,
        status: mapEstimateStatusToQuoteStatus(data.status),
        deliveryTerm: asPriceCheck ? null : deliveryTerm,
        paymentTerms: asPriceCheck ? null : paymentTerms,
        defaultPrintColorCount: printColorCount,
        defaultCostPerColor: costPerColor,
        defaultToolingBillingMode: toolingBillingMode,
        isPriceCheck: asPriceCheck,
      });
      quoteId = quote.id;
    }

    const derivedTooling = deriveToolingFromColors({
      printColorCount,
      costPerColor,
      toolingBillingMode,
      toolingScenario,
      billableColorCount,
      exchangeRateUsdToDisplay,
    });

    const tenantMaterials = await loadTenantMaterialsForEstimate(tenantId, [
      ...data.layers.map((l) => l.materialId),
      data.solventMaterialId,
    ]);
    const materialMap = buildEngineMaterialMap(tenantMaterials);
    const printingWebClass = derivePrintingWebClass(
      data.layers.map((l) => ({ materialId: l.materialId })),
      materialMap
    );

    const masterDataVersion = await getMasterDataVersion();
    const materialById = new Map<string, MaterialRow>(
      tenantMaterials.map((m: MaterialRow) => [m.id, m])
    );

    const structureSignature = computeEstimateStructureSignature(
      data.layers.map((layer) => ({
        type: signatureLayerType(materialById.get(layer.materialId)?.type),
        position: layer.position,
      })),
      data.productType
    );
    const structureForked =
      typeof data.structureForked === 'boolean'
        ? data.structureForked
        : !data.sourceTemplateKey;
    const processesCustomized =
      typeof data.processesCustomized === 'boolean'
        ? data.processesCustomized
        : false;

    const processInsertMode = await detectProcessInsertMode(db);

    // Create estimate
    const [estimate] = (await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId,
        quoteId,
        sortOrder,
        skuLabel: data.skuLabel ?? data.jobName,
        brand: data.brand ?? null,
        specsCode: data.specsCode ?? null,
        printColorCount,
        costPerColor: costPerColor != null ? String(costPerColor) : null,
        toolingBillingMode: derivedTooling?.toolingBillingMode ?? toolingBillingMode,
        toolingScenario: toolingScenario ?? 'new',
        billableColorCount: derivedTooling?.billableColorCount ?? billableColorCount,
        refNumber,
        jobName: data.jobName,
        productType: data.productType,
        productSubtype: data.productSubtype,
        printingWebClass,
        dimensions: data.dimensions,
        markupPercent: data.markupPercent.toString(),
        operatingCostMethod: data.operatingCostMethod ?? undefined,
        profitMarginPercent:
          data.profitMarginPercent != null ? String(data.profitMarginPercent) : undefined,
        platesPerKg: data.platesPerKg.toString(),
        deliveryPerKg: data.deliveryPerKg.toString(),
        displayCurrency,
        exchangeRateUsdToDisplay,
        status: data.status ?? 'draft',
        notes: data.notes ?? undefined,
        masterDataVersion,
        structureForked,
        processesCustomized,
        structureSignature,
        orderQuantityKg: data.orderQuantityKg != null ? String(data.orderQuantityKg) : undefined,
        orderQuantityUnit:
          data.orderQuantityUnit ??
          defaultOrderQuantityUnit({
            productType: data.productType,
            sourceTemplateKey: data.sourceTemplateKey,
            jobName: data.jobName,
            dimensions: data.dimensions as Record<string, unknown> | undefined,
          }),
        sourceTemplateKey: data.sourceTemplateKey ?? undefined,
        pricingMethod: data.pricingMethod ?? undefined,
        marginValuePerKgUsd: data.marginValuePerKgUsd != null ? String(data.marginValuePerKgUsd) : undefined,
        cormPerKgUsd: data.cormPerKgUsd != null ? String(data.cormPerKgUsd) : undefined,
        cormPerKgPlain: data.cormPerKgPlain != null ? String(data.cormPerKgPlain) : undefined,
        moqKg: data.moqKg != null ? String(data.moqKg) : undefined,
        toolingChargeUsd:
          derivedTooling?.toolingChargeUsd ??
          (data.toolingChargeUsd != null ? String(data.toolingChargeUsd) : undefined),
        toolingBilledToCustomer:
          derivedTooling?.toolingBilledToCustomer ?? data.toolingBilledToCustomer ?? false,
        deliveryTerm: data.deliveryTerm ?? undefined,
        deliveryChargeUsd: data.deliveryChargeUsd != null ? String(data.deliveryChargeUsd) : undefined,
        solventMaterialId: data.solventMaterialId,
        solventCostPerKgUsd: data.solventCostPerKgUsd != null ? String(data.solventCostPerKgUsd) : undefined,
        solventRatio: data.solventRatio != null ? String(data.solventRatio) : undefined,
        laminationRecipeOverrides: data.laminationRecipeOverrides ?? undefined,
        cleaningSolventKgPerJob:
          data.cleaningSolventKgPerJob != null ? String(data.cleaningSolventKgPerJob) : undefined,
        sleeveSeamingSolventGsm:
          data.sleeveSeamingSolventGsm != null ? String(data.sleeveSeamingSolventGsm) : undefined,
        packagingConfig: mergePackagingConfigDefaults(data.packagingConfig ?? null),
        consumablesConfig: mergeConsumablesConfigDefaults(data.consumablesConfig ?? null),
        inkPrintingProcess: data.inkPrintingProcess ?? undefined,
      })
      .returning()) as EstimateRow[];

    // Create layers
    for (const layer of data.layers) {
      const mat = materialById.get(layer.materialId);
      await db.insert(schema.layers).values(
        buildLayerInsertValues({
          estimateId: estimate.id,
          materialId: layer.materialId,
          micron: layer.micron,
          position: layer.position,
          material: mat ? toMaterialLineageSource(mat) : null,
          unitCostOverrideUsd: layer.unitCostSnapshotUsd ?? null,
          gsm: layer.gsm ?? null,
        })
      );
    }

    // Create processes
    for (const process of data.processes) {
      await insertProcessCompat(db, processInsertMode, {
        estimateId: estimate.id,
        name: process.name,
        processKey: process.processKey ?? null,
        processQuantity: process.processQuantity ?? 1,
        costPerHour: process.costPerHour.toString(),
        costPerKgUsd: String(process.costPerKgUsd ?? 0),
        speedBasis: process.speedBasis,
        speedValue: process.speedValue.toString(),
        setupHours: process.setupHours.toString(),
        enabled: process.enabled,
      });
    }

    // Create slabs
    for (let i = 0; i < data.slabs.length; i++) {
      const slab = data.slabs[i];
      await db
        .insert(schema.slabs)
        .values({
          estimateId: estimate.id,
          quantityKg: slab.quantityKg.toString(),
          pricePerKg: slab.pricePerKg.toString(),
          sortOrder: i,
        });
    }

    if (quoteId) {
      await maybeCopyDeliveryTermToQuote(db, tenantId, quoteId, data.deliveryTerm);
      await syncQuoteStatusFromEstimates(db, quoteId, tenantId);
    }

    return reply.status(201).send({
      ...estimate,
      refNumber: estimate.refNumber,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    return sendCaughtError(reply, error, 'Failed to create estimate', 'Create estimate error:');
  }
}

export async function calculateEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const { id } = request.params;

    const db = getDatabase();

    const [estimateRow] = await db
      .select({ quoteId: schema.estimates.quoteId })
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      );
    if (!estimateRow) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }
    const lockErr = await quoteLockError(db, tenantId, estimateRow.quoteId);
    if (lockErr) return reply.status(409).send(lockErr);

    const profile = await getUserVisibilityProfile(db, user.userId);
    const result = await calculateAndPersistEstimate(db, id, tenantId);
    return reply.send(stripCalculationResult(result, profile));
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Estimate not found') {
      return reply.status(404).send({ error: 'Estimate not found' });
    }
    const { MissingMaterialsError } = await import('@es/engine');
    if (error instanceof MissingMaterialsError) {
      return reply.status(400).send({
        error: error.message,
        materialIds: error.materialIds,
      });
    }
    return sendCaughtError(reply, error, 'Failed to calculate estimate', 'Calculate estimate error:');
  }
}

export async function generateProposalPdfRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();
    const { buildProposalPdfBuffer } = await import('../services/proposal-pdf');
    const pdfBuffer = await buildProposalPdfBuffer(db, id, tenantId, user.userId);
    reply.header('Content-Type', 'application/pdf');
    return reply.send(pdfBuffer);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not available')) {
      return reply.status(403).send({ error: error.message });
    }
    return sendCaughtError(reply, error, 'Failed to generate proposal PDF', 'Generate proposal PDF error:');
  }
}

// Get single estimate by ID
async function getEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    // Get estimate (BUG-5: honor soft-delete)
    const [estimate] = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      );

    if (!estimate) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    // Get layers
    const layers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, id))
      .orderBy(schema.layers.position);

    // Template `default_processes` is authoritative for template-based quotes.
    // Reconcile legacy/partial DB rows in-memory (no write-on-read).
    const processes = await resolveEstimateProcesses(db, estimate);

    // Get slabs
    const slabs = await db
      .select()
      .from(schema.slabs)
      .where(eq(schema.slabs.estimateId, id))
      .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

    // Get activity logs for this estimate
    const logs = await db
      .select()
      .from(schema.activityLogs)
      .where(and(eq(schema.activityLogs.entityType, 'estimate'), eq(schema.activityLogs.entityId, id)))
      .orderBy(desc(schema.activityLogs.createdAt));

    const requestUser = extractUserFromRequest(request);
    const profile = await getUserVisibilityProfile(db, requestUser.userId);

    const layerMaterialIds = layers.map((l) => l.materialId);
    const tenantMaterials = await loadTenantMaterialsForEstimate(tenantId, [
      ...layerMaterialIds,
      estimate.solventMaterialId,
    ]);
    const materialMap = new Map<string, MaterialRow>(tenantMaterials.map((m: MaterialRow) => [m.id, m]));
    const enrichedLayers = layers.map((l: (typeof layers)[number]) => {
      const mat = materialMap.get(l.materialId);
      const stale = !mat;
      return {
        ...l,
        materialName: l.materialName || mat?.name || 'Unknown',
        materialType: mat?.type ?? 'substrate',
        materialHoover: mat?.hoover ?? null,
        materialCostPerKgUsd: mat?.costPerKgUsd ?? '0',
        isSolventBased: mat?.isSolventBased ?? false,
        materialStale: stale,
      };
    });

    reply.header('Cache-Control', 'no-store');
    return reply.send({
      ...stripEstimateRow(estimate, profile),
      layers: enrichedLayers,
      // Always return processes — needed for Mfg & Operating cost calculation
      // even when the process details section is hidden from the user.
      processes,
      slabs: profile.slabTable ? slabs : [],
      activityLogs: logs || [],
      lastCalculatedAt: estimate.lastCalculatedAt,
    });
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to get estimate', 'Get estimate error:');
  }
}

// Update estimate
async function updateEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
    Body: Partial<z.infer<typeof EstimateCreateSchema>>;
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();
    const processInsertMode = await detectProcessInsertMode(db);

    // SC-3: validate the PATCH body. Without this, mistyped keys are silently
    // ignored and out-of-range values (negative µ, NaN) reach the DB. `.partial()`
    // keeps every field optional so callers can PATCH a subset.
    const data = EstimateUpdateSchema.parse(request.body ?? {});

    // Check estimate exists and belongs to tenant (BUG-5: honor soft-delete)
    const [existing] = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      );

    if (!existing) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    const lockErr = await quoteLockError(db, tenantId, existing.quoteId);
    if (lockErr) return reply.status(409).send(lockErr);

    const refErr = await validateEstimateSaveRefs(db, tenantId, {
      layers: data.layers,
      solventMaterialId: data.solventMaterialId,
    });
    if (refErr) {
      return reply.status(409).send({ error: refErr });
    }

    // PHASE 5 VALIDATION: State transition rules
    // Rule 1: Cannot customize processes unless structure is already forked
    if (data.processesCustomized === true) {
      const validation = validateProcessesCustomizeTransition(
        {
          id: existing.id,
          structureForked: existing.structureForked,
          processesCustomized: existing.processesCustomized,
          sourceTemplateKey: existing.sourceTemplateKey,
          structureSignature: existing.structureSignature,
        },
        true
      );
      if (!validation.valid) {
        return reply.status(409).send({ error: validation.error });
      }
    }

    // Rule 2 (removed 2026-07-02 audit): layer edits after processesCustomized=true used to be
    // hard-blocked (409), forcing "Snap back" (which discards the user's confirmed processes) as
    // the only way forward. That contradicts the approved design: a customized/frozen process
    // set must NOT be silently recomputed when layers change, but the user must still be able to
    // keep editing their own structure. `resolveEstimateProcesses()` already returns the frozen
    // DB process rows whenever `processesCustomized` is true, regardless of layer edits, so no
    // block is needed here — the frontend surfaces a "Customized" badge instead.

    const [tenant] = await db
      .select({ quotationValidDays: schema.tenants.quotationValidDays })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    const updates: any = { updatedAt: new Date() };

    // Update basic fields if provided
    if (data.jobName !== undefined) updates.jobName = data.jobName;
    if (data.customerId !== undefined) updates.customerId = data.customerId;
    if (data.status !== undefined) {
      updates.status = data.status;
      if (data.status === 'sent' && existing.status !== 'sent') {
        const sentAt = new Date();
        const validDays = tenant?.quotationValidDays ?? 30;
        updates.sentAt = sentAt;
        updates.validUntil = new Date(sentAt.getTime() + validDays * 86400000);
        try {
          const [proposal] = await db.insert(schema.proposals).values({
            tenantId,
            estimateId: id,
            validUntil: updates.validUntil,
            sentAt,
          }).returning();

          try {
            const { buildProposalPdfBuffer, saveProposalPdf } = await import('../services/proposal-pdf');
            const pdfBuffer = await buildProposalPdfBuffer(db, id, tenantId, user.userId);
            const pdfPath = saveProposalPdf(tenantId, proposal.id, pdfBuffer);
            await db
              .update(schema.proposals)
              .set({ pdfPath })
              .where(eq(schema.proposals.id, proposal.id));
          } catch (pdfErr) {
            request.log.warn({ err: pdfErr, estimateId: id }, 'Failed to persist proposal PDF');
          }
        } catch (propErr) {
          request.log.warn({ err: propErr, estimateId: id }, 'Failed to create proposal record');
        }
      }
    }
    if (data.productType !== undefined) updates.productType = data.productType;
    if (data.productSubtype !== undefined) updates.productSubtype = data.productSubtype;
    if (data.markupPercent !== undefined) updates.markupPercent = data.markupPercent.toString();
    if (data.operatingCostMethod !== undefined) {
      updates.operatingCostMethod = data.operatingCostMethod;
    }
    if (data.profitMarginPercent !== undefined) {
      updates.profitMarginPercent =
        data.profitMarginPercent == null ? null : String(data.profitMarginPercent);
    }
    if (data.platesPerKg !== undefined) updates.platesPerKg = data.platesPerKg.toString();
    if (data.deliveryPerKg !== undefined) updates.deliveryPerKg = data.deliveryPerKg.toString();
    if (data.dimensions !== undefined) {
      updates.dimensions = stripConfigureFromTemplateFlag(
        data.dimensions as Record<string, unknown>
      );
    }
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.orderQuantityKg !== undefined) {
      updates.orderQuantityKg = String(data.orderQuantityKg);
    }
    if (data.orderQuantityUnit !== undefined) {
      updates.orderQuantityUnit = data.orderQuantityUnit;
    }
    if (data.solventMaterialId !== undefined) {
      updates.solventMaterialId = data.solventMaterialId || null;
    }
    if (data.solventCostPerKgUsd !== undefined) {
      updates.solventCostPerKgUsd = String(data.solventCostPerKgUsd);
    }
    if (data.solventRatio !== undefined) {
      updates.solventRatio = String(data.solventRatio);
    }
    if (data.laminationRecipeOverrides !== undefined) {
      updates.laminationRecipeOverrides = data.laminationRecipeOverrides;
    }
    if (data.cleaningSolventKgPerJob !== undefined) {
      updates.cleaningSolventKgPerJob = String(data.cleaningSolventKgPerJob);
    }
    if (data.sleeveSeamingSolventGsm !== undefined) {
      updates.sleeveSeamingSolventGsm = String(data.sleeveSeamingSolventGsm);
    }
    if (data.packagingConfig !== undefined) {
      updates.packagingConfig = mergePackagingConfigDefaults(data.packagingConfig);
    }
    if (data.consumablesConfig !== undefined) {
      updates.consumablesConfig = mergeConsumablesConfigDefaults(data.consumablesConfig);
    }
    if (data.inkPrintingProcess !== undefined) {
      updates.inkPrintingProcess = data.inkPrintingProcess;
    }
    if (data.pricingMethod !== undefined) updates.pricingMethod = data.pricingMethod;
    if (data.marginValuePerKgUsd !== undefined) {
      updates.marginValuePerKgUsd = String(data.marginValuePerKgUsd);
    }
    if (data.cormPerKgUsd !== undefined) {
      updates.cormPerKgUsd = String(data.cormPerKgUsd);
    }
    if (data.cormPerKgPlain !== undefined) {
      updates.cormPerKgPlain = String(data.cormPerKgPlain);
    }
    if (data.moqKg !== undefined) {
      updates.moqKg = String(data.moqKg);
    }
    if (data.skuLabel !== undefined) updates.skuLabel = data.skuLabel;
    if (data.brand !== undefined) updates.brand = data.brand;
    if (data.specsCode !== undefined) updates.specsCode = data.specsCode;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.printColorCount !== undefined) updates.printColorCount = data.printColorCount;
    if (data.costPerColor !== undefined) {
      updates.costPerColor = data.costPerColor != null ? String(data.costPerColor) : null;
    }
    if (data.toolingBillingMode !== undefined) {
      updates.toolingBillingMode = data.toolingBillingMode;
    }
    if (data.toolingScenario !== undefined) {
      updates.toolingScenario = data.toolingScenario ?? 'new';
    }
    if (data.billableColorCount !== undefined) {
      updates.billableColorCount = data.billableColorCount;
    }

    // Colors × cost → toolingChargeUsd at frozen estimate FX (not live quote rate).
    const nextPrintColors =
      data.printColorCount !== undefined ? data.printColorCount : existing.printColorCount;
    const nextCostPerColor =
      data.costPerColor !== undefined ? data.costPerColor : existing.costPerColor;
    const nextBillingMode =
      data.toolingBillingMode !== undefined
        ? data.toolingBillingMode
        : existing.toolingBillingMode;
    const nextToolingScenario =
      data.toolingScenario !== undefined
        ? data.toolingScenario ?? 'new'
        : existing.toolingScenario ?? 'new';
    const nextBillableColors =
      data.billableColorCount !== undefined
        ? data.billableColorCount
        : existing.billableColorCount;
    const derivedTooling = deriveToolingFromColors({
      printColorCount: nextPrintColors,
      costPerColor: nextCostPerColor,
      toolingBillingMode: nextBillingMode,
      toolingScenario: nextToolingScenario,
      billableColorCount: nextBillableColors,
      exchangeRateUsdToDisplay: existing.exchangeRateUsdToDisplay,
    });
    if (derivedTooling) {
      updates.toolingChargeUsd = derivedTooling.toolingChargeUsd;
      updates.toolingBilledToCustomer = derivedTooling.toolingBilledToCustomer;
      updates.toolingBillingMode = derivedTooling.toolingBillingMode;
      updates.billableColorCount = derivedTooling.billableColorCount;
    } else {
      if (data.toolingChargeUsd !== undefined) {
        updates.toolingChargeUsd = String(data.toolingChargeUsd);
      }
      if (data.toolingBilledToCustomer !== undefined) {
        updates.toolingBilledToCustomer = data.toolingBilledToCustomer;
      }
    }
    if (data.deliveryTerm !== undefined) {
      updates.deliveryTerm = data.deliveryTerm || null;
    }
    if (data.deliveryChargeUsd !== undefined) {
      updates.deliveryChargeUsd = String(data.deliveryChargeUsd);
    }
    // wasteBands no longer patched per-estimate — platform-wide via Master Data.
    // Any layer save clears configure-from-template mode in the DB.
    if (data.layers !== undefined && data.dimensions === undefined) {
      updates.dimensions = stripConfigureFromTemplateFlag(
        existing.dimensions as Record<string, unknown> | null
      );
    }

    // BUG-1 (full fix): ONE transaction wraps the base-field update + layers + processes + slabs
    // so the entire PATCH is atomic — no partial state possible.
    let updated!: EstimateRow;

    await db.transaction(async (tx) => {
      // 1. Apply base-field updates inside the transaction
      const [txUpdated] = (await tx
        .update(schema.estimates)
        .set(updates)
        .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)))
        .returning()) as EstimateRow[];
      updated = txUpdated;

      // 2. Layers (delete + re-insert)
      if (data.layers !== undefined) {
        const tenantMaterials = await loadTenantMaterialsForEstimate(tenantId, [
          ...data.layers.map((l) => l.materialId),
          data.solventMaterialId ?? existing.solventMaterialId,
        ]);
        const materialById = new Map<string, MaterialRow>(
          tenantMaterials.map((m: MaterialRow) => [m.id, m])
        );
        const masterDataVersion = await getMasterDataVersion();

        const materialMap = buildEngineMaterialMap(tenantMaterials);
        const derivedPrintingWeb = derivePrintingWebClass(
          data.layers.map((l) => ({ materialId: l.materialId })),
          materialMap
        );

        const templateMc = (
          (existing.dimensions as Record<string, unknown> | null)?.templateClassification as
            | { materialClass?: string }
            | undefined
        )?.materialClass;

        const classificationSnapshot = buildEstimateClassificationSnapshot({
          jobName: data.jobName ?? existing.jobName,
          productType: data.productType ?? existing.productType,
          materialClass: templateMc ?? null,
          layers: data.layers.map((layer) => {
            const mat = materialById.get(layer.materialId);
            return { materialType: mat?.type };
          }),
        });

        const mergedDimensions = mergeEstimateDimensionsClassification(
          (data.dimensions ?? existing.dimensions) as Record<string, unknown>,
          classificationSnapshot
        );

        await tx.delete(schema.layers).where(eq(schema.layers.estimateId, id));
        for (const layer of data.layers) {
          const mat = materialById.get(layer.materialId);
          await tx.insert(schema.layers).values(
            buildLayerInsertValues({
              estimateId: id,
              materialId: layer.materialId,
              micron: layer.micron,
              position: layer.position,
              material: mat ? toMaterialLineageSource(mat) : null,
              unitCostOverrideUsd: layer.unitCostSnapshotUsd ?? null,
              gsm: layer.gsm ?? null,
            })
          );
        }
        // Second estimate update (derived fields) — still inside the same transaction
        await tx
          .update(schema.estimates)
          .set({
            printingWebClass: derivedPrintingWeb,
            masterDataVersion,
            dimensions: mergedDimensions,
            updatedAt: new Date(),
          })
          .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)));
      }

      // 3. Processes (delete + re-insert)
      if (data.processes !== undefined) {
        await tx.delete(schema.processes).where(eq(schema.processes.estimateId, id));
        for (const process of data.processes) {
          await insertProcessCompat(tx, processInsertMode, {
            estimateId: id,
            name: process.name,
            processKey: process.processKey ?? null,
            processQuantity: process.processQuantity ?? 1,
            costPerHour: process.costPerHour.toString(),
            costPerKgUsd: String(process.costPerKgUsd ?? 0),
            speedBasis: process.speedBasis,
            speedValue: process.speedValue.toString(),
            setupHours: process.setupHours.toString(),
            enabled: process.enabled,
          });
        }
      }

      // 4. Slabs (delete + re-insert)
      if (data.slabs !== undefined) {
        await tx.delete(schema.slabs).where(eq(schema.slabs.estimateId, id));
        for (let i = 0; i < data.slabs.length; i++) {
          const slab = data.slabs[i];
          await tx.insert(schema.slabs).values({
            estimateId: id,
            quantityKg: slab.quantityKg.toString(),
            pricePerKg: slab.pricePerKg.toString(),
            sortOrder: i,
          });
        }
      }
    });

    // PHASE 5 AUDIT LOGGING: Track fork/customize/snap-back transitions
    // Capture state before and after for audit trail
    const stateBefore: EstimateState = {
      id: existing.id,
      structureForked: existing.structureForked,
      processesCustomized: existing.processesCustomized,
      sourceTemplateKey: existing.sourceTemplateKey,
      structureSignature: existing.structureSignature,
    };

    // If status changed, insert an activity log for audit trail
    if (updates.status) {
      try {
        const user = extractUserFromRequest(request);
        await db.insert(schema.activityLogs).values({
          tenantId,
          userId: user.userId,
          action: 'status_change',
          entityType: 'estimate',
          entityId: id,
          changes: { status: updates.status, note: data.note || null },
        });
      } catch (logErr) {
        request.log.warn({ err: logErr, estimateId: id }, 'Failed to write activity log');
      }
    }

    // BUG-3: re-select the final row after all updates (second update may change
    // printingWebClass, masterDataVersion, dimensions — returning() from the first
    // update would give the client stale data).
    const [finalRow] = (await db
      .select()
      .from(schema.estimates)
      .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)))) as EstimateRow[];

    let responseRow: EstimateRow | undefined = finalRow ?? updated;

    if (responseRow) {
      const template = await findEstimateTemplate(db, responseRow);
      const structureLayers = await loadEstimateStructureLayers(db, id);
      const structureSignature = computeEstimateStructureSignature(
        structureLayers,
        responseRow.productType
      );
      const templateSignature = template ? computeTemplateStructureSignature(template) : null;

      const processesCustomized =
        typeof data.processesCustomized === 'boolean'
          ? data.processesCustomized
          : Boolean(responseRow.processesCustomized);

      const structureForked = templateSignature
        ? !(structureSignature === templateSignature && !processesCustomized)
        : true;

      await db
        .update(schema.estimates)
        .set({
          structureSignature,
          structureForked,
          processesCustomized,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)));

      const [withState] = (await db
        .select()
        .from(schema.estimates)
        .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)))) as EstimateRow[];

      responseRow = withState ?? responseRow;

      // PHASE 5 AUDIT LOGGING: Detect and log state transitions
      if (responseRow) {
        const stateAfter: EstimateState = {
          id: responseRow.id,
          structureForked: responseRow.structureForked,
          processesCustomized: responseRow.processesCustomized,
          sourceTemplateKey: responseRow.sourceTemplateKey,
          structureSignature: responseRow.structureSignature,
        };

        const transition = detectStateTransition(stateBefore, stateAfter);
        if (transition !== 'none') {
          await logEstimateStateTransition(db, {
            tenantId,
            userId: user.userId,
            estimateId: id,
            action: transition,
            stateBefore: buildStateSnapshot(stateBefore),
            stateAfter: buildStateSnapshot(stateAfter),
            signature: responseRow.structureSignature,
          });
        }
      }
    }

    // Quote status sync: all estimates non-draft → quote saved (never auto-sent).
    const quoteIdForSync = responseRow?.quoteId ?? existing.quoteId;
    if (quoteIdForSync) {
      if (data.deliveryTerm !== undefined) {
        await maybeCopyDeliveryTermToQuote(
          db,
          tenantId,
          quoteIdForSync,
          data.deliveryTerm
        );
      }
      const [quoteBefore] = await db
        .select({
          status: schema.quotes.status,
          sentAt: schema.quotes.sentAt,
          validUntil: schema.quotes.validUntil,
        })
        .from(schema.quotes)
        .where(eq(schema.quotes.id, quoteIdForSync));
      const synced = await syncQuoteStatusFromEstimates(db, quoteIdForSync, tenantId);
      if (synced && quoteBefore && synced.status !== quoteBefore.status) {
        await logQuoteStatusTransition(db, {
          tenantId,
          userId: user.userId,
          quoteId: quoteIdForSync,
          before: quoteBefore,
          after: {
            status: synced.status,
            sentAt: synced.sentAt,
            validUntil: synced.validUntil,
          },
        });
      }
    }

    reply.header('Cache-Control', 'no-store');
    return reply.send(responseRow ?? updated);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    if (isAuthError(error) || error instanceof AppError) {
      return sendCaughtError(reply, error, 'Failed to update estimate', 'Update estimate error:');
    }
    if (isFkViolation(error)) {
      return reply.status(409).send({
        error:
          'A layer material or solvent is no longer in your library. Re-select materials and save again.',
      });
    }
    request.log.error({ err: error }, 'Update estimate error');
    return reply.status(500).send({
      error: 'Failed to update estimate',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

// Delete estimate
async function deleteEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    const [existing] = await db
      .select({ id: schema.estimates.id, quoteId: schema.estimates.quoteId })
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      );
    if (!existing) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }
    const lockErr = await quoteLockError(db, tenantId, existing.quoteId);
    if (lockErr) return reply.status(409).send(lockErr);

    const [deleted] = (await db
      .update(schema.estimates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId)
        )
      )
      .returning()) as EstimateRow[];

    if (!deleted) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    return reply.status(204).send();
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to delete estimate', 'Delete estimate error:');
  }
}

// Re-quote: new single-estimate quote with fresh library prices (D2).
async function requoteEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof RequoteBodySchema>;
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const body = RequoteBodySchema.safeParse(request.body ?? {}).data;
    const db = getDatabase();

    const [source] = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      );

    if (!source) {
      return reply.status(404).send({ error: 'Source estimate not found' });
    }

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    const displayCurrency = tenant?.displayCurrency || source.displayCurrency;
    const exchangeRateUsdToDisplay = String(
      tenant?.exchangeRateUsdToDisplay || source.exchangeRateUsdToDisplay
    );

    const defaultLabel = source.skuLabel?.trim() || source.jobName?.trim() || 'Variant';
    const quoteName = body?.quoteName?.trim() || defaultLabel;
    const skuLabel = body?.skuLabel?.trim() || defaultLabel;
    const variantDescription = body?.variantDescription?.trim() || null;

    const parentQuote = await loadQuoteForEstimate(db, tenantId, source.quoteId);
    const inherited = inheritedQuoteFieldsFromParent(parentQuote, source);
    const linkedCustomerId = inherited.isPriceCheck
      ? null
      : inherited.customerId ?? source.customerId;

    const quote = await createQuote(db, {
      tenantId,
      ...inherited,
      customerId: linkedCustomerId,
      name: quoteName,
      notes: variantDescription,
      displayCurrency,
      exchangeRateUsdToDisplay,
      status: 'draft',
      defaultPrintColorCount: source.printColorCount,
      defaultCostPerColor: source.costPerColor,
      defaultToolingBillingMode: source.toolingBillingMode as
        | 'amortized'
        | 'separate'
        | 'not_billed'
        | null,
    });

    const { estimate: newEstimate, sourceLayers } = await cloneEstimate(db, id, {
      tenantId,
      quoteId: quote.id,
      customerId: linkedCustomerId,
      jobName: skuLabel,
      skuLabel,
      notes: variantDescription,
      brand: source.brand,
      specsCode: source.specsCode,
      printColorCount: source.printColorCount,
      costPerColor: source.costPerColor,
      toolingBillingMode: source.toolingBillingMode,
      toolingScenario: 'existing',
      billableColorCount: 0,
      sortOrder: 0,
      sourceEstimationId: id,
      refreshMaterialPrices: true,
      displayCurrency,
      exchangeRateUsdToDisplay,
    });

    const tenantMaterials = await loadTenantMaterialsForEstimate(
      tenantId,
      sourceLayers.map((layer: LayerRow) => layer.materialId)
    );
    const materialMap = new Map<string, MaterialRow>(
      tenantMaterials.map((m: MaterialRow) => [m.id, m])
    );

    const priceChanges = sourceLayers.map((layer: LayerRow) => {
      const mat = materialMap.get(layer.materialId);
      const newCostUsd = mat ? parseFloat(mat.costPerKgUsd) : 0;
      const snapshotCost = layer.unit_cost_snapshot_usd
        ? parseFloat(layer.unit_cost_snapshot_usd)
        : null;
      const oldCostPerSqM = Number(layer.costPerM2 || 0);
      const micron = parseFloat(layer.micron);
      const density = mat ? parseFloat(mat.density) : 1;
      const gsm = micron * density;
      const oldCostUsd =
        snapshotCost ??
        (gsm > 0 && oldCostPerSqM > 0 ? (oldCostPerSqM / gsm) * 1000 : newCostUsd);
      const deltaPct = oldCostUsd > 0 ? ((newCostUsd - oldCostUsd) / oldCostUsd) * 100 : 0;
      return {
        materialId: layer.materialId,
        materialName: layer.materialName || mat?.name || 'Unknown',
        materialStale: !mat,
        oldCostUsd,
        newCostUsd,
        deltaPct: Math.round(deltaPct * 100) / 100,
      };
    });

    const warnings = priceChanges
      .filter((pc: { materialStale?: boolean }) => pc.materialStale)
      .map(
        (pc: { materialName: string }) =>
          `Material "${pc.materialName}" is no longer in the library — cost set to 0.`
      );

    let calcResult;
    try {
      calcResult = await calculateAndPersistEstimate(db, newEstimate.id, tenantId);
    } catch (calcErr) {
      request.log.warn({ err: calcErr }, 'Requote auto-calculate failed');
    }

    const [refreshed] = await db
      .select()
      .from(schema.estimates)
      .where(eq(schema.estimates.id, newEstimate.id));

    return reply.status(201).send({
      ...refreshed,
      quoteId: quote.id,
      quoteRefNumber: quote.refNumber,
      price_changes: priceChanges,
      warnings,
      calculated: calcResult
        ? {
            salePricePerKg: calcResult.estimate.salePricePerKg,
            materialCostPerKg: calcResult.estimate.materialCostPerKg,
            totalGsm: calcResult.estimate.totalGsm,
          }
        : undefined,
    });
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to requote estimate', 'Requote estimate error:');
  }
}

// Legacy standalone duplicate — new one-estimate quote, frozen RM snapshots (PRD §9.6).
// Same-quote SKU copy: POST /quotes/:id/estimates/:estimateId/duplicate
async function duplicateEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    const [source] = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      );

    if (!source) {
      return reply.status(404).send({ error: 'Source estimate not found' });
    }

    const parentQuote = await loadQuoteForEstimate(db, tenantId, source.quoteId);
    const inherited = inheritedQuoteFieldsFromParent(parentQuote, source);
    const linkedCustomerId = inherited.isPriceCheck
      ? null
      : inherited.customerId ?? source.customerId;

    const quote = await createQuote(db, {
      tenantId,
      ...inherited,
      customerId: linkedCustomerId,
      name: `${source.jobName} (Copy)`,
      displayCurrency: source.displayCurrency,
      exchangeRateUsdToDisplay: source.exchangeRateUsdToDisplay,
      status: 'draft',
      defaultPrintColorCount: source.printColorCount,
      defaultCostPerColor: source.costPerColor,
      defaultToolingBillingMode: source.toolingBillingMode as
        | 'amortized'
        | 'separate'
        | 'not_billed'
        | null,
    });

    const { estimate: newEstimate } = await cloneEstimate(db, id, {
      tenantId,
      quoteId: quote.id,
      customerId: linkedCustomerId,
      jobName: `${source.jobName} (Copy)`,
      skuLabel: source.skuLabel ?? source.jobName,
      brand: source.brand,
      specsCode: source.specsCode,
      printColorCount: source.printColorCount,
      costPerColor: source.costPerColor,
      toolingBillingMode: source.toolingBillingMode,
      sortOrder: 0,
      copiedFromEstimateId: id,
      refreshMaterialPrices: false,
      displayCurrency: source.displayCurrency,
      exchangeRateUsdToDisplay: String(source.exchangeRateUsdToDisplay),
      copyCalculatedTotals: true,
    });

    return reply.status(201).send(newEstimate);
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to duplicate estimate', 'Duplicate estimate error:');
  }
}

/** Customer folder cards for Estimates page. */
async function estimatesByCustomerRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Querystring: { q?: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const q = (request.query.q || '').trim();
    const searchPattern = q ? '%' + q.replace(/[\\%_]/g, (ch) => `\\${ch}`) + '%' : null;

    const searchSql = searchPattern
      ? sql`AND (
          c.company_name ILIKE ${searchPattern}
          OR q.name ILIKE ${searchPattern}
          OR q.ref_number ILIKE ${searchPattern}
          OR e.sku_label ILIKE ${searchPattern}
          OR e.brand ILIKE ${searchPattern}
          OR e.ref_number ILIKE ${searchPattern}
        )`
      : sql``;

    const customerRows = await db.execute(sql`
      SELECT
        q.customer_id::text AS "customerId",
        COALESCE(c.company_name, '(No customer)') AS "companyName",
        COUNT(DISTINCT q.id)::int AS "quoteCount",
        COUNT(DISTINCT e.id)::int AS "estimateCount",
        MAX(GREATEST(q.updated_at, COALESCE(e.updated_at, q.updated_at))) AS "lastActivityAt",
        COUNT(DISTINCT CASE
          WHEN q.status = 'draft' OR e.status = 'draft' THEN q.id
          ELSE NULL
        END)::int AS "draftQuoteCount"
      FROM quotes q
      LEFT JOIN customers c
        ON c.id = q.customer_id AND c.tenant_id = q.tenant_id
      LEFT JOIN estimates e
        ON e.quote_id = q.id
        AND e.tenant_id = q.tenant_id
        AND e.deleted_at IS NULL
      WHERE q.tenant_id = ${tenantId}
        AND q.deleted_at IS NULL
        AND q.customer_id IS NOT NULL
        AND q.is_price_check = false
        ${searchSql}
      GROUP BY q.customer_id, c.company_name
    `);

    const priceCheckRows = await db.execute(sql`
      SELECT
        'price-check' AS "customerId",
        'Price checks' AS "companyName",
        COUNT(DISTINCT q.id)::int AS "quoteCount",
        COUNT(DISTINCT e.id)::int AS "estimateCount",
        MAX(GREATEST(q.updated_at, COALESCE(e.updated_at, q.updated_at))) AS "lastActivityAt",
        COUNT(DISTINCT CASE
          WHEN q.status = 'draft' OR e.status = 'draft' THEN q.id
          ELSE NULL
        END)::int AS "draftQuoteCount"
      FROM quotes q
      INNER JOIN estimates e
        ON e.quote_id = q.id
        AND e.tenant_id = q.tenant_id
        AND e.deleted_at IS NULL
      WHERE q.tenant_id = ${tenantId}
        AND q.deleted_at IS NULL
        AND q.is_price_check = true
        AND q.customer_id IS NULL
        ${searchSql}
    `);

    const noCustomerRows = await db.execute(sql`
      SELECT
        NULL::text AS "customerId",
        '(No customer)' AS "companyName",
        COUNT(DISTINCT q.id)::int AS "quoteCount",
        COUNT(DISTINCT e.id)::int AS "estimateCount",
        MAX(GREATEST(q.updated_at, COALESCE(e.updated_at, q.updated_at))) AS "lastActivityAt",
        COUNT(DISTINCT CASE
          WHEN q.status = 'draft' OR e.status = 'draft' THEN q.id
          ELSE NULL
        END)::int AS "draftQuoteCount"
      FROM quotes q
      LEFT JOIN estimates e
        ON e.quote_id = q.id
        AND e.tenant_id = q.tenant_id
        AND e.deleted_at IS NULL
      WHERE q.tenant_id = ${tenantId}
        AND q.deleted_at IS NULL
        AND q.customer_id IS NULL
        AND q.is_price_check = false
        ${searchSql}
    `);

    const extract = (rows: unknown) =>
      Array.isArray((rows as { rows?: unknown[] })?.rows)
        ? (rows as { rows: unknown[] }).rows
        : (rows as unknown as unknown[]);

    type FolderRow = {
      customerId: string | null;
      companyName: string;
      quoteCount: number;
      estimateCount: number;
      lastActivityAt: string | null;
      draftQuoteCount: number;
    };

    const merged: FolderRow[] = [
      ...(extract(customerRows) as FolderRow[]),
      ...(extract(priceCheckRows) as FolderRow[]).filter((r) => Number(r.quoteCount) > 0),
      ...(extract(noCustomerRows) as FolderRow[]).filter((r) => Number(r.quoteCount) > 0),
    ];

    merged.sort((a, b) => {
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return tb - ta;
    });

    return reply.send(merged);
  } catch (error: unknown) {
    return sendCaughtError(
      reply,
      error,
      'Failed to load customer folders',
      'Estimates by customer error:'
    );
  }
}

export async function registerEstimateRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: { limit?: string; offset?: string; sourceTemplateKey?: string; status?: string };
  }>(
    '/api/v1/estimates',
    async (request, reply) => getEstimatesRoute(fastify, request, reply)
  );

  // Must register before /:id so "by-customer" is not captured as an id.
  fastify.get<{ Querystring: { q?: string } }>(
    '/api/v1/estimates/by-customer',
    async (request, reply) => estimatesByCustomerRoute(fastify, request, reply)
  );

  fastify.post<{ Body: z.infer<typeof EstimateCreateSchema> }>(
    '/api/v1/estimates',
    async (request, reply) => createEstimateRoute(fastify, request, reply)
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/estimates/:id',
    async (request, reply) => getEstimateRoute(fastify, request, reply)
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<z.infer<typeof EstimateCreateSchema>> }>(
    '/api/v1/estimates/:id',
    async (request, reply) => updateEstimateRoute(fastify, request, reply)
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/estimates/:id',
    async (request, reply) => deleteEstimateRoute(fastify, request, reply)
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/calculate',
    async (request, reply) => calculateEstimateRoute(fastify, request, reply)
  );

  fastify.post<{ Params: { id: string }; Body: z.infer<typeof RequoteBodySchema> }>(
    '/api/v1/estimates/:id/requote',
    async (request, reply) => requoteEstimateRoute(fastify, request, reply)
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/duplicate',
    async (request, reply) => duplicateEstimateRoute(fastify, request, reply)
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/proposal-pdf',
    async (request, reply) => generateProposalPdfRoute(fastify, request, reply)
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/proposals',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const tenantId = extractTenantFromRequest(request);
        const { id } = request.params;
        const db = getDatabase();

        const rows = await db
          .select()
          .from(schema.proposals)
          .where(and(eq(schema.proposals.estimateId, id), eq(schema.proposals.tenantId, tenantId)))
          .orderBy(desc(schema.proposals.sentAt));

        return reply.send(rows);
      } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to list proposals', 'List proposals error:');
  }
    }
  );

  fastify.get<{ Params: { proposalId: string } }>(
    '/api/v1/proposals/:proposalId/pdf',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const tenantId = extractTenantFromRequest(request);
        const { proposalId } = request.params;
        const db = getDatabase();

        const [proposal] = await db
          .select()
          .from(schema.proposals)
          .where(and(eq(schema.proposals.id, proposalId), eq(schema.proposals.tenantId, tenantId)));

        if (!proposal) {
          return reply.status(404).send({ error: 'Proposal not found' });
        }

        if (proposal.pdfPath) {
          try {
            const { readStoredProposalPdf } = await import('../services/proposal-pdf');
            const buffer = readStoredProposalPdf(proposal.pdfPath);
            if (buffer) {
              reply.header('Content-Type', 'application/pdf');
              return reply.send(buffer);
            }
          } catch (readErr) {
            request.log.warn({ err: readErr, proposalId }, 'Stored proposal PDF unreadable; regenerating');
          }
        }

        const { buildProposalPdfBuffer } = await import('../services/proposal-pdf');
        const user = extractUserFromRequest(request);
        const buffer = await buildProposalPdfBuffer(db, proposal.estimateId, tenantId, user.userId);
        reply.header('Content-Type', 'application/pdf');
        return reply.send(buffer);
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Estimate not found') {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof Error && error.message.includes('not available')) {
          return reply.status(403).send({ error: error.message });
        }
    return sendCaughtError(reply, error, 'Failed to get proposal PDF', 'Get proposal PDF error:');
  }
    }
  );
}
