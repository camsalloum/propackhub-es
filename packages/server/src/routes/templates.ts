import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest, isTenantAdmin } from '../utils/auth';
import { eq, and, asc, desc } from 'drizzle-orm';
import { ensureTemplatesForTenant, relinkTemplatesForTenant, syncMissingStandardTemplates, pruneDuplicateStandardTemplates, syncTemplateKeysForTenant } from '../db/seed-templates';
import { quantitiesForSlabTemplateKey } from '../db/seed-slab-templates';
import { derivePrintingWebClass, stackNeedsSolventMix, resolveTemplateStoreClassification, tierToStructureType } from '@es/engine';
import { buildEngineMaterialMap, type MaterialRow } from '../services/estimate-calculation';
import { generateRefNumber } from './estimates';
import { getMasterDataVersion } from '../db/platform-master-data';

type EstimateRow = typeof schema.estimates.$inferSelect;
import { buildLayerInsertValues, toMaterialLineageSource } from '../utils/layer-lineage';
import { deriveSourceTemplateKey, deriveTenantTemplateKey } from '../utils/template-key';
import {
  buildEstimateClassificationSnapshot,
  mergeEstimateDimensionsClassification,
} from '../utils/estimate-classification';
import {
  buildTemplateMaterialLookup,
  buildValidMaterialIdSet,
  resolveLayerMaterialId,
  type TemplateLayerRef,
} from '../utils/template-material-lookup';

/** Seed missing standards, dedupe legacy rows, then assign stable keys. */
async function prepareTemplatesForTenant(tenantId: string): Promise<void> {
  // Each pass is wrapped so an isolated failure (e.g. a fresh dev DB where
  // platform_standard_templates doesn't exist yet) cannot 500 the list
  // endpoint. The list response is still useful with stale data; the failed
  // pass is logged so the cause is visible in the server console.
  const runPass = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err) {
      console.error(`[templates] ${label} failed for tenant ${tenantId}:`, err);
    }
  };

  await runPass('ensureTemplatesForTenant', () => ensureTemplatesForTenant(tenantId));
  await runPass('syncMissingStandardTemplates', () => syncMissingStandardTemplates(tenantId));
  await runPass('pruneDuplicateStandardTemplates', () => pruneDuplicateStandardTemplates(tenantId));
  await runPass('syncTemplateKeysForTenant', () => syncTemplateKeysForTenant(tenantId));
  await runPass('relinkTemplatesForTenant', () => relinkTemplatesForTenant(tenantId));
}

type TemplateRow = typeof schema.structureTemplates.$inferSelect;

/** Standard catalog rows — tenant / platform admin only. */
function canManageStandardTemplate(user: import('../utils/auth').TokenPayload): boolean {
  return isTenantAdmin(user.role);
}

/** Personal My Template — owner only (not other users or admins). */
function canDeleteMyTemplate(
  user: import('../utils/auth').TokenPayload,
  template: TemplateRow
): boolean {
  if (template.isStandard) return false;
  const ownerId = template.createdByUserId;
  if (!ownerId) return isTenantAdmin(user.role);
  return ownerId === user.userId;
}

function canEditMyTemplate(
  user: import('../utils/auth').TokenPayload,
  template: TemplateRow
): boolean {
  return canDeleteMyTemplate(user, template);
}

function canViewTemplate(
  user: import('../utils/auth').TokenPayload,
  template: TemplateRow
): boolean {
  if (template.isStandard) return true;
  const ownerId = template.createdByUserId;
  if (!ownerId) return true;
  return ownerId === user.userId || isTenantAdmin(user.role);
}

