import { FastifyInstance } from 'fastify';
import { buildMasterDataReferenceFromDb } from '../db/platform-master-data';
import { enrichMasterDataReference } from '../utils/master-data-normalize';

export function registerMasterDataRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/master-data/reference', async (request, reply) => {
    try {
      await request.jwtVerify();
      const ref = await buildMasterDataReferenceFromDb();
      return reply.send(enrichMasterDataReference(ref));
    } catch (error: unknown) {
      if ((error as { statusCode?: number })?.statusCode === 401) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      console.error('Get master data reference error:', error);
      return reply.status(500).send({ error: 'Failed to load master data reference' });
    }
  });
}
