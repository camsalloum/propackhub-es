import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, and, sql, count as drizzleCount } from 'drizzle-orm';
import { getEffectiveProfile, stripMaterialRow } from '../utils/visibility';
import { ensureMaterialsForTenant } from '../db/seed-materials';
import { roundUsd } from '../utils/usd';
import { parsePagination, paginate } from '../utils/pagination';
import { sendCaughtError, errorBody } from '../utils/errors';
import {
  buildTenantCatalogAccess,
  canMutateMaterialRow,
  canEditPebiSyncedMaterialPrice,
  canEditPeSubstrateManualPrice,
  canEditInkCoatingManualPrice,
  canEditInkCoatingPhysicalProps,
  canEditAdhesiveManualPrice,
  canEditAdhesivePhysicalProps,
  CATALOG_READ_ONLY_MESSAGE,
} from '../services/tenant-catalog-access';
import { getMaterialsCatalogMeta } from '../services/materials-catalog-meta';
import { syncMaterialMarketRefToPebi } from '../services/pebi-market-ref-sync';

function isMaterialAdmin(role: string): boolean {
  return role === 'tenant_admin' || role === 'platform_admin';
}

/**
 * Who may edit a tenant's own master data:
 *  - platform_admin / tenant_admin (group admin): always
 *  - a plain 'user': only when the tenant is an individual account (single
 *    owner who fully controls their own materials). In a company/group tenant,
 *    regular members are read-only and must go through the group admin.
 */
async function canManageTenantMaterials(
  db: ReturnType<typeof getDatabase>,
  tenantId: string,
  role: string
): Promise<boolean> {
  if (isMaterialAdmin(role)) return true;
  const [tenant] = await db
    .select({ type: schema.tenants.type })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));
  return tenant?.type === 'individual';
}

const MASTER_DATA_FORBIDDEN = {
  error: {
    code: 'FORBIDDEN',
    message:
      'Only your group administrator can change master data. Contact your admin to add or edit materials.',
  },
} as const;

async function loadTenantCatalogAccess(tenantId: string) {
  const db = getDatabase();
  const [tenant] = await db
    .select({ catalogSource: schema.tenants.catalogSource })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  return buildTenantCatalogAccess(tenant ?? {});
}

function normalizeMaterialPrices<T extends { costPerKgUsd?: number; marketPriceUsd?: number | null }>(
  data: T
): T {
  const out = { ...data };
  if (data.costPerKgUsd != null) {
    out.costPerKgUsd = roundUsd(data.costPerKgUsd);
  }
  if (data.marketPriceUsd != null) {
    out.marketPriceUsd = roundUsd(data.marketPriceUsd);
  }
  return out;
}

const MaterialSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['substrate', 'ink', 'adhesive', 'solvent', 'accessory']),
  solidPercent: z.number().min(0).max(100),
  density: z.number().positive(),
  costPerKgUsd: z.number().nonnegative(),
  wastePercent: z.number().min(0).default(0),
  substrateFamily: z.string().nullable().optional(),
  substrateGrade: z.string().nullable().optional(),
  hoover: z.string().nullable().optional(),
  marketPriceUsd: z.number().nonnegative().nullable().optional(),
  itemClass: z.string().max(64).nullable().optional(),
  laminationRecipe: z.unknown().nullable().optional(),
  // Accessory pricing (type='accessory' rows).
  accessoryKind: z.enum(['zipper', 'spout', 'valve', 'handle', 'window']).nullable().optional(),
  costPerMeterUsd: z.number().nonnegative().nullable().optional(),
  costPerPieceUsd: z.number().nonnegative().nullable().optional(),
  weightGramPerMeter: z.number().nonnegative().nullable().optional(),
  weightGramPerPiece: z.number().nonnegative().nullable().optional(),
});