const TemplateLayerSchema = z.object({
  layer_order: z.number().int().positive(),
  layer_type: z.enum(['substrate', 'ink', 'adhesive']),
  ref_material_key: z.string().optional(),
  materialId: z.string().uuid().nullable().optional(),
  default_micron: z.number(),
  swappable_with: z.string().optional(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  // Engine costing type — always 'roll' | 'sleeve' | 'pouch'.
  // 'bag' is a UI family that maps to 'pouch' for costing; TemplateBuilder sends the engine type.
  productType: z.enum(['roll', 'sleeve', 'pouch']).optional(),
  // UI product subtype (e.g. 'bag_punch_handle', 'pouch_stand_up'); stored alongside productType.
  productSubtype: z.string().max(64).nullable().optional(),
  materialClass: z.string().nullable().optional(),
  structureType: z.string().nullable().optional(),
  /** Product-group margin over raw material, USD/kg (admin-defined). */
  marginOverRmPerKgUsd: z.coerce.number().nonnegative().nullable().optional(),
  /** Declared structure tier (Smart Template Builder — Task 3.3) */
  structureTier: z.enum(['Mono', 'Duplex', 'Triplex', 'Quadriplex']).optional(),
  /** Declared print mode stored in defaultDimensions (Task 3.3) */
  printMode: z.enum(['Plain', 'Printed']).optional(),
  displayOrder: z.number().int().optional(),
  defaultDimensions: z.record(z.any()).optional(),
  defaultLayers: z.array(TemplateLayerSchema).optional(),
  defaultProcesses: z
    .array(z.object({ process_key: z.string(), enabled: z.boolean() }))
    .optional(),
  defaultPrintingWebClass: z.enum(['wide_web', 'narrow_web']).optional(),
  solventMixEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/v1/templates
 * List structure templates for the current tenant.
 *
 * Visibility gate (Smart Template Builder — Task 3.2):
 *   Returns: platform standards ∪ tenant add-ons ∪ caller's own user add-ons.
 *   Never returns another user's private add-on (createdByUserId set to a different user).
 */
export async function getTemplatesRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Querystring: { standard_only?: string; template_key?: string; user_only?: string };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const userOnly = request.query.user_only === 'true';
    const standardOnly = !userOnly && request.query.standard_only !== 'false';
    const templateKeyFilter = request.query.template_key?.trim();

    await prepareTemplatesForTenant(tenantId);

    const conditions = [
      eq(schema.structureTemplates.tenantId, tenantId),
      eq(schema.structureTemplates.isActive, true),
    ];
    if (userOnly) {
      conditions.push(eq(schema.structureTemplates.isStandard, false));
      conditions.push(eq(schema.structureTemplates.createdByUserId, user.userId));
    } else if (standardOnly) {
      conditions.push(eq(schema.structureTemplates.isStandard, true));
    }
    if (templateKeyFilter) {
      conditions.push(eq(schema.structureTemplates.templateKey, templateKeyFilter));
    }

    let templates = await db
      .select()
      .from(schema.structureTemplates)
      .where(and(...conditions))
      .orderBy(
        userOnly
          ? desc(schema.structureTemplates.updatedAt)
          : schema.structureTemplates.displayOrder
      );

    // Visibility isolation when listing mixed (non-standard_only, non-user_only).
    if (!standardOnly && !userOnly) {
      templates = templates.filter((t: typeof templates[number]) => {
        if (t.isStandard) return true;
        const cbu = (t as { createdByUserId?: string | null }).createdByUserId;
        if (!cbu) return true; // tenant add-on
        return cbu === user.userId;
      });
    }

    return reply.send(templates);
  } catch (error: any) {
    console.error('Get templates error:', error);
    return reply.status(500).send({ error: 'Failed to fetch templates' });
  }
}

/**
 * GET /api/v1/templates/:id
 */
export async function getTemplateByIdRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    await relinkTemplatesForTenant(tenantId);

    const [template] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, id),
          eq(schema.structureTemplates.tenantId, tenantId)
        )
      );

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    if (!canViewTemplate(user, template)) {
      return reply.status(403).send({ error: 'Not allowed to view this template' });
    }

    return reply.send(template);
  } catch (error: any) {
    console.error('Get template error:', error);
    return reply.status(500).send({ error: 'Failed to fetch template' });
  }
}

/**
 * POST /api/v1/templates/instantiate — by templateKey or templateId (MES Phase D)
 */
export async function instantiateByKeyRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{
    Body: {
      templateKey?: string;
      templateId?: string;
      customerId?: string;
      jobName?: string;
      orderQuantityKg?: number;
      orderQuantityUnit?: string;
    };
  }>,
  reply: FastifyReply
) {
  const { templateKey, templateId, customerId, jobName, orderQuantityKg, orderQuantityUnit } =
    request.body || {};
  if (!templateKey && !templateId) {
    return reply.status(400).send({ error: 'templateKey or templateId required' });
  }

  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    let id = templateId;
    if (templateKey) {
      await prepareTemplatesForTenant(tenantId);
      const [row] = await db
        .select({ id: schema.structureTemplates.id })
        .from(schema.structureTemplates)
        .where(
          and(
            eq(schema.structureTemplates.tenantId, tenantId),
            eq(schema.structureTemplates.templateKey, templateKey),
            eq(schema.structureTemplates.isActive, true)
          )
        )
        .limit(1);
      if (!row) {
        return reply.status(404).send({ error: 'Template not found for key', templateKey });
      }
      id = row.id;
    }

    return instantiateTemplateRoute(
      fastify,
      {
        ...request,
        params: { id: id! },
        body: { customerId, jobName, orderQuantityKg, orderQuantityUnit },
      } as FastifyRequest<{
        Params: { id: string };
        Body: {
          customerId?: string;
          jobName?: string;
          orderQuantityKg?: number;
          orderQuantityUnit?: string;
        };
      }>,
      reply
    );
  } catch (error: unknown) {
    console.error('Instantiate by key error:', error);
    return reply.status(500).send({ error: 'Failed to instantiate template' });
  }
}

