import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { extractUserFromRequest, isPlatformAdmin } from '../utils/auth';
import {
  listPlatformMasterMaterialsWithIds,
  createPlatformMasterMaterial,
  updatePlatformMasterMaterial,
  deletePlatformMasterMaterial,
  replacePlatformMasterMaterials,
  updateCostingDefaults,
  buildMasterDataReferenceFromDb,
  replacePlatformReferenceCategory,
  syncPlatformMasterToAllTenants,
  getMasterDataVersion,
  listPlatformMasterMaterials,
  ReferenceItemInUseError,
  type AuditActor,
} from '../db/platform-master-data';
import { listMasterDataChangesSince, appendMasterAuditEntry } from '../db/platform-master-audit';
import {
  createPlatformServiceKey,
  listPlatformServiceKeys,
  revokePlatformServiceKey,
} from '../db/platform-service-keys';
import { authenticateMasterDataReader } from '../utils/service-key-auth';
import { checkRateLimit } from '../utils/rate-limit';
import { enrichMasterDataReference } from '../utils/master-data-normalize';
import type { MasterMaterial } from '../db/master-materials-io';

// The platform master catalog (materials + reference taxonomy) and service keys
// are the app owner's global source of truth — the seed every tenant is
// provisioned from, and the future PEBI master-data link point. Only the
// platform owner may read or mutate them. Tenants edit their OWN tenant-scoped
// materials via /api/v1/materials instead.
function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  const user = extractUserFromRequest(request);
  if (!isPlatformAdmin(user.role)) {
    reply.status(403).send({ error: 'Platform admin only' });
    return false;
  }
  return true;
}

function auditActorFromRequest(request: FastifyRequest): AuditActor {
  const user = extractUserFromRequest(request);
  return { type: 'user', id: user.userId };
}

const MaterialBodySchema = z.object({
  key: z.string().min(1).max(128),
  name: z.string().min(1).max(255),
  type: z.enum(['substrate', 'ink', 'adhesive', 'solvent', 'accessory']),
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
  externalId: z.string().max(128).nullable().optional(),
  externalSource: z.string().max(64).nullable().optional(),
  laminationRecipe: z.record(z.unknown()).nullable().optional(),
  // Accessory pricing (type='accessory').
  accessoryKind: z.enum(['zipper', 'spout', 'valve', 'handle', 'window']).nullable().optional(),
  costPerMeterUsd: z.number().min(0).nullable().optional(),
  costPerPieceUsd: z.number().min(0).nullable().optional(),
  weightGramPerMeter: z.number().min(0).nullable().optional(),
  weightGramPerPiece: z.number().min(0).nullable().optional(),
});

