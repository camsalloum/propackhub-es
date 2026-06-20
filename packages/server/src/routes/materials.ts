import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, and } from 'drizzle-orm';
import { getEffectiveProfile, stripMaterialRow } from '../utils/visibility';
import { ensureMaterialsForTenant } from '../db/seed-materials';

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

    await ensureMaterialsForTenant(tenantId);
    const { ensureCategoriesForTenant } = await import('../db/seed-categories');
    await ensureCategoriesForTenant(tenantId);

    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));

    const visibleMaterials = materials.map((mat: (typeof materials)[number]) => stripMaterialRow(mat, profile));

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
    const data = MaterialSchema.parse(request.body);

    const db = getDatabase();

    const [material] = await db
      .insert(schema.materials)
      .values({
        tenantId,
        ...data,
        marketPriceUsd: data.marketPriceUsd ?? data.costPerKgUsd,
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
    const data = MaterialSchema.partial().parse(request.body);

    const db = getDatabase();

    const [material] = await db
      .update(schema.materials)
      .set({
        ...data,
        marketPriceUsd: data.marketPriceUsd ?? data.costPerKgUsd,
        updatedAt: new Date(),
      })
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

  // Refresh market prices (platform admin only)
  fastify.post(
    '/api/v1/materials/refresh-prices',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const user = extractUserFromRequest(request);
        if (user.role !== 'platform_admin') {
          return reply.status(403).send({ error: 'Platform admin only' });
        }
        const { refreshMaterialPrices } = await import('../services/price-scraper');
        const result = await refreshMaterialPrices();
        return reply.send(result);
      } catch (error: any) {
        console.error('Refresh prices error:', error);
        return reply.status(500).send({ error: 'Failed to refresh prices' });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/materials/:id',
    async (request, reply) => deleteMaterialRoute(fastify, request, reply)
  );
}