/**
 * POST /api/v1/templates/:id/instantiate
 */
export async function instantiateTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      customerId?: string;
      jobName?: string;
      orderQuantityKg?: number;
      orderQuantityUnit?: string;
      /** When true, resolve the template but DO NOT persist — return the data so the
       *  editor can open a new (unsaved) estimate. Nothing is written until the user saves. */
      preview?: boolean;
    };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const { customerId, jobName, orderQuantityKg, orderQuantityUnit, preview } = request.body || {};
    const db = getDatabase();

    await relinkTemplatesForTenant(tenantId);

    const [template] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, id),
          eq(schema.structureTemplates.tenantId, tenantId),
          eq(schema.structureTemplates.isActive, true)
        )
      );

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialLookup = buildTemplateMaterialLookup(materials);
    const validIds = buildValidMaterialIdSet(materials);

    const defaultLayers = (template.defaultLayers as TemplateLayerRef[]) || [];
    const unresolvedLayers: { layer_order?: number; ref_material_key?: string }[] = [];
    for (const layer of defaultLayers) {
      const materialId = resolveLayerMaterialId(layer, materialLookup, validIds);
      if (!materialId) {
        unresolvedLayers.push({
          layer_order: layer.layer_order,
          ref_material_key: layer.ref_material_key,
        });
      }
    }

    if (unresolvedLayers.length > 0) {
      return reply.status(409).send({
        error: 'Template has unresolved material layers',
        unresolvedLayers,
      });
    }

    // Shared helper: year-bucketed, soft-delete aware, collision-safe (BUG-11).
    const refNumber = await generateRefNumber(db, tenantId);

    const dimensions: Record<string, any> = {
      configureFromTemplate: true,
      templateClassification: {
        materialClass: template.materialClass,
        structureType: template.structureType,
      },
    };

    if (template.productType === 'roll' || template.productType === 'sleeve') {
      dimensions.reelWidthMm = 0;
      dimensions.cutoffMm = 0;
      dimensions.numberOfUps = 1;
      dimensions.extraPrintingTrimMm = 0;
      dimensions.piecesPerCut = 1;
    } else if (template.productType === 'pouch') {
      dimensions.openWidthMm = 0;
      dimensions.openHeightMm = 0;
    }

    const classificationSnapshot = buildEstimateClassificationSnapshot({
      jobName: jobName || template.name,
      productType: template.productType,
      materialClass: template.materialClass,
      layers: defaultLayers.map((layer) => ({ layer_type: layer.layer_type })),
    });
    Object.assign(
      dimensions,
      mergeEstimateDimensionsClassification(dimensions, classificationSnapshot)
    );

    const materialMap = buildEngineMaterialMap(materials);
    const resolvedLayerMaterialIds = defaultLayers.map(
      (layer) => resolveLayerMaterialId(layer, materialLookup, validIds)!
    );
    const printingWebClass = derivePrintingWebClass(
      resolvedLayerMaterialIds.map((materialId) => ({ materialId })),
      materialMap
    );

    const masterDataVersion = await getMasterDataVersion();
    const sourceTemplateKey =
      template.templateKey ??
      deriveSourceTemplateKey({
        name: template.name,
        pebiParentPg: template.pebiParentPg,
        materialClass: template.materialClass,
        structureType: template.structureType,
        isStandard: template.isStandard,
        templateKey: template.templateKey,
      });
    const materialById = new Map<string, MaterialRow>(
      materials.map((m: MaterialRow) => [m.id, m])
    );

    // Preview mode: return the resolved estimate + layers WITHOUT persisting. The
    // editor opens these as a new (unsaved) draft; nothing hits the DB until Save.
    if (preview) {
      const PREVIEW_MICRON_BY_TYPE: Record<string, number> = { substrate: 25, ink: 2, adhesive: 3 };
      const previewLayers = defaultLayers.map((layer, i) => {
        const materialId = resolveLayerMaterialId(layer, materialLookup, validIds)!;
        const mat = materialById.get(materialId);
        const micron =
          layer.default_micron && layer.default_micron > 0
            ? layer.default_micron
            : PREVIEW_MICRON_BY_TYPE[layer.layer_type ?? 'substrate'] ?? 10;
        return {
          materialId,
          materialName: mat?.name ?? '',
          materialType: mat?.type ?? layer.layer_type ?? 'substrate',
          micron,
          costPerKgUsd: mat ? Number(mat.costPerKgUsd) : 0,
          isSolventBased: Boolean(mat?.isSolventBased),
          hoover: mat?.hoover ?? null,
          position: i,
        };
      });
      const slabQtys = quantitiesForSlabTemplateKey(tenant.defaultSlabTemplate || 'standard');
      return reply.send({
        preview: true,
        estimate: {
          jobName: jobName || template.name,
          productType: template.productType,
          productSubtype: template.productSubtype ?? null,
          printingWebClass,
          dimensions,
          markupPercent: tenant.defaultMarkupPercent || '15.00',
          displayCurrency: tenant.displayCurrency,
          exchangeRateUsdToDisplay: tenant.exchangeRateUsdToDisplay,
          orderQuantityKg: orderQuantityKg != null ? String(orderQuantityKg) : null,
          orderQuantityUnit: orderQuantityUnit ?? 'kgs',
          sourceTemplateKey,
          masterDataVersion,
          // Product-group margin (USD/kg) — estimates default their margin/kg from it.
          marginValuePerKgUsd: template.marginOverRmPerKgUsd ?? null,
        },
        layers: previewLayers,
        slabs: slabQtys.map((q) => ({ quantityKg: q, pricePerKg: 0 })),
      });
    }

    const [estimate] = (await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId: customerId || null,
        refNumber,
        jobName: jobName || template.name,
        productType: template.productType,
        productSubtype: template.productSubtype ?? undefined,
        printingWebClass,
        dimensions,
        markupPercent: tenant.defaultMarkupPercent || '15.00',
        platesPerKg: '0',
        deliveryPerKg: '0',
        displayCurrency: tenant.displayCurrency,
        exchangeRateUsdToDisplay: tenant.exchangeRateUsdToDisplay,
        status: 'draft',
        masterDataVersion,
        sourceTemplateKey,
        orderQuantityKg: orderQuantityKg != null ? String(orderQuantityKg) : undefined,
        orderQuantityUnit: orderQuantityUnit ?? 'kgs',
      })
      .returning()) as EstimateRow[];

    // Use the seed's default_micron hint so estimates open with meaningful values.
    // Users can still change microns freely — these are just starting points.
    const DEFAULT_MICRON_BY_TYPE: Record<string, number> = {
      substrate: 25,
      ink: 2,
      adhesive: 3,
    };

    const defaultLayersResolved = (template.defaultLayers as TemplateLayerRef[]) || [];
    let layerPosition = 0;
    for (const layer of defaultLayersResolved) {
      const materialId = resolveLayerMaterialId(layer, materialLookup, validIds)!;
      const mat = materialById.get(materialId);
      // Prefer the seed's default_micron, fall back to type-based default
      const micronHint = (layer.default_micron && layer.default_micron > 0)
        ? layer.default_micron
        : (DEFAULT_MICRON_BY_TYPE[layer.layer_type ?? 'substrate'] ?? 10);
      await db.insert(schema.layers).values(
        buildLayerInsertValues({
          estimateId: estimate.id,
          materialId,
          micron: micronHint,
          position: layerPosition,
          material: mat ? toMaterialLineageSource(mat) : null,
        })
      );
      layerPosition++;
    }

    const defaultProcesses = (template.defaultProcesses as any[]) || [];
    // Load process cost/speed defaults from Master Data reference (not hardcoded)
    const masterRef = await import('../db/platform-master-data').then((m) => m.buildMasterDataReferenceFromDb());
    const processRefMap = new Map(
      (masterRef.processRows ?? []).map((p) => [p.code, p])
    );
    const fallbackDefaults = { costPerHour: 50, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 };

    for (const proc of defaultProcesses) {
      const ref = processRefMap.get(proc.process_key) ?? fallbackDefaults;
      await db.insert(schema.processes).values({
        estimateId: estimate.id,
        name: ref.label ?? (proc.process_key.charAt(0).toUpperCase() + proc.process_key.slice(1).replace(/_/g, ' ')),
        costPerHour: String(ref.costPerHour ?? fallbackDefaults.costPerHour),
        speedBasis: ref.speedBasis ?? fallbackDefaults.speedBasis,
        speedValue: String(ref.speedValue ?? fallbackDefaults.speedValue),
        setupHours: String(ref.setupHours ?? fallbackDefaults.setupHours),
        enabled: proc.enabled !== false,
      });
    }

    const slabQtys = quantitiesForSlabTemplateKey(tenant.defaultSlabTemplate || 'standard');
    for (let i = 0; i < slabQtys.length; i++) {
      await db.insert(schema.slabs).values({
        estimateId: estimate.id,
        quantityKg: slabQtys[i].toString(),
        pricePerKg: '0',
        sortOrder: i,
      });
    }

    return reply.status(201).send({
      id: estimate.id,
      refNumber: estimate.refNumber,
      jobName: estimate.jobName,
      productType: estimate.productType,
    });
  } catch (error: any) {
    console.error('Instantiate template error:', error?.stack || error);
    // Surface the underlying cause so a 500 here is diagnosable from the client
    // (network response) instead of being an opaque "Failed to instantiate".
    return reply.status(500).send({
      error: 'Failed to instantiate template',
      detail: error?.message ?? String(error),
    });
  }
}

