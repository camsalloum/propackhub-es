import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import type { Database } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, and, desc, sql, isNull, asc, count as drizzleCount } from 'drizzle-orm';
import { type VisibilityProfile, derivePrintingWebClass } from '@es/engine';
import { getEffectiveProfile, stripEstimateRow, stripCalculationResult } from '../utils/visibility';
import { calculateAndPersistEstimate, buildEngineMaterialMap, type MaterialRow } from '../services/estimate-calculation';
import { getMasterDataVersion } from '../db/platform-master-data';
import { buildLayerInsertValues, toMaterialLineageSource } from '../utils/layer-lineage';
import {
  buildEstimateClassificationSnapshot,
  mergeEstimateDimensionsClassification,
  stripConfigureFromTemplateFlag,
} from '../utils/estimate-classification';
import { parsePagination, paginate } from '../utils/pagination';

type EstimateRow = typeof schema.estimates.$inferSelect;
type LayerRow = typeof schema.layers.$inferSelect;

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
    speedBasis: z.enum(['kg_per_hour', 'm_per_min', 'pcs_per_min']),
    speedValue: z.coerce.number(),
    setupHours: z.coerce.number().default(0),
    enabled: z.boolean().default(true),
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
  toolingChargeUsd: z.coerce.number().nonnegative().optional(),
  toolingBilledToCustomer: z.boolean().optional(),
  deliveryTerm: z.string().max(32).optional(),
  deliveryChargeUsd: z.coerce.number().nonnegative().optional(),
  wasteBands: z.array(z.object({
    minKg: z.coerce.number().nonnegative(),
    maxKg: z.coerce.number().nonnegative().nullable(),
    wastePercent: z.coerce.number().min(0).max(100),
  })).optional(),
  solventMaterialId: z.string().uuid().optional(),
  solventCostPerKgUsd: z.coerce.number().nonnegative().optional(),
  solventRatio: z.coerce.number().positive().optional(),
  laminationRecipeOverrides: z.record(z.string(), LaminationRecipeSchema).optional(),
  cleaningSolventKgPerJob: z.coerce.number().nonnegative().optional(),
  inkPrintingProcess: z.enum(['flexo', 'rotogravure']).optional().nullable(),
  status: z.enum(['draft', 'sent', 'won', 'lost']).optional(),
  notes: z.string().optional(),
  note: z.string().optional(), // used in activity log
});

/** PATCH accepts any subset of the create fields. */
const EstimateUpdateSchema = EstimateCreateSchema.partial();

