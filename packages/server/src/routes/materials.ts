import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, and } from 'drizzle-orm';
import { getEffectiveProfile, stripMaterialRow } from '../utils/visibility';
import { ensureMaterialsForTenant } from '../db/seed-materials';
import { roundUsd } from '../utils/usd';

function isMaterialAdmin(role: string): boolean {
  return role === 'tenant_admin' || role === 'platform_admin';
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
  type: z.enum(['substrate', 'ink', 'adhesive']),
  solidPercent: z.number().min(0).max(100),
  density: z.number().positive(),
  costPerKgUsd: z.number().nonnegative(),
  wastePercent: z.number().min(0).default(0),
  substrateFamily: z.string().nullable().optional(),
  substrateGrade: z.string().nullable().optional(),
  hoover: z.string().nullable().optional(),
  marketPriceUsd: z.number().nonnegative().nullable().optional(),
  itemClass: z.string().max(64).nullable().optional(),
});

export async function getMaterialsRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const db = getDatabase();

    const [userRecord] = await db
      .select({ visibilityProfile: schema.users.visibilityProfile })
      .from(schema.users)
      .where(eq(schema.users.id, user.userId));

    const profile = getEffectiveProfile(user.role, userRecord?.visibilityProfile);
    const isRmManager = user.role === 'tenant_admin' || user.role === 'platform_admin';

    await ensureMaterialsForTenant(tenantId);
    const { ensureCategoriesForTenant } = await import('../db/seed-categories');
    await ensureCategoriesForTenant(tenantId);

    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));

    const visibleMaterials = isRmManager
      ? materials
      : materials.map((mat: (typeof materials)[number]) => stripMaterialRow(mat, profile));

    return reply.send(visibleMaterials);
  } catch (error: any) {
    console.error('Get materials error:', error);
    return reply.status(500).send({ error: 'Failed to fetch materials' });
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
    if (!isMaterialAdmin(user.role)) {
      return reply.status(403).send({ error: 'Admin only' });
    }
    const tenantId = extractTenantFromRequest(request);
    const data = normalizeMaterialPrices(MaterialSchema.parse(request.body));

    const db = getDatabase();

    const [material] = await db
      .insert(schema.materials)
      .values({
        tenantId,
        ...data,
        marketPriceUsd: roundUsd(data.marketPriceUsd ?? data.costPerKgUsd),
        priceSource: 'manual',
        isTenantOnly: true,
      })
      .returning();

    return reply.status(201).send(material);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create material error:', error);
    return reply.status(500).send({ error: 'Failed to create material' });
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
    if (!isMaterialAdmin(user.role)) {
      return reply.status(403).send({ error: 'Admin only' });
    }
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const data = normalizeMaterialPrices(MaterialSchema.partial().parse(request.body));

    const db = getDatabase();

    const { marketPriceUsd, costPerKgUsd, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (marketPriceUsd !== undefined) {
      patch.marketPriceUsd = marketPriceUsd;
    }
    if (costPerKgUsd !== undefined || marketPriceUsd !== undefined) {
      patch.priceSource = 'manual';
    }
    if (costPerKgUsd !== undefined) {
      patch.costPerKgUsd = costPerKgUsd;
    }

    const [material] = await db
      .update(schema.materials)
      .set(patch)
      .where(and(eq(schema.materials.id, id), eq(schema.materials.tenantId, tenantId)))
      .returning();

    if (!material) {
      return reply.status(404).send({ error: 'Material not found' });
    }

    return reply.send(material);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update material error:', error);
    return reply.status(500).send({ error: 'Failed to update material' });
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
    if (!isMaterialAdmin(user.role)) {
      return reply.status(403).send({ error: 'Admin only' });
    }
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;

    const db = getDatabase();

    const layerUsage = await db
      .select({ id: schema.layers.id })
      .from(schema.layers)
      .innerJoin(schema.estimates, eq(schema.layers.estimateId, schema.estimates.id))
      .where(and(eq(schema.layers.materialId, id), eq(schema.estimates.tenantId, tenantId)))
      .limit(1);

    if (layerUsage.length > 0) {
      return reply.status(409).send({
        error: 'Material is used in one or more estimates',
        usedInEstimates: true,
      });
    }

    await db
      .delete(schema.materials)
      .where(and(eq(schema.materials.id, id), eq(schema.materials.tenantId, tenantId)));

    return reply.send({ success: true });
  } catch (error: any) {
    if (error?.code === '23503') {
      return reply.status(409).send({
        error: 'Material is referenced by estimates or templates',
        usedInEstimates: true,
      });
    }
    console.error('Delete material error:', error);
    return reply.status(500).send({ error: 'Failed to delete material' });
  }
}