export async function getMaterialsRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const db = getDatabase();
    const { limit, offset } = parsePagination(request.query);

    const [userRecord] = await db
      .select({ visibilityProfile: schema.users.visibilityProfile })
      .from(schema.users)
      .where(eq(schema.users.id, user.userId));

    const profile = getEffectiveProfile(user.role, userRecord?.visibilityProfile);
    const isRmManager = user.role === 'tenant_admin' || user.role === 'platform_admin';

    await ensureMaterialsForTenant(tenantId);
    const { ensureCategoriesForTenant } = await import('../db/seed-categories');
    await ensureCategoriesForTenant(tenantId);

    const whereClause = eq(schema.materials.tenantId, tenantId);
    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(schema.materials)
      .where(whereClause);

    const materials = await db
      .select()
      .from(schema.materials)
      .where(whereClause)
      .orderBy(schema.materials.type, schema.materials.name)
      .limit(limit)
      .offset(offset);

    const visibleMaterials = isRmManager
      ? materials
      : materials.map((mat: (typeof materials)[number]) => stripMaterialRow(mat, profile));

    return reply.send(paginate(visibleMaterials, Number(total), limit, offset));
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to fetch materials', 'Get materials error:');
  }
}

export async function createMaterialRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof MaterialSchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    if (!(await canManageTenantMaterials(db, tenantId, user.role))) {
      return reply.status(403).send(MASTER_DATA_FORBIDDEN);
    }
    const data = normalizeMaterialPrices(MaterialSchema.parse(request.body));

    const [material] = await db
      .insert(schema.materials)
      .values({
        tenantId,
        name: data.name,
        type: data.type,
        solidPercent: data.solidPercent,
        density: String(data.density),
        costPerKgUsd: String(roundUsd(data.costPerKgUsd)),
        wastePercent: data.wastePercent ?? 0,
        isSolventBased: false,
        substrateFamily: data.substrateFamily ?? null,
        substrateGrade: data.substrateGrade ?? null,
        hoover: data.hoover ?? null,
        marketPriceUsd: String(roundUsd(data.marketPriceUsd ?? data.costPerKgUsd)),
        itemClass: data.itemClass ?? (data.type === 'accessory' ? 'accessory' : null),
        accessoryKind: data.accessoryKind ?? null,
        costPerMeterUsd: data.costPerMeterUsd != null ? String(data.costPerMeterUsd) : null,
        costPerPieceUsd: data.costPerPieceUsd != null ? String(data.costPerPieceUsd) : null,
        weightGramPerMeter: data.weightGramPerMeter != null ? String(data.weightGramPerMeter) : null,
        weightGramPerPiece: data.weightGramPerPiece != null ? String(data.weightGramPerPiece) : null,
        priceSource: 'manual',
        isTenantOnly: true,
      })
      .returning();

    return reply.status(201).send(material);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    return sendCaughtError(reply, error, 'Failed to create material', 'Create material error:');
  }
}