// Discriminated union: fromEstimate (existing) | fromDefinition (new, no estimateId needed)
const CreateTemplateFromEstimateSchema = z.object({
  source: z.literal('fromEstimate').optional(), // backward compat: may be omitted
  name: z.string().min(1),
  estimateId: z.string().uuid(),
  /** Admin shortcut: forwarded to the platform-admin create route. */
  saveAsPlatformStandard: z.boolean().optional(),
});

const CreateTemplateFromDefinitionSchema = z.object({
  source: z.literal('fromDefinition'),
  name: z.string().min(1),
  productType: z.enum(['roll', 'sleeve', 'pouch']),
  productSubtype: z.string().max(64).nullable().optional(),
  materialClass: z.enum(['PE', 'Non PE']),
  structureTier: z.enum(['Mono', 'Duplex', 'Triplex', 'Quadriplex']),
  printMode: z.enum(['Plain', 'Printed']),
  defaultLayers: z.array(TemplateLayerSchema),
  defaultProcesses: z
    .array(z.object({ process_key: z.string(), enabled: z.boolean() }))
    .optional(),
  /** Admin shortcut: when true, delegates to POST /admin/platform-templates. */
  saveAsPlatformStandard: z.boolean().optional(),
  /** Optional: clone-from source id, only used when saveAsPlatformStandard is true. */
  cloneFromTemplateId: z.string().uuid().optional(),
});

