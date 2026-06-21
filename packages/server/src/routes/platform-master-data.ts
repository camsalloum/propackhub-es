import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { extractUserFromRequest } from '../utils/auth';
import {
  listPlatformMasterMaterialsWithIds,
  createPlatformMasterMaterial,
  updatePlatformMasterMaterial,
  deletePlatformMasterMaterial,
  replacePlatformMasterMaterials,
  buildMasterDataReferenceFromDb,
  replacePlatformReferenceCategory,
  syncPlatformMasterToAllTenants,
} from '../db/platform-master-data';
import { enrichMasterDataReference } from '../utils/master-data-normalize';
import type { MasterMaterial } from '../db/master-materials-io';

function requireMasterDataAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  const user = extractUserFromRequest(request);
  if (user.role !== 'tenant_admin' && user.role !== 'platform_admin') {
    reply.status(403).send({ error: 'Admin only' });
    return false;
  }
  return true;
}

const MaterialBodySchema = z.object({
  key: z.string().min(1).max(128),
  name: z.string().min(1).max(255),
  type: z.enum(['substrate', 'ink', 'adhesive']),
  solidPercent: z.number().int().min(0).max(100),
  density: z.number().positive(),
  costPerKgUsd: z.number().min(0),
  wastePercent: z.number().int().min(0).max(100).optional(),
  isSolventBased: z.boolean().optional(),
  substrateFamily: z.string().nullable().optional(),
  substrateGrade: z.string().nullable().optional(),
  hoover: z.string().nullable().optional(),
  marketPriceUsd: z.number().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const ReferenceCategorySchema = z.enum([
  'product_type',
  'unit',
  'rm_type',
  'printing_web',
  'ink_coating',
  'adhesive',
  'packaging',
]);

const ReferenceItemSchema = z.object({
  label: z.string().min(1),
  code: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

async function afterPlatformMutation() {
  return syncPlatformMasterToAllTenants({ pruneOrphans: true });
}

export async function registerPlatformMasterDataRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/platform/master-data/materials', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (!requireMasterDataAdmin(request, reply)) return;
      const rows = await listPlatformMasterMaterialsWithIds();
      return reply.send(
        rows.map((r) => ({
          id: r.id,
          key: r.key,
          name: r.name,
          type: r.type,
          solidPercent: r.solidPercent,
          density: Number(r.density),
          costPerKgUsd: Number(r.costPerKgUsd),
          wastePercent: r.wastePercent,
          isSolventBased: r.isSolventBased,
          substrateFamily: r.substrateFamily,
          substrateGrade: r.substrateGrade,
          hoover: r.hoover,
          marketPriceUsd: r.marketPriceUsd != null ? Number(r.marketPriceUsd) : null,
          costingKey: r.costingKey,
          sortOrder: r.sortOrder,
        }))
      );
    } catch (error) {
      console.error('List platform master materials error:', error);
      return reply.status(500).send({ error: 'Failed to load platform master materials' });
    }
  });

  fastify.post<{ Body: z.infer<typeof MaterialBodySchema> }>(
    '/api/v1/platform/master-data/materials',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        if (!requireMasterDataAdmin(request, reply)) return;
        const body = MaterialBodySchema.parse(request.body);
        const created = await createPlatformMasterMaterial(body as MasterMaterial);
        const sync = await afterPlatformMutation();
        return reply.status(201).send({ material: created, sync });
      } catch (error) {
        console.error('Create platform master material error:', error);
        return reply.status(500).send({ error: 'Failed to create material' });
      }
    }
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<z.infer<typeof MaterialBodySchema>> }>(
    '/api/v1/platform/master-data/materials/:id',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        if (!requireMasterDataAdmin(request, reply)) return;
        const body = MaterialBodySchema.partial().parse(request.body);
        const updated = await updatePlatformMasterMaterial(request.params.id, body as Partial<MasterMaterial>);
        if (!updated) return reply.status(404).send({ error: 'Material not found' });
        const sync = await afterPlatformMutation();
        return reply.send({ material: updated, sync });
      } catch (error) {
        console.error('Update platform master material error:', error);
        return reply.status(500).send({ error: 'Failed to update material' });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/platform/master-data/materials/:id',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        if (!requireMasterDataAdmin(request, reply)) return;
        const ok = await deletePlatformMasterMaterial(request.params.id);
        if (!ok) return reply.status(404).send({ error: 'Material not found' });
        const sync = await afterPlatformMutation();
        return reply.send({ ok: true, sync });
      } catch (error) {
        console.error('Delete platform master material error:', error);
        return reply.status(500).send({ error: 'Failed to delete material' });
      }
    }
  );

  fastify.put<{ Body: z.infer<typeof MaterialBodySchema>[] }>(
    '/api/v1/platform/master-data/materials',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        if (!requireMasterDataAdmin(request, reply)) return;
        const body = z.array(MaterialBodySchema).parse(request.body);
        const materials = await replacePlatformMasterMaterials(body as MasterMaterial[]);
        const sync = await afterPlatformMutation();
        return reply.send({ materials, count: materials.length, sync });
      } catch (error) {
        console.error('Bulk replace platform master materials error:', error);
        return reply.status(500).send({ error: 'Failed to save materials' });
      }
    }
  );

  fastify.get('/api/v1/platform/master-data/reference', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (!requireMasterDataAdmin(request, reply)) return;
      const ref = await buildMasterDataReferenceFromDb();
      return reply.send(enrichMasterDataReference(ref));
    } catch (error) {
      console.error('Get platform master reference error:', error);
      return reply.status(500).send({ error: 'Failed to load reference data' });
    }
  });

  fastify.put<{
    Params: { category: string };
    Body: z.infer<typeof ReferenceItemSchema>[];
  }>('/api/v1/platform/master-data/reference/:category', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (!requireMasterDataAdmin(request, reply)) return;
      const category = ReferenceCategorySchema.parse(request.params.category);
      const items = z.array(ReferenceItemSchema).parse(request.body);
      const saved = await replacePlatformReferenceCategory(category, items);
      const sync =
        category === 'product_type' || category === 'printing_web'
          ? await afterPlatformMutation()
          : { tenantsSynced: 0, inserted: 0, updated: 0, orphans: 0, pruned: 0, templatesRelinked: 0 };
      return reply.send({ items: saved, sync });
    } catch (error) {
      console.error('Save platform reference category error:', error);
      return reply.status(500).send({ error: 'Failed to save reference list' });
    }
  });

  fastify.post('/api/v1/platform/master-data/sync-tenants', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (!requireMasterDataAdmin(request, reply)) return;
      const sync = await syncPlatformMasterToAllTenants({ pruneOrphans: true });
      return reply.send(sync);
    } catch (error) {
      console.error('Manual tenant sync error:', error);
      return reply.status(500).send({ error: 'Failed to sync tenants' });
    }
  });
}
