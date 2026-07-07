import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { sendCaughtError } from '../utils/errors';
import { syncCustomersFromPebiForTenant } from '../services/pebi-customer-sync';
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

export async function registerIntegrationRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/integration/pebi/sync-customers', syncPebiCustomersRoute);
  fastify.post('/api/v1/integration/pebi/push-quote/:id/mes', pushQuoteToMesRoute);
}