const CreateTemplateSchema = z.discriminatedUnion('source', [
  CreateTemplateFromDefinitionSchema,
  // fromEstimate must come second so the discriminator default check works
]).or(CreateTemplateFromEstimateSchema);

/**
 * POST /api/v1/templates — create from estimate OR from a declared definition.
 *
 * Task 3.1: discriminated union { source: 'fromDefinition', ... } | { source: 'fromEstimate' | omitted, estimateId }
 * Task 3.1: ownership assignment per role.
 */
export async function createTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const body = request.body as any;

    // Admin shortcut: forward to the platform-templates create flow.
    // Only platform_admin may use this — non-admins get 403 here so they cannot
    // bypass the regular My Template path by setting the flag.
    if (body?.saveAsPlatformStandard === true) {
      if (user.role !== 'platform_admin') {
        request.log.warn(
          { userId: user.userId, role: user.role, route: request.url },
          'Non-platform_admin attempted saveAsPlatformStandard via /api/v1/templates'
        );
        return reply.status(403).send({ error: 'Platform admin role required for saveAsPlatformStandard' });
      }
      const { createPlatformTemplateRoute } = await import('./admin-platform-templates');
      // The admin route expects the same field shape we already have; we strip
      // the `source` discriminator since the admin schema doesn't use it.
      const adminBody = { ...body };
      delete adminBody.source;
      delete adminBody.saveAsPlatformStandard;
      // Re-wrap the request so the admin handler reads our normalized body.
      const adminRequest = new Proxy(request, {
        get(target, prop, receiver) {
          if (prop === 'body') return adminBody;
          return Reflect.get(target, prop, receiver);
        },
      }) as typeof request;
      return createPlatformTemplateRoute(_fastify, adminRequest as FastifyRequest<{ Body: unknown }>, reply);
    }

    // Route to the appropriate handler branch
    if (body?.source === 'fromDefinition') {
      return createTemplateFromDefinition(db, user, tenantId, body, reply);
    }
    // Default: fromEstimate (backward compat)
    return createTemplateFromEstimateHandler(db, user, tenantId, body, reply);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create template error:', error);
    return reply.status(500).send({ error: 'Failed to create template' });
  }
}