const ReferenceCategorySchema = z.enum([
  'product_type',
  'unit',
  'rm_type',
  'printing_web',
  'ink_coating',
  'adhesive',
  'packaging',
  'product_subtype',
  'process',
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
      if (!requirePlatformAdmin(request, reply)) return;
      const rows = await listPlatformMasterMaterialsWithIds();
      return reply.send(
        rows.map((r: Awaited<ReturnType<typeof listPlatformMasterMaterialsWithIds>>[number]) => ({
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
          externalId: r.externalId,
          externalSource: r.externalSource,
          laminationRecipe: r.laminationRecipe ?? null,
          accessoryKind: r.accessoryKind ?? null,
          costPerMeterUsd: r.costPerMeterUsd != null ? Number(r.costPerMeterUsd) : null,
          costPerPieceUsd: r.costPerPieceUsd != null ? Number(r.costPerPieceUsd) : null,
          weightGramPerMeter: r.weightGramPerMeter != null ? Number(r.weightGramPerMeter) : null,
          weightGramPerPiece: r.weightGramPerPiece != null ? Number(r.weightGramPerPiece) : null,
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
        if (!requirePlatformAdmin(request, reply)) return;
        const body = MaterialBodySchema.parse(request.body);
        const created = await createPlatformMasterMaterial(body as MasterMaterial, auditActorFromRequest(request));
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
        if (!requirePlatformAdmin(request, reply)) return;
        const body = MaterialBodySchema.partial().parse(request.body);
        const updated = await updatePlatformMasterMaterial(
          request.params.id,
          body as Partial<MasterMaterial>,
          auditActorFromRequest(request)
        );
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
        if (!requirePlatformAdmin(request, reply)) return;
        const ok = await deletePlatformMasterMaterial(request.params.id, auditActorFromRequest(request));
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
        if (!requirePlatformAdmin(request, reply)) return;
        const body = z.array(MaterialBodySchema).parse(request.body);
        const materials = await replacePlatformMasterMaterials(
          body as MasterMaterial[],
          auditActorFromRequest(request)
        );
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
      if (!requirePlatformAdmin(request, reply)) return;
      const ref = await buildMasterDataReferenceFromDb();
      const masterDataVersion = await getMasterDataVersion();
      return reply.send({ ...enrichMasterDataReference(ref), masterDataVersion });
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
      if (!requirePlatformAdmin(request, reply)) return;
      const category = ReferenceCategorySchema.parse(request.params.category);
      const items = z.array(ReferenceItemSchema).parse(request.body);
      const saved = await replacePlatformReferenceCategory(
        category,
        items,
        auditActorFromRequest(request)
      );
      const sync =
        category === 'product_type' || category === 'printing_web' || category === 'rm_type'
          ? await afterPlatformMutation()
          : { tenantsSynced: 0, inserted: 0, updated: 0, orphans: 0, pruned: 0, templatesRelinked: 0 };
      return reply.send({ items: saved, sync });
    } catch (error) {
      if (error instanceof ReferenceItemInUseError) {
        return reply.status(409).send({
          error: error.message,
          code: error.code,
          materialCount: error.materialCount,
        });
      }
      if (error instanceof Error && error.message.includes('Duplicate reference codes')) {
        return reply.status(400).send({ error: error.message });
      }
      console.error('Save platform reference category error:', error);
      return reply.status(500).send({ error: 'Failed to save reference list' });
    }
  });

  fastify.patch<{ Body: { cleaningSolventKgPerJob: number } }>(
    '/api/v1/platform/master-data/costing-defaults',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        if (!requirePlatformAdmin(request, reply)) return;
        const cleaningSolventKgPerJob = z.coerce
          .number()
          .nonnegative()
          .parse(request.body.cleaningSolventKgPerJob);
        const result = await updateCostingDefaults(cleaningSolventKgPerJob, auditActorFromRequest(request));
        return reply.send(result);
      } catch (error) {
        console.error('Update costing defaults error:', error);
        return reply.status(500).send({ error: 'Failed to update costing defaults' });
      }
    }
  );

  fastify.post('/api/v1/platform/master-data/sync-tenants', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (!requirePlatformAdmin(request, reply)) return;
      const sync = await syncPlatformMasterToAllTenants({ pruneOrphans: true });
      return reply.send(sync);
    } catch (error) {
      console.error('Manual tenant sync error:', error);
      return reply.status(500).send({ error: 'Failed to sync tenants' });
    }
  });

  fastify.get<{ Querystring: { since_version?: string; include_snapshot?: string } }>(
    '/api/v1/platform/master-data/changes',
    async (request, reply) => {
      try {
        const auth = await authenticateMasterDataReader(request, reply);
        if (!auth) return;

        if (auth.kind === 'service_key') {
          const limit = checkRateLimit(`svc:${auth.keyId}`, 120, 60_000);
          if (!limit.allowed) {
            reply.header('Retry-After', String(Math.ceil((limit.retryAfterMs ?? 60_000) / 1000)));
            return reply.status(429).send({ error: 'Rate limit exceeded for service key' });
          }
        }

        const sinceVersion = Math.max(0, Number(request.query.since_version ?? 0) || 0);
        const includeSnapshot = request.query.include_snapshot === 'true';
        const currentVersion = await getMasterDataVersion();
        const changes = await listMasterDataChangesSince(sinceVersion);

        if (auth.kind === 'service_key') {
          await appendMasterAuditEntry({
            masterDataVersion: currentVersion,
            entityType: 'reference_item',
            entityKey: 'change_feed',
            action: 'update',
            afterJson: { sinceVersion, changeCount: changes.length, includeSnapshot },
            actor: { type: 'service_key', id: auth.keyId },
          });
        }

        const payload: Record<string, unknown> = {
          currentVersion,
          sinceVersion,
          changes,
        };
        if (includeSnapshot) {
          payload.snapshot = {
            materials: await listPlatformMasterMaterials(),
            reference: await buildMasterDataReferenceFromDb(),
          };
        }
        return reply.send(payload);
      } catch (error) {
        console.error('Master data change feed error:', error);
        return reply.status(500).send({ error: 'Failed to load master data changes' });
      }
    }
  );

  fastify.get('/api/v1/platform/service-keys', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (!requirePlatformAdmin(request, reply)) return;
      const keys = await listPlatformServiceKeys();
      return reply.send(keys);
    } catch (error) {
      console.error('List service keys error:', error);
      return reply.status(500).send({ error: 'Failed to list service keys' });
    }
  });

  fastify.post<{ Body: { label: string; scopes?: string[]; expiresAt?: string | null } }>(
    '/api/v1/platform/service-keys',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        if (!requirePlatformAdmin(request, reply)) return;
        const { label, scopes, expiresAt } = request.body ?? {};
        if (!label?.trim()) {
          return reply.status(400).send({ error: 'label is required' });
        }
        const created = await createPlatformServiceKey({
          label: label.trim(),
          scopes,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        });
        return reply.status(201).send({
          ...created.key,
          plainKey: created.plainKey,
          warning: 'Store plainKey now — it cannot be retrieved again.',
        });
      } catch (error) {
        console.error('Create service key error:', error);
        return reply.status(500).send({ error: 'Failed to create service key' });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/platform/service-keys/:id',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        if (!requirePlatformAdmin(request, reply)) return;
        const ok = await revokePlatformServiceKey(request.params.id);
        if (!ok) return reply.status(404).send({ error: 'Service key not found' });
        return reply.send({ ok: true });
      } catch (error) {
        console.error('Revoke service key error:', error);
        return reply.status(500).send({ error: 'Failed to revoke service key' });
      }
    }
  );
}
