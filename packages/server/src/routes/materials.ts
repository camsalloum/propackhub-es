import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, and } from 'drizzle-orm';
import { getEffectiveProfile, stripMaterialRow } from '../utils/visibility';
import { ensureMaterialsForTenant } from '../db/seed-materials';
import { roundUsd } from '../utils/usd';

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
    const tenantId = extractTenantFromRequest(request);
    const data = normalizeMaterialPrices(MaterialSchema.parse(request.body));

    const db = getDatabase();

    const [material] = await db
      .insert(schema.materials)
      .values({
        tenantId,
        ...data,
        marketPriceUsd: roundUsd(data.marketPriceUsd ?? data.costPerKgUsd),
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
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const data = normalizeMaterialPrices(MaterialSchema.partial().parse(request.body));

    const db = getDatabase();

    const { marketPriceUsd, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (marketPriceUsd !== undefined) {
      patch.marketPriceUsd = marketPriceUsd;
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
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;

    const db = getDatabase();

    await db
      .delete(schema.materials)
      .where(and(eq(schema.materials.id, id), eq(schema.materials.tenantId, tenantId)));

    return reply.send({ success: true });
  } catch (error: any) {
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

  // Refresh platform master from Master Data.xlsx
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
      const { refreshMaterialsFromExcel } = await import('../services/materials-excel-refresh');
      const result = await refreshMaterialsFromExcel(tenantId, {
        syncAllTenants: false,
        pruneOrphans: prune,
      });
      return reply.send(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Refresh from Excel error:', error);
      return reply.status(500).send({
        error: message.includes('not found')
          ? 'Master Data.xlsx not found (set MASTER_DATA_EXCEL_PATH or place at project root)'
          : `Failed to refresh from Excel: ${message}`,
      });
    }
  });

  // Prune substrate rows not in Excel (no price sync)
  fastify.post('/api/v1/materials/prune-orphans', async (request, reply) => {
    try {
      await request.jwtVerify();
      const user = extractUserFromRequest(request);
      const tenantId = extractTenantFromRequest(request);
      if (user.role !== 'tenant_admin' && user.role !== 'platform_admin') {
        return reply.status(403).send({ error: 'Admin only' });
      }

      const { buildMasterMaterialsFromExcel, resolveMasterDataExcelPath } = await import(
        '../db/master-materials-io'
      );
      const { pruneOrphanSubstratesForTenant } = await import('../db/seed-materials');
      const materials = buildMasterMaterialsFromExcel(resolveMasterDataExcelPath());
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