/** Original path — save an estimate as a My Template. */
async function createTemplateFromEstimateHandler(
  db: ReturnType<typeof getDatabase>,
  user: import('../utils/auth').TokenPayload,
  tenantId: string,
  body: unknown,
  reply: FastifyReply
) {
  const parsed = CreateTemplateFromEstimateSchema.parse(body);
  const { name, estimateId } = parsed;

  const [estimate] = await db
    .select()
    .from(schema.estimates)
    .where(and(eq(schema.estimates.id, estimateId), eq(schema.estimates.tenantId, tenantId)));

  if (!estimate) {
    return reply.status(404).send({ error: 'Estimate not found' });
  }

  const layers = await db
    .select({
      materialId: schema.layers.materialId,
      micron: schema.layers.micron,
      position: schema.layers.position,
      materialType: schema.materials.type,
      costingKey: schema.materials.costingKey,
    })
    .from(schema.layers)
    .leftJoin(schema.materials, eq(schema.layers.materialId, schema.materials.id))
    .where(eq(schema.layers.estimateId, estimateId))
    .orderBy(asc(schema.layers.position));

  const processes = await db
    .select()
    .from(schema.processes)
    .where(eq(schema.processes.estimateId, estimateId));

  const defaultLayers = layers.map((l: (typeof layers)[number], i: number) => ({
    layer_order: i + 1,
    layer_type: (l.materialType || 'substrate') as 'substrate' | 'ink' | 'adhesive',
    materialId: l.materialId,
    ref_material_key: l.costingKey || undefined,
    default_micron: parseFloat(l.micron),
  }));

  const defaultProcesses = processes.map((p: (typeof processes)[number]) => ({
    process_key: p.name.toLowerCase().replace(/\s+/g, '_'),
    enabled: p.enabled,
  }));

  const tenantMaterials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));
  const materialMap = buildEngineMaterialMap(tenantMaterials);
  const needsSolvent = stackNeedsSolventMix(
    layers.map((l: (typeof layers)[number]) => ({ materialId: l.materialId })),
    materialMap
  );

  const storedClassification = (
    (estimate.dimensions as Record<string, unknown> | null)?.templateClassification ?? null
  ) as { materialClass?: string; structureType?: string } | null;

  const { materialClass, structureType } = resolveTemplateStoreClassification(
    storedClassification,
    defaultLayers,
    tenantMaterials.map((m: (typeof tenantMaterials)[number]) => ({
      id: m.id,
      substrateFamily: m.substrateFamily,
    }))
  );

  // Save as Template is always a personal My Template for whoever clicked it.
  const { isStandard: ownIsStandard, createdByUserId } = resolveMyTemplateOwnership(user);

  const defaultDimensions: Record<string, unknown> = {
    ...(storedClassification ? { templateClassification: storedClassification } : {}),
    /** Links My Template back to the estimate it was saved from (resume on card click). */
    sourceEstimateId: estimateId,
  };

  const [template] = await db
    .insert(schema.structureTemplates)
    .values({
      tenantId,
      name,
      pebiParentPg: name,
      productType: estimate.productType,
      materialClass,
      structureType,
      displayOrder: 900,
      isStandard: ownIsStandard,
      createdByUserId,
      defaultDimensions,
      defaultLayers: defaultLayers,
      defaultProcesses,
      defaultPrintingWebClass: estimate.printingWebClass,
      solventMixEnabled: needsSolvent,
      isActive: true,
    })
    .returning();

  const templateKey = deriveTenantTemplateKey(name, template.id);
  const [withKey] = await db
    .update(schema.structureTemplates)
    .set({ templateKey, updatedAt: new Date() })
    .where(eq(schema.structureTemplates.id, template.id))
    .returning();

  // Point the source estimate at this structure so draft resume works by template_key.
  await db
    .update(schema.estimates)
    .set({ sourceTemplateKey: templateKey, updatedAt: new Date() })
    .where(and(eq(schema.estimates.id, estimateId), eq(schema.estimates.tenantId, tenantId)));

  return reply.status(201).send(withKey ?? { ...template, templateKey });
}