export async function generateRefNumber(db: Database, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  // BUG-11: retry loop guards against race conditions where two concurrent
  // requests grab the same COUNT and try to insert the same ref number.
  // The UNIQUE index on (tenant_id, ref_number) catches the collision;
  // we re-count and try the next slot (up to 5 attempts).
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await db
      .select({ count: sql`COUNT(*)` })
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt),
          sql`EXTRACT(YEAR FROM ${schema.estimates.createdAt}) = ${year}`
        )
      );

    const count = Number(result[0]?.count ?? 0);
    // On retry add the attempt offset so we skip already-taken slots
    const candidate = `QT-${year}-${String(count + 1 + attempt).padStart(5, '0')}`;

    // Check whether this ref already exists (avoids relying solely on insert-catch)
    const clash = await db
      .select({ id: schema.estimates.id })
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.tenantId, tenantId),
          eq(schema.estimates.refNumber, candidate)
        )
      )
      .limit(1);

    if (clash.length === 0) return candidate;
    // Clash found — loop and try count+2, count+3 …
  }
  // Fallback: timestamp-based ref (should never reach here in practice)
  return `QT-${year}-${Date.now().toString().slice(-5)}`;
}

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
    const e = error as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 401 || e.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      throw error;
    }
    console.error('Get estimates error:', error);
    return reply.status(500).send({ error: 'Failed to fetch estimates' });
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

    const tenantMaterials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialMap = buildEngineMaterialMap(tenantMaterials);
    const printingWebClass = derivePrintingWebClass(
      data.layers.map((l) => ({ materialId: l.materialId })),
      materialMap
    );

    const masterDataVersion = await getMasterDataVersion();
    const materialById = new Map<string, MaterialRow>(
      tenantMaterials.map((m: MaterialRow) => [m.id, m])
    );

    // Create estimate
    const [estimate] = (await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId: data.customerId,
        refNumber,
        jobName: data.jobName,
        productType: data.productType,
        productSubtype: data.productSubtype,
        printingWebClass,
        dimensions: data.dimensions,
        markupPercent: data.markupPercent.toString(),
        platesPerKg: data.platesPerKg.toString(),
        deliveryPerKg: data.deliveryPerKg.toString(),
        displayCurrency: tenant.displayCurrency,
        exchangeRateUsdToDisplay: tenant.exchangeRateUsdToDisplay.toString(),
        status: data.status ?? 'draft',
        notes: data.notes ?? undefined,
        masterDataVersion,
        orderQuantityKg: data.orderQuantityKg != null ? String(data.orderQuantityKg) : undefined,
        orderQuantityUnit: data.orderQuantityUnit ?? 'kgs',
        sourceTemplateKey: data.sourceTemplateKey ?? undefined,
        pricingMethod: data.pricingMethod ?? undefined,
        marginValuePerKgUsd: data.marginValuePerKgUsd != null ? String(data.marginValuePerKgUsd) : undefined,
        toolingChargeUsd: data.toolingChargeUsd != null ? String(data.toolingChargeUsd) : undefined,
        toolingBilledToCustomer: data.toolingBilledToCustomer ?? false,
        deliveryTerm: data.deliveryTerm ?? undefined,
        deliveryChargeUsd: data.deliveryChargeUsd != null ? String(data.deliveryChargeUsd) : undefined,
        wasteBands: data.wasteBands ?? undefined,
        solventMaterialId: data.solventMaterialId,
        solventCostPerKgUsd: data.solventCostPerKgUsd != null ? String(data.solventCostPerKgUsd) : undefined,
        solventRatio: data.solventRatio != null ? String(data.solventRatio) : undefined,
        laminationRecipeOverrides: data.laminationRecipeOverrides ?? undefined,
        cleaningSolventKgPerJob:
          data.cleaningSolventKgPerJob != null ? String(data.cleaningSolventKgPerJob) : undefined,
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
      await db
        .insert(schema.processes)
        .values({
          estimateId: estimate.id,
          name: process.name,
          costPerHour: process.costPerHour.toString(),
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

    return reply.status(201).send({
      ...estimate,
      refNumber: estimate.refNumber,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create estimate error:', error);
    return reply.status(500).send({ error: 'Failed to create estimate' });
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
    console.error('Calculate estimate error:', error);
    return reply.status(500).send({ error: 'Failed to calculate estimate' });
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
    console.error('Generate proposal PDF error:', error);
    return reply.status(500).send({ error: 'Failed to generate proposal PDF' });
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

    // Get processes
    const processes = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, id));

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

    // Enrich layers with material details
    const allMaterials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialMap = new Map<string, MaterialRow>(allMaterials.map((m: MaterialRow) => [m.id, m]));
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
      processes: profile.operationCost ? processes : [],
      slabs: profile.slabTable ? slabs : [],
      activityLogs: logs || [],
      lastCalculatedAt: estimate.lastCalculatedAt,
    });
  } catch (error: any) {
    console.error('Get estimate error:', error);
    return reply.status(500).send({ error: 'Failed to get estimate' });
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
            console.warn('Failed to persist proposal PDF:', pdfErr);
          }
        } catch (propErr) {
          console.warn('Failed to create proposal record:', propErr);
        }
      }
    }
    if (data.productType !== undefined) updates.productType = data.productType;
    if (data.productSubtype !== undefined) updates.productSubtype = data.productSubtype;
    if (data.markupPercent !== undefined) updates.markupPercent = data.markupPercent.toString();
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
    if (data.inkPrintingProcess !== undefined) {
      updates.inkPrintingProcess = data.inkPrintingProcess;
    }
    if (data.pricingMethod !== undefined) updates.pricingMethod = data.pricingMethod;
    if (data.marginValuePerKgUsd !== undefined) {
      updates.marginValuePerKgUsd = String(data.marginValuePerKgUsd);
    }
    if (data.toolingChargeUsd !== undefined) {
      updates.toolingChargeUsd = String(data.toolingChargeUsd);
    }
    if (data.toolingBilledToCustomer !== undefined) {
      updates.toolingBilledToCustomer = data.toolingBilledToCustomer;
    }
    if (data.deliveryTerm !== undefined) {
      updates.deliveryTerm = data.deliveryTerm || null;
    }
    if (data.deliveryChargeUsd !== undefined) {
      updates.deliveryChargeUsd = String(data.deliveryChargeUsd);
    }
    if (data.wasteBands !== undefined) {
      updates.wasteBands = data.wasteBands;
    }
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
        const tenantMaterials = await tx
          .select()
          .from(schema.materials)
          .where(eq(schema.materials.tenantId, tenantId));
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
          await tx.insert(schema.processes).values({
            estimateId: id,
            name: process.name,
            costPerHour: process.costPerHour.toString(),
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
        console.warn('Failed to write activity log:', logErr);
      }
    }

    // BUG-3: re-select the final row after all updates (second update may change
    // printingWebClass, masterDataVersion, dimensions — returning() from the first
    // update would give the client stale data).
    const [finalRow] = (await db
      .select()
      .from(schema.estimates)
      .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)))) as EstimateRow[];

    reply.header('Cache-Control', 'no-store');
    return reply.send(finalRow ?? updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update estimate error:', error?.stack || error);
    return reply.status(500).send({
      error: 'Failed to update estimate',
      detail: error?.message ?? String(error),
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
  } catch (error: any) {
    console.error('Delete estimate error:', error);
    return reply.status(500).send({ error: 'Failed to delete estimate' });
  }
}

// Re-quote estimate (create new estimate from existing, refresh material prices)
async function requoteEstimateRoute(
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

    // Get source estimate (BUG-5: honor soft-delete)
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

    // Get tenant's current currency settings (PRD §7.5: re-quote uses current, not frozen)
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    // Get layers with current material prices
    const sourceLayers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, id))
      .orderBy(schema.layers.position);

    // Generate new ref number via shared helper (BUG-11: excludes soft-deleted)
    const newRefNumber = await generateRefNumber(db, tenantId);

    const tenantMaterials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialById = new Map<string, MaterialRow>(
      tenantMaterials.map((m: MaterialRow) => [m.id, m])
    );
    const masterDataVersion = await getMasterDataVersion();

    // Create new estimate
    const [newEstimate] = (await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId: source.customerId,
        refNumber: newRefNumber,
        jobName: `${source.jobName} (Re-quote)`,
        status: 'draft',
        productType: source.productType,
        printingWebClass: source.printingWebClass,
        dimensions: source.dimensions,
        markupPercent: source.markupPercent,
        platesPerKg: source.platesPerKg,
        deliveryPerKg: source.deliveryPerKg,
        // PRD §7.5: re-quote always uses current tenant currency/rate, not frozen source rate
        displayCurrency: tenant?.displayCurrency || source.displayCurrency,
        exchangeRateUsdToDisplay: tenant?.exchangeRateUsdToDisplay || source.exchangeRateUsdToDisplay,
        solventMaterialId: source.solventMaterialId,
        solventCostPerKgUsd: source.solventCostPerKgUsd,
        solventRatio: source.solventRatio,
        laminationRecipeOverrides: source.laminationRecipeOverrides,
        cleaningSolventKgPerJob: source.cleaningSolventKgPerJob,
        inkPrintingProcess: source.inkPrintingProcess,
        orderQuantityKg: source.orderQuantityKg,
        sourceEstimationId: id,
        masterDataVersion,
        sourceTemplateKey: source.sourceTemplateKey,
      })
      .returning()) as EstimateRow[];

    // Copy layers (fresh lineage snapshots from current tenant materials)
    for (const layer of sourceLayers) {
      const mat = materialById.get(layer.materialId);
      await db.insert(schema.layers).values(
        buildLayerInsertValues({
          estimateId: newEstimate.id,
          materialId: layer.materialId,
          micron: layer.micron,
          position: layer.position,
          material: mat ? toMaterialLineageSource(mat) : null,
        })
      );
    }

    // Copy processes
    const sourceProcesses = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, id));

    for (const process of sourceProcesses) {
      await db.insert(schema.processes).values({
        estimateId: newEstimate.id,
        name: process.name,
        costPerHour: process.costPerHour,
        speedBasis: process.speedBasis,
        speedValue: process.speedValue,
        setupHours: process.setupHours,
        enabled: process.enabled,
      });
    }

    // Copy slabs
    const sourceSlabs = await db
      .select()
      .from(schema.slabs)
      .where(eq(schema.slabs.estimateId, id));

    for (const slab of sourceSlabs) {
      await db.insert(schema.slabs).values({
        estimateId: newEstimate.id,
        quantityKg: slab.quantityKg,
        pricePerKg: slab.pricePerKg,
      });
    }

    // Build price_changes: compare current material costs vs source
    const allMaterials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialMap = new Map<string, MaterialRow>(allMaterials.map((m: MaterialRow) => [m.id, m]));

    const priceChanges = sourceLayers.map((layer: LayerRow) => {
      const mat = materialMap.get(layer.materialId);
      const newCostUsd = mat ? parseFloat(mat.costPerKgUsd) : 0;
      const snapshotCost = layer.unit_cost_snapshot_usd ? parseFloat(layer.unit_cost_snapshot_usd) : null;
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
      .map((pc: { materialName: string }) => `Material "${pc.materialName}" is no longer in the library — cost set to 0.`);

    // E6: auto-calculate with refreshed library prices
    let calcResult;
    try {
      calcResult = await calculateAndPersistEstimate(db, newEstimate.id, tenantId);
    } catch (calcErr) {
      console.warn('Requote auto-calculate failed:', calcErr);
    }

    const [refreshed] = await db
      .select()
      .from(schema.estimates)
      .where(eq(schema.estimates.id, newEstimate.id));

    return reply.status(201).send({
      ...refreshed,
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
  } catch (error: any) {
    console.error('Requote estimate error:', error);
    return reply.status(500).send({ error: 'Failed to requote estimate' });
  }
}

// Duplicate estimate — frozen prices (PRD §9.6)
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
      .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId), isNull(schema.estimates.deletedAt)));

    if (!source) {
      return reply.status(404).send({ error: 'Source estimate not found' });
    }

    // Get tenant's current currency settings (frozen prices + current FX)
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    const sourceLayers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, id))
      .orderBy(schema.layers.position);

    const sourceProcesses = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, id));

    const sourceSlabs = await db
      .select()
      .from(schema.slabs)
      .where(eq(schema.slabs.estimateId, id))
      .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

    const newRefNumber = await generateRefNumber(db, tenantId);

    const tenantMaterials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialById = new Map<string, MaterialRow>(
      tenantMaterials.map((m: MaterialRow) => [m.id, m])
    );
    const masterDataVersion = await getMasterDataVersion();

    const [newEstimate] = (await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId: source.customerId,
        refNumber: newRefNumber,
        jobName: `${source.jobName} (Copy)`,
        status: 'draft',
        productType: source.productType,
        printingWebClass: source.printingWebClass,
        dimensions: source.dimensions,
        markupPercent: source.markupPercent,
        platesPerKg: source.platesPerKg,
        deliveryPerKg: source.deliveryPerKg,
        // Duplicate keeps frozen prices but uses current tenant currency/FX for display
        displayCurrency: tenant?.displayCurrency || source.displayCurrency,
        exchangeRateUsdToDisplay: tenant?.exchangeRateUsdToDisplay || source.exchangeRateUsdToDisplay,
        solventMaterialId: source.solventMaterialId,
        solventCostPerKgUsd: source.solventCostPerKgUsd,
        solventRatio: source.solventRatio,
        laminationRecipeOverrides: source.laminationRecipeOverrides,
        cleaningSolventKgPerJob: source.cleaningSolventKgPerJob,
        inkPrintingProcess: source.inkPrintingProcess,
        orderQuantityKg: source.orderQuantityKg,
        orderQuantityUnit: source.orderQuantityUnit,
        totalGsm: source.totalGsm,
        totalMicron: source.totalMicron,
        materialCostPerKg: source.materialCostPerKg,
        salePricePerKg: source.salePricePerKg,
        lastCalculatedAt: source.lastCalculatedAt,
        sourceEstimationId: id,
        masterDataVersion,
        sourceTemplateKey: source.sourceTemplateKey,
      })
      .returning()) as EstimateRow[];

    for (const layer of sourceLayers) {
      const mat = materialById.get(layer.materialId);
      await db.insert(schema.layers).values(
        buildLayerInsertValues({
          estimateId: newEstimate.id,
          materialId: layer.materialId,
          micron: layer.micron,
          position: layer.position,
          material: mat ? toMaterialLineageSource(mat) : null,
        })
      );
    }

    for (const process of sourceProcesses) {
      await db.insert(schema.processes).values({
        estimateId: newEstimate.id,
        name: process.name,
        costPerHour: process.costPerHour,
        speedBasis: process.speedBasis,
        speedValue: process.speedValue,
        setupHours: process.setupHours,
        enabled: process.enabled,
        runHours: process.runHours,
        totalCost: process.totalCost,
      });
    }

    for (let i = 0; i < sourceSlabs.length; i++) {
      const slab = sourceSlabs[i];
      await db.insert(schema.slabs).values({
        estimateId: newEstimate.id,
        quantityKg: slab.quantityKg,
        pricePerKg: slab.pricePerKg,
        sortOrder: slab.sortOrder ?? i,
      });
    }

    return reply.status(201).send(newEstimate);
  } catch (error: any) {
    console.error('Duplicate estimate error:', error);
    return reply.status(500).send({ error: 'Failed to duplicate estimate' });
  }
}

export async function registerEstimateRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: { limit?: string; offset?: string; sourceTemplateKey?: string; status?: string };
  }>(
    '/api/v1/estimates',
    async (request, reply) => getEstimatesRoute(fastify, request, reply)
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

  fastify.post<{ Params: { id: string } }>(
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
        console.error('List proposals error:', error);
        return reply.status(500).send({ error: 'Failed to list proposals' });
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
          const { readStoredProposalPdf } = await import('../services/proposal-pdf');
          const buffer = readStoredProposalPdf(proposal.pdfPath);
          if (buffer) {
            reply.header('Content-Type', 'application/pdf');
            return reply.send(buffer);
          }
        }

        const { buildProposalPdfBuffer } = await import('../services/proposal-pdf');
        const user = extractUserFromRequest(request);
        const buffer = await buildProposalPdfBuffer(db, proposal.estimateId, tenantId, user.userId);
        reply.header('Content-Type', 'application/pdf');
        return reply.send(buffer);
      } catch (error: unknown) {
        console.error('Get proposal PDF error:', error);
        return reply.status(500).send({ error: 'Failed to get proposal PDF' });
      }
    }
  );
}