export async function registerMaterialRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/materials', async (request, reply) =>
    getMaterialsRoute(fastify, request, reply)
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
        return reply.send({
          tenantsSynced: 1,
          ...result,
          templatesRelinked,
          totalMaterials: materials.length,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Sync from platform error:', error);
        return reply.status(500).send({ error: `Failed to sync from platform master: ${message}` });
      }
    }
  );

  /** @deprecated Use POST /api/v1/materials/sync-from-platform */
  fastify.post<{ Body: { prune?: boolean } }>(
    '/api/v1/materials/refresh-from-excel',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const user = extractUserFromRequest(request);
        const tenantId = extractTenantFromRequest(request);
        if (user.role !== 'tenant_admin' && user.role !== 'platform_admin') {
          return reply.status(403).send({ error: 'Admin only' });
        }
        const prune = request.body?.prune === true;
        const { syncPlatformMasterToAllTenants, listPlatformMasterMaterials } = await import(
          '../db/platform-master-data'
        );
        const { syncMaterialsForTenant } = await import('../db/seed-materials');
        const { relinkTemplatesForTenant } = await import('../db/seed-templates');

        if (user.role === 'platform_admin') {
          const sync = await syncPlatformMasterToAllTenants({ pruneOrphans: prune });
          const materials = await listPlatformMasterMaterials();
          return reply.send({
            ...sync,
            excelPath: '(deprecated — platform DB)',
            seedPath: '(deprecated)',
            referencePath: '(deprecated)',
            substrateCount: materials.filter(
              (m) => m.type === 'substrate' && m.substrateFamily !== 'Packaging'
            ).length,
            inkCount: materials.filter((m) => m.type === 'ink').length,
            adhesiveCount: materials.filter((m) => m.type === 'adhesive').length,
            packagingCount: materials.filter((m) => m.substrateFamily === 'Packaging').length,
            totalMaterials: materials.length,
            reference: { productTypes: 0, units: 0, rmTypes: 0 },
          });
        }

        const materials = await listPlatformMasterMaterials();
        const result = await syncMaterialsForTenant(tenantId, materials, { pruneOrphans: prune });
        await relinkTemplatesForTenant(tenantId);
        return reply.send({
          excelPath: '(deprecated)',
          seedPath: '(deprecated)',
          referencePath: '(deprecated)',
          substrateCount: materials.filter(
            (m) => m.type === 'substrate' && m.substrateFamily !== 'Packaging'
          ).length,
          inkCount: materials.filter((m) => m.type === 'ink').length,
          adhesiveCount: materials.filter((m) => m.type === 'adhesive').length,
          packagingCount: materials.filter((m) => m.substrateFamily === 'Packaging').length,
          totalMaterials: materials.length,
          tenantsSynced: 1,
          ...result,
          templatesRelinked: 1,
          reference: { productTypes: 0, units: 0, rmTypes: 0 },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return reply.status(500).send({ error: message });
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
      console.error('Prune orphans error:', error);
      return reply.status(500).send({ error: `Failed to prune orphans: ${message}` });
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
    } catch (error: any) {
      console.error('Refresh prices error:', error);
      return reply.status(500).send({ error: 'Failed to refresh market prices' });
    }
  });

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/materials/:id',
    async (request, reply) => deleteMaterialRoute(fastify, request, reply)
  );
}