/** New path — create from a declared attribute definition (no estimate needed). */
async function createTemplateFromDefinition(
  db: ReturnType<typeof getDatabase>,
  user: import('../utils/auth').TokenPayload,
  tenantId: string,
  body: unknown,
  reply: FastifyReply
) {
  const parsed = CreateTemplateFromDefinitionSchema.parse(body);
  const {
    name,
    productType,
    productSubtype,
    materialClass,
    structureTier,
    printMode,
    defaultLayers: rawLayers,
    defaultProcesses,
  } = parsed;

  // ── Server-side validation (Task 3.1) ──────────────────────────────────────
  const { substrateFamilyAllowed, TIER_SUBSTRATE_COUNT, TIER_ADHESIVE_COUNT } =
    await import('@es/engine');

  const subCount = rawLayers.filter((l) => l.layer_type === 'substrate').length;
  const inkCount  = rawLayers.filter((l) => l.layer_type === 'ink').length;
  const adhCount  = rawLayers.filter((l) => l.layer_type === 'adhesive').length;

  const expectedSubs = TIER_SUBSTRATE_COUNT[structureTier];
  const expectedAdh  = TIER_ADHESIVE_COUNT[structureTier];

  if (subCount !== expectedSubs) {
    return reply.status(400).send({
      error: `Substrate count mismatch: tier ${structureTier} requires ${expectedSubs} substrates but got ${subCount}`,
    });
  }
  if (adhCount < expectedAdh) {
    return reply.status(400).send({
      error: `Adhesive count too low: tier ${structureTier} requires at least ${expectedAdh} adhesive(s) but got ${adhCount}`,
    });
  }
  if (printMode === 'Plain' && inkCount > 0) {
    return reply.status(400).send({
      error: 'Ink layers are not allowed when printMode is Plain',
    });
  }

  // Validate substrate families against engine rules
  const tenantMaterials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  const matById = new Map(tenantMaterials.map((m: (typeof tenantMaterials)[number]) => [m.id, m]));
  const structureType = tierToStructureType(structureTier);

  for (const layer of rawLayers.filter((l) => l.layer_type === 'substrate' && l.materialId)) {
    const mat = matById.get(layer.materialId!);
    if (!mat) continue;
    if (!substrateFamilyAllowed(mat.substrateFamily || '', { materialClass, structureType, productType })) {
      return reply.status(400).send({
        error: `Substrate material "${mat.name}" (family: ${mat.substrateFamily}) is not allowed for materialClass=${materialClass}`,
      });
    }
  }

  // ── Build layer records ───────────────────────────────────────────────────
  const defaultLayers = rawLayers.map((l, i) => ({
    layer_order: i + 1,
    layer_type: l.layer_type,
    materialId: l.materialId ?? null,
    ref_material_key: undefined as string | undefined,
    default_micron: 0,
  }));

  const materialMap = buildEngineMaterialMap(tenantMaterials);
  const needsSolvent = stackNeedsSolventMix(
    defaultLayers.map((l) => ({ materialId: l.materialId })),
    materialMap
  );

  const printingWebClass = derivePrintingWebClass(
    defaultLayers.map((l) => ({ materialId: l.materialId })),
    materialMap
  );

  // Resolve materialClass/structureType via engine
  const resolved = resolveTemplateStoreClassification(
    { materialClass, structureType },
    defaultLayers,
    tenantMaterials.map((m: (typeof tenantMaterials)[number]) => ({
      id: m.id,
      substrateFamily: m.substrateFamily,
    }))
  );

  // Persist printMode in defaultDimensions jsonb (Task 2.2 / design Option A)
  const defaultDimensions: Record<string, unknown> = { printMode };

  // My Templates builder — personal to the current user.
  const { isStandard: ownIsStandard, createdByUserId } = resolveMyTemplateOwnership(user);

  const [template] = await db
    .insert(schema.structureTemplates)
    .values({
      tenantId,
      name,
      pebiParentPg: name,
      productType,
      productSubtype: productSubtype ?? null,
      materialClass: resolved.materialClass,
      structureType: resolved.structureType,
      displayOrder: 900,
      isStandard: ownIsStandard,
      createdByUserId,
      defaultDimensions,
      defaultLayers,
      defaultProcesses: defaultProcesses || [],
      defaultPrintingWebClass: printingWebClass,
      solventMixEnabled: needsSolvent,
      isActive: true,
    })
    .returning();

  const templateKey = deriveTenantTemplateKey(name, template.id);
  const [withKey] = await db
    .update(schema.structureTemplates)
    .set({ templateKey, updatedAt: new Date() })
    .where(eq(schema.structureTemplates.id, template.id))
    .returning();

  return reply.status(201).send(withKey ?? { ...template, templateKey });
}

/**
 * Personal My Template — always owned by the current user (Save as Template / My Templates builder).
 */
function resolveMyTemplateOwnership(user: import('../utils/auth').TokenPayload): {
  isStandard: false;
  createdByUserId: string;
} {
  return { isStandard: false, createdByUserId: user.userId };
}

/**
 * Determine ownership tier from the JWT role (admin catalog / tenant add-on flows).
 * platform_admin → isStandard=true (adds to global catalog)
 * tenant_admin   → isStandard=false, createdByUserId=null (tenant add-on)
 * user           → isStandard=false, createdByUserId=<userId> (user add-on)
 */
function resolveOwnership(user: import('../utils/auth').TokenPayload): {
  isStandard: boolean;
  createdByUserId: string | null;
} {
  if (user.role === 'platform_admin') {
    return { isStandard: true, createdByUserId: null };
  }
  if (user.role === 'tenant_admin') {
    return { isStandard: false, createdByUserId: null };
  }
  return { isStandard: false, createdByUserId: user.userId };
}

/**
 * PATCH /api/v1/templates/:id — admin edits standard; any user edits own My Templates
 */
