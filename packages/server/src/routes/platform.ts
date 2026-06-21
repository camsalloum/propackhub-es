import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { extractUserFromRequest } from '../utils/auth';
import { getMasterMaterialsList } from '../db/seed-materials';

function requireMasterDataAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  const user = extractUserFromRequest(request);
  if (user.role !== 'tenant_admin' && user.role !== 'platform_admin') {
    reply.status(403).send({ error: 'Admin only' });
    return false;
  }
  return true;
}

export async function registerPlatformRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/platform/master-materials', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (!requireMasterDataAdmin(request, reply)) return;
      return reply.send(await getMasterMaterialsList());
    } catch (error) {
      console.error('Get master materials error:', error);
      return reply.status(500).send({ error: 'Failed to load master library' });
    }
  });

  /** @deprecated Use /api/v1/platform/master-data/materials */
  fastify.put('/api/v1/platform/master-materials', async (_request, reply) => {
    return reply.status(410).send({
      error: 'Use Master Data page — PUT /api/v1/platform/master-data/materials',
    });
  });
}