export async function updateMaterialRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string }; Body: Partial<z.infer<typeof MaterialSchema>> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();
    if (!(await canManageTenantMaterials(db, tenantId, user.role))) {
      return reply.status(403).send(MASTER_DATA_FORBIDDEN);
    }
    const data = normalizeMaterialPrices(MaterialSchema.partial().parse(request.body));

    const [existing] = await db
      .select({
        isTenantOnly: schema.materials.isTenantOnly,
        type: schema.materials.type,
        substrateFamily: schema.materials.substrateFamily,
        externalSource: schema.materials.externalSource,
        priceSource: schema.materials.priceSource,
        solidPercent: schema.materials.solidPercent,
        costPerKgUsd: schema.materials.costPerKgUsd,
      })
      .from(schema.materials)
      .where(and(eq(schema.materials.id, id), eq(schema.materials.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: 'Material not found' });
    }

    const catalogAccess = await loadTenantCatalogAccess(tenantId);
    const definedPatchKeys = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k]) => k);
    const isPebiMarketRefOnlyEdit =
      catalogAccess.catalogSource === 'pebi' &&
      !existing.isTenantOnly &&
      existing.externalSource === 'pebi' &&
      existing.priceSource === 'pebi' &&
      definedPatchKeys.length === 1 &&
      definedPatchKeys[0] === 'marketPriceUsd';
    const isPebiManualPriceEdit =
      canEditPebiSyncedMaterialPrice({
        catalogSource: catalogAccess.catalogSource,
        externalSource: existing.externalSource,
        priceSource: existing.priceSource,
        isTenantOnly: existing.isTenantOnly,
      }) &&
      definedPatchKeys.every((key) => key === 'marketPriceUsd' || key === 'costPerKgUsd');
    const isPeManualPriceEdit =
      canEditPeSubstrateManualPrice({
        type: existing.type,
        substrateFamily: existing.substrateFamily,
        externalSource: existing.externalSource,
        priceSource: existing.priceSource,
      }) &&
      definedPatchKeys.every((key) => key === 'marketPriceUsd' || key === 'costPerKgUsd');
    const isInkManualEdit = canEditInkCoatingManualPrice({
      type: existing.type,
      externalSource: existing.externalSource,
      priceSource: existing.priceSource,
    });
    const inkPhysicalKeys = new Set(['solidPercent', 'density', 'name', 'substrateFamily', 'substrateGrade', 'hoover']);
    const isInkPhysicalEdit =
      canEditInkCoatingPhysicalProps({ type: existing.type }) &&
      definedPatchKeys.every((key) => inkPhysicalKeys.has(key));
    const isAdhesiveManualEdit = canEditAdhesiveManualPrice({
      type: existing.type,
      externalSource: existing.externalSource,
      priceSource: existing.priceSource,
    });
    const adhesivePhysicalKeys = new Set([
      ...inkPhysicalKeys,
      'laminationRecipe',
    ]);
    const isAdhesivePhysicalEdit =
      canEditAdhesivePhysicalProps({ type: existing.type }) &&
      definedPatchKeys.every((key) => adhesivePhysicalKeys.has(key));

    if (
      !canMutateMaterialRow(catalogAccess, existing.isTenantOnly) &&
      !isPebiMarketRefOnlyEdit &&
      !isPebiManualPriceEdit &&
      !isPeManualPriceEdit &&
      !isInkManualEdit &&
      !isInkPhysicalEdit &&
      !isAdhesiveManualEdit &&
      !isAdhesivePhysicalEdit
    ) {
      return reply
        .status(403)
        .send(errorBody('FORBIDDEN', CATALOG_READ_ONLY_MESSAGE, { catalogAccess }));
    }

    const { marketPriceUsd, costPerKgUsd, costPerMeterUsd, costPerPieceUsd, weightGramPerMeter, weightGramPerPiece, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (marketPriceUsd !== undefined) {
      patch.marketPriceUsd = marketPriceUsd;
    }
    if (
      !isPebiMarketRefOnlyEdit &&
      (isPebiManualPriceEdit ||
        isPeManualPriceEdit ||
        isInkManualEdit ||
        isAdhesiveManualEdit ||
        canMutateMaterialRow(catalogAccess, existing.isTenantOnly)) &&
      (costPerKgUsd !== undefined || marketPriceUsd !== undefined)
    ) {
      patch.priceSource = 'manual';
    }
    if (costPerKgUsd !== undefined) {
      patch.costPerKgUsd = costPerKgUsd;
    }
    // PEBI-priced ink: solid% change keeps liquid $/kg, recomputes dry cost (does not flip priceSource).
    if (
      isInkPhysicalEdit &&
      !isInkManualEdit &&
      existing.type === 'ink' &&
      existing.priceSource === 'pebi' &&
      data.solidPercent != null &&
      data.solidPercent > 0 &&
      existing.solidPercent > 0
    ) {
      const oldSolid = existing.solidPercent;
      const newSolid = data.solidPercent;
      const dry = Number(existing.costPerKgUsd);
      if (Number.isFinite(dry) && dry > 0 && oldSolid !== newSolid) {
        const liquid = dry * (oldSolid / 100);
        patch.costPerKgUsd = String(roundUsd(liquid / (newSolid / 100)));
        patch.marketPriceUsd = patch.costPerKgUsd;
      }
    }
    // Accessory pricing (decimal columns take strings).
    if (costPerMeterUsd !== undefined) patch.costPerMeterUsd = costPerMeterUsd != null ? String(costPerMeterUsd) : null;
    if (costPerPieceUsd !== undefined) patch.costPerPieceUsd = costPerPieceUsd != null ? String(costPerPieceUsd) : null;
    if (weightGramPerMeter !== undefined) patch.weightGramPerMeter = weightGramPerMeter != null ? String(weightGramPerMeter) : null;
    if (weightGramPerPiece !== undefined) patch.weightGramPerPiece = weightGramPerPiece != null ? String(weightGramPerPiece) : null;

    const [material] = await db
      .update(schema.materials)
      .set(patch)
      .where(and(eq(schema.materials.id, id), eq(schema.materials.tenantId, tenantId)))
      .returning();

    if (isPebiMarketRefOnlyEdit && marketPriceUsd != null) {
      await syncMaterialMarketRefToPebi(tenantId, id, marketPriceUsd);
    }

    return reply.send(material);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    return sendCaughtError(reply, error, 'Failed to update material', 'Update material error:');
  }
}

