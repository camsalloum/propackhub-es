import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { eq } from 'drizzle-orm';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { enrichMasterDataReference } from '../utils/master-data-normalize';
import {
  buildMasterDataReferenceForTenant,
  replaceTenantReferenceCategory,
  isTenantExtensibleCategory,
  listTenantOwnReference,
  TENANT_EXTENSIBLE_CATEGORIES,
} from '../db/tenant-reference-data';
import { sendCaughtError } from '../utils/errors';

const ReferenceItemSchema = z.object({
  label: z.string().min(1),
  code: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

/**
 * Who may edit a tenant's own reference data — same rule as materials:
 * group admin (tenant_admin)/platform_admin always; a plain user only on an
 * individual account.
 */
async function canManageTenantReference(tenantId: string, role: string): Promise<boolean> {
  if (role === 'tenant_admin' || role === 'platform_admin') return true;
  const db = getDatabase();
  const [tenant] = await db
    .select({ type: schema.tenants.type })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));
  return tenant?.type === 'individual';
}

export function registerMasterDataRoutes(fastify: FastifyInstance) {
  // Tenant-facing reference = owner defaults merged with this tenant's overlay.
  fastify.get('/api/v1/master-data/reference', async (request, reply) => {
    try {
      await request.jwtVerify();
      const tenantId = extractTenantFromRequest(request);
      const ref = await buildMasterDataReferenceForTenant(tenantId);
      return reply.send(enrichMasterDataReference(ref));
    } catch (error: unknown) {
      return sendCaughtError(reply, error, 'Failed to load master data reference', 'Get master data reference error:');
    }
  });

  // A tenant's OWN custom reference rows (excludes owner defaults) for editing.
  fastify.get('/api/v1/master-data/reference/custom', async (request, reply) => {
    try {
      await request.jwtVerify();
      const tenantId = extractTenantFromRequest(request);
      const own = await listTenantOwnReference(tenantId);
      return reply.send({ categories: own, editable: [...TENANT_EXTENSIBLE_CATEGORIES] });
    } catch (error: unknown) {
      return sendCaughtError(reply, error, 'Failed to load custom reference', 'Get tenant custom reference error:');
    }
  });

  // Tenant adds/edits its own reference rows for one category (Class A + units).
  fastify.put<{ Params: { category: string }; Body: z.infer<typeof ReferenceItemSchema>[] }>(
    '/api/v1/master-data/reference/:category',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const tenantId = extractTenantFromRequest(request);
        const user = extractUserFromRequest(request);

        const category = request.params.category;
        if (!isTenantExtensibleCategory(category)) {
          return reply.status(400).send({
            error: `"${category}" cannot be customised. Editable categories: ${[...TENANT_EXTENSIBLE_CATEGORIES].join(', ')}.`,
          });
        }
        if (!(await canManageTenantReference(tenantId, user.role))) {
          return reply.status(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'Only your group administrator can change reference data.',
            },
          });
        }

        const items = z.array(ReferenceItemSchema).parse(request.body);
        const saved = await replaceTenantReferenceCategory(tenantId, category, items);
        const ref = await buildMasterDataReferenceForTenant(tenantId);
        return reply.send({ items: saved, reference: enrichMasterDataReference(ref) });
      } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    return sendCaughtError(reply, error, 'Failed to save reference list', 'Save tenant reference category error:');
  }
    }
  );
}
