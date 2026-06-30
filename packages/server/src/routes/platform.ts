import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { extractUserFromRequest, isPlatformAdmin } from '../utils/auth';
import { getMasterMaterialsList } from '../db/seed-materials';

// The platform master catalog is the app owner's global source of truth.
function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  const user = extractUserFromRequest(request);
  if (!isPlatformAdmin(user.role)) {
    reply.status(403).send({ error: 'Platform admin only' });
    return false;
  }
  return true;
}

export async function registerPlatformRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/platform/master-materials', async (request, reply) => {
    try {
      await request.jwtVerify();
      if (!requirePlatformAdmin(request, reply)) return;
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