export async function deleteMaterialRoute(
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
    if (!(await canManageTenantMaterials(db, tenantId, user.role))) {
      return reply.status(403).send(MASTER_DATA_FORBIDDEN);
    }

    const [existing] = await db
      .select({ isTenantOnly: schema.materials.isTenantOnly })
      .from(schema.materials)
      .where(and(eq(schema.materials.id, id), eq(schema.materials.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: 'Material not found' });
    }

    const catalogAccess = await loadTenantCatalogAccess(tenantId);
    if (!canMutateMaterialRow(catalogAccess, existing.isTenantOnly)) {
      return reply
        .status(403)
        .send(errorBody('FORBIDDEN', CATALOG_READ_ONLY_MESSAGE, { catalogAccess }));
    }

    const layerUsage = await db
      .select({ id: schema.layers.id })
      .from(schema.layers)
      .innerJoin(schema.estimates, eq(schema.layers.estimateId, schema.estimates.id))
      .where(and(eq(schema.layers.materialId, id), eq(schema.estimates.tenantId, tenantId)))
      .limit(1);

    if (layerUsage.length > 0) {
      // Count total usages for a helpful message
      const usageCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.layers)
        .innerJoin(schema.estimates, eq(schema.layers.estimateId, schema.estimates.id))
        .where(and(eq(schema.layers.materialId, id), eq(schema.estimates.tenantId, tenantId)));

      return reply.status(409).send({
        error: {
          code: 'FK_IN_USE',
          message: 'Material is used in one or more estimates and cannot be deleted',
          details: { count: Number(usageCount[0]?.count ?? 1) },
        },
      });
    }

    await db
      .delete(schema.materials)
      .where(and(eq(schema.materials.id, id), eq(schema.materials.tenantId, tenantId)));

    return reply.send({ success: true });
  } catch (error: any) {
    if (error?.code === '23503') {
      return reply.status(409).send({
        error: {
          code: 'FK_IN_USE',
          message: 'Material is referenced by estimates or templates',
          details: { count: 0 },
        },
      });
    }
    return sendCaughtError(reply, error, 'Failed to delete material', 'Delete material error:');
  }
}

export async function getMaterialsMetaRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const meta = await getMaterialsCatalogMeta(tenantId);
    return reply.send(meta);
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to load materials meta', 'Get materials meta error:');
  }
}