export async function updateTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdateTemplateSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const body = UpdateTemplateSchema.parse(request.body);
    const db = getDatabase();

    const [existing] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, id),
          eq(schema.structureTemplates.tenantId, tenantId)
        )
      );

    if (!existing) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    if (existing.isStandard && !isTenantAdmin(user.role)) {
      return reply.status(403).send({ error: 'Only admins can edit standard templates' });
    }
    if (!existing.isStandard && !canEditMyTemplate(user, existing)) {
      return reply.status(403).send({ error: 'Not allowed to edit this template' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.productType !== undefined) updates.productType = body.productType;
    if (body.productSubtype !== undefined) updates.productSubtype = body.productSubtype;
    if (body.materialClass !== undefined) updates.materialClass = body.materialClass;
    if (body.structureType !== undefined) updates.structureType = body.structureType;
    if (body.marginOverRmPerKgUsd !== undefined) {
      updates.marginOverRmPerKgUsd =
        body.marginOverRmPerKgUsd != null ? String(body.marginOverRmPerKgUsd) : null;
    }
    // Task 3.3: structureTier → structureType reconciliation
    if (body.structureTier !== undefined) {
      updates.structureType = tierToStructureType(body.structureTier);
    }
    if (body.displayOrder !== undefined) updates.displayOrder = body.displayOrder;
    // Task 3.3: merge printMode into defaultDimensions jsonb
    if (body.printMode !== undefined || body.defaultDimensions !== undefined) {
      const existingDims = (existing.defaultDimensions as Record<string, unknown>) || {};
      const mergedDims = {
        ...existingDims,
        ...(body.defaultDimensions || {}),
        ...(body.printMode !== undefined ? { printMode: body.printMode } : {}),
      };
      updates.defaultDimensions = mergedDims;
    }
    if (body.defaultProcesses !== undefined) updates.defaultProcesses = body.defaultProcesses;
    if (body.defaultPrintingWebClass !== undefined) {
      updates.defaultPrintingWebClass = body.defaultPrintingWebClass;
    }
    if (body.solventMixEnabled !== undefined) updates.solventMixEnabled = body.solventMixEnabled;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    if (body.defaultLayers !== undefined) {
      updates.defaultLayers = body.defaultLayers;
    }

    const [template] = await db
      .update(schema.structureTemplates)
      .set(updates)
      .where(eq(schema.structureTemplates.id, id))
      .returning();

    return reply.send(template);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update template error:', error);
    return reply.status(500).send({ error: 'Failed to update template' });
  }
}

/**
 * DELETE /api/v1/templates/:id
 * Standard → soft-deactivate (tenant / platform admin only). My Templates → hard delete (owner only).
 */
export async function deleteTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    const [existing] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, id),
          eq(schema.structureTemplates.tenantId, tenantId)
        )
      );

    if (!existing) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    if (existing.isStandard) {
      if (!canManageStandardTemplate(user)) {
        return reply.status(403).send({ error: 'Only admins can delete standard templates' });
      }
      await db
        .update(schema.structureTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.structureTemplates.id, id));
      return reply.send({ ok: true, deactivated: true });
    }

    if (!canDeleteMyTemplate(user, existing)) {
      return reply.status(403).send({ error: 'Not allowed to delete this template' });
    }

    await db.delete(schema.structureTemplates).where(eq(schema.structureTemplates.id, id));
    return reply.send({ ok: true, deleted: true });
  } catch (error: any) {
    console.error('Delete template error:', error);
    return reply.status(500).send({ error: 'Failed to delete template' });
  }
}

export async function registerTemplateRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { standard_only?: string; template_key?: string; user_only?: string } }>(
    '/api/v1/templates',
    async (request, reply) => getTemplatesRoute(fastify, request, reply)
  );
  fastify.post<{ Body: z.infer<typeof CreateTemplateSchema> }>(
    '/api/v1/templates',
    async (request, reply) => createTemplateRoute(fastify, request, reply)
  );
  fastify.post<{
    Body: {
      templateKey?: string;
      templateId?: string;
      customerId?: string;
      jobName?: string;
    };
  }>('/api/v1/templates/instantiate', async (request, reply) =>
    instantiateByKeyRoute(fastify, request, reply)
  );
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    async (request, reply) => getTemplateByIdRoute(fastify, request, reply)
  );
  fastify.patch<{ Params: { id: string }; Body: z.infer<typeof UpdateTemplateSchema> }>(
    '/api/v1/templates/:id',
    async (request, reply) => updateTemplateRoute(fastify, request, reply)
  );
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    async (request, reply) => deleteTemplateRoute(fastify, request, reply)
  );
  fastify.post<{ Params: { id: string }; Body: { customerId?: string; jobName?: string } }>(
    '/api/v1/templates/:id/instantiate',
    async (request, reply) => instantiateTemplateRoute(fastify, request, reply)
  );
}
