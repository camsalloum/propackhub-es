import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { sendCaughtError } from '../utils/errors';
import { verifyPebiIntegrationRequest } from '../utils/pebi-integration-auth';
import { syncCustomersFromPebiForTenant } from '../services/pebi-customer-sync';
import {
  getMaterialsMissingForTenant,
  syncAllPebiMaterialsFromPebiForTenant,
  syncFamilyMaterialsFromPebiForTenant,
  PEBI_SYNC_FAMILIES,
  type PebiSyncFamily,
} from '../services/pebi-material-sync';
import {
  handlePebiOraclePush,
  type PebiOraclePushSource,
} from '../services/pebi-oracle-sync-coordinator';
import { pushQuoteToPebiMes } from '../services/pebi-mes-intake';

async function syncPebiCustomersRoute(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const requester = extractUserFromRequest(request);
    if (requester.role !== 'tenant_admin' && requester.role !== 'platform_admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const [tenant] = await db
      .select({ platformCompanyCode: schema.tenants.platformCompanyCode })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (!tenant?.platformCompanyCode) {
      return reply.status(400).send({
        error: 'Tenant is not linked to PEBI (missing platform_company_code)',
      });
    }

    const result = await syncCustomersFromPebiForTenant(tenantId);
    return reply.send(result);
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Customer sync failed', 'PEBI customer sync:');
  }
}

async function pushQuoteToMesRoute(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const requester = extractUserFromRequest(request);
    if (requester.role !== 'tenant_admin' && requester.role !== 'platform_admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const tenantId = extractTenantFromRequest(request);
    const result = await pushQuoteToPebiMes(tenantId, request.params.id);
    return reply.send(result);
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'MES push failed', 'PEBI MES push:');
  }
}

async function syncPebiMaterialsRoute(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const requester = extractUserFromRequest(request);
    if (requester.role !== 'tenant_admin' && requester.role !== 'platform_admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const [tenant] = await db
      .select({ platformCompanyCode: schema.tenants.platformCompanyCode })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (!tenant?.platformCompanyCode) {
      return reply.status(400).send({
        error: 'Tenant is not linked to PEBI (missing platform_company_code)',
      });
    }

    const familyParam = String((request.query as { family?: string })?.family ?? '').trim().toUpperCase();

    if (familyParam && !PEBI_SYNC_FAMILIES.includes(familyParam as PebiSyncFamily)) {
      return reply.status(400).send({
        error: `Unsupported family ${familyParam} — use ${PEBI_SYNC_FAMILIES.join(', ')} or omit for all`,
      });
    }

    if (familyParam) {
      const result = await syncFamilyMaterialsFromPebiForTenant(
        tenantId,
        familyParam as PebiSyncFamily
      );
      return reply.send(result);
    }

    const results = await syncAllPebiMaterialsFromPebiForTenant(tenantId);
    return reply.send({ families: results });
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Material sync failed', 'PEBI material sync:');
  }
}

async function pebiOraclePushRoute(
  request: FastifyRequest<{ Body: { source?: PebiOraclePushSource } }>,
  reply: FastifyReply
) {
  const ctx = await verifyPebiIntegrationRequest(request);
  if (!ctx) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const source = request.body?.source ?? 'both';
  if (source !== 'rm' && source !== 'oracle' && source !== 'both') {
    return reply.status(400).send({ error: 'source must be rm, oracle, or both' });
  }

  try {
    const result = await handlePebiOraclePush(ctx.companyCode, source);
    return reply.send(result);
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Oracle push sync failed', 'PEBI oracle-push:');
  }
}

export async function registerIntegrationRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/integration/pebi/sync-customers', syncPebiCustomersRoute);
  fastify.post('/api/v1/integration/pebi/sync-materials', syncPebiMaterialsRoute);
  fastify.get('/api/v1/integration/pebi/missing-materials', async (request, reply) => {
    try {
      await request.jwtVerify();
      const requester = extractUserFromRequest(request);
      if (requester.role !== 'tenant_admin' && requester.role !== 'platform_admin') {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const family = String((request.query as { family?: string })?.family ?? 'PET').toUpperCase();
      if (!PEBI_SYNC_FAMILIES.includes(family as PebiSyncFamily)) {
        return reply.status(400).send({
          error: `missing-materials supports ${PEBI_SYNC_FAMILIES.join(', ')} (got ${family})`,
        });
      }

      const tenantId = extractTenantFromRequest(request);
      const result = await getMaterialsMissingForTenant(tenantId, family as PebiSyncFamily);
      return reply.send(result);
    } catch (error: unknown) {
      return sendCaughtError(reply, error, 'Failed to load PEBI missing materials', 'PEBI missing materials:');
    }
  });
  fastify.post('/api/v1/integration/pebi/oracle-push', pebiOraclePushRoute);
  fastify.post('/api/v1/integration/pebi/push-quote/:id/mes', pushQuoteToMesRoute);
}