export async function registerMaterialRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/materials/meta', async (request, reply) =>
    getMaterialsMetaRoute(fastify, request, reply)
  );

  fastify.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/api/v1/materials',
    async (request, reply) => getMaterialsRoute(fastify, request, reply)
  );

  fastify.post<{ Body: z.infer<typeof MaterialSchema> }>(
    '/api/v1/materials',
    async (request, reply) => createMaterialRoute(fastify, request, reply)
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<z.infer<typeof MaterialSchema>> }>(
    '/api/v1/materials/:id',
    async (request, reply) => updateMaterialRoute(fastify, request, reply)
  );

  // Sync tenant library from platform master (replaces Excel refresh)
  fastify.post<{ Body: { prune?: boolean } }>(
    '/api/v1/materials/sync-from-platform',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const user = extractUserFromRequest(request);
        const tenantId = extractTenantFromRequest(request);
        if (user.role !== 'tenant_admin' && user.role !== 'platform_admin') {
          return reply.status(403).send({ error: 'Admin only' });
        }

        const catalogAccess = await loadTenantCatalogAccess(tenantId);
        if (user.role === 'tenant_admin' && catalogAccess.catalogSource === 'pebi') {
          return reply
            .status(403)
            .send(errorBody('FORBIDDEN', CATALOG_READ_ONLY_MESSAGE, { catalogAccess }));
        }

        const pruneOrphans = request.body?.prune !== false;
        const { syncPlatformMasterToAllTenants } = await import('../db/platform-master-data');
        const { syncMaterialsForTenant } = await import('../db/seed-materials');
        const { relinkTemplatesForTenant } = await import('../db/seed-templates');
        const { listPlatformMasterMaterials } = await import('../db/platform-master-data');

        if (user.role === 'platform_admin') {
          const result = await syncPlatformMasterToAllTenants({ pruneOrphans });
          const materials = await listPlatformMasterMaterials();
          return reply.send({
            ...result,
            totalMaterials: materials.length,
            substrateCount: materials.filter(
              (m) => m.type === 'substrate' && m.substrateFamily !== 'Packaging'
            ).length,
            inkCount: materials.filter((m) => m.type === 'ink').length,
            adhesiveCount: materials.filter((m) => m.type === 'adhesive').length,
            packagingCount: materials.filter((m) => m.substrateFamily === 'Packaging').length,
          });
        }

        const materials = await listPlatformMasterMaterials();
        const result = await syncMaterialsForTenant(tenantId, materials, { pruneOrphans });
        const templatesRelinked = await relinkTemplatesForTenant(tenantId);
        const { invalidateTemplatePrepareCache } = await import('../routes/templates');
        invalidateTemplatePrepareCache(tenantId);
        return reply.send({
          tenantsSynced: 1,
          ...result,
          templatesRelinked,
          totalMaterials: materials.length,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return sendCaughtError(
          reply,
          error,
          `Failed to sync from platform master: ${message}`,
          'Sync from platform error:'
        );
      }
    }
  );

  // Prune library rows not in platform master
  fastify.post('/api/v1/materials/prune-orphans', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = extractUserFromRequest(request);
      const tenantId = extractTenantFromRequest(request);
      if (user.role !== 'tenant_admin' && user.role !== 'platform_admin') {
        return reply.status(403).send({ error: 'Admin only' });
      }

      const { listPlatformMasterMaterials } = await import('../db/platform-master-data');
      const { pruneOrphanSubstratesForTenant } = await import('../db/seed-materials');
      const materials = await listPlatformMasterMaterials();
      const pruned = await pruneOrphanSubstratesForTenant(tenantId, materials);
      return reply.send({ pruned });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return sendCaughtError(reply, error, `Failed to prune orphans: ${message}`, 'Prune orphans error:');
    }
  });

  // Refresh market prices from free futures feeds (market column only)
  fastify.post('/api/v1/materials/refresh-prices', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = extractUserFromRequest(request);
      const tenantId = extractTenantFromRequest(request);
      if (user.role !== 'tenant_admin' && user.role !== 'platform_admin') {
        return reply.status(403).send({ error: 'Admin only' });
      }
      const { refreshMaterialPrices } = await import('../services/price-scraper');
      const result = await refreshMaterialPrices(tenantId);
      return reply.send(result);
    } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to refresh market prices', 'Refresh prices error:');
  }
  });

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/materials/:id',
    async (request, reply) => deleteMaterialRoute(fastify, request, reply)
  );
}
