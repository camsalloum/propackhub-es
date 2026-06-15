import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, and } from 'drizzle-orm';

const MaterialSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['substrate', 'ink', 'adhesive']),
  solidPercent: z.number().min(0).max(100),
  density: z.number().positive(),
  costPerKgUsd: z.number().nonnegative(),
  wastePercent: z.number().min(0).default(0),
});

export async function getMaterialsRoute(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));

    return reply.send(materials);
  } catch (error: any) {
    console.error('Get materials error:', error);
    return reply.status(500).send({ error: 'Failed to fetch materials' });
  }
}

export async function createMaterialRoute(
  fastify: FastifyInstance,
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
  fastify: FastifyInstance,
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
  fastify: FastifyInstance,
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

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/materials/:id',
    async (request, reply) => deleteMaterialRoute(fastify, request, reply)
  );
}
