import { FastifyInstance } from 'fastify';
import { readFileSync, existsSync } from 'node:fs';
import {
  readMasterDataReference,
  resolveMasterDataReferencePath,
  resolveMasterDataExcelPath,
} from '../db/master-materials-io';
import { enrichMasterDataReference } from '../utils/master-data-normalize';

function readReferenceFromDisk() {
  const jsonPath = resolveMasterDataReferencePath();
  if (existsSync(jsonPath)) {
    return JSON.parse(readFileSync(jsonPath, 'utf8'));
  }
  return readMasterDataReference(resolveMasterDataExcelPath());
}

export function registerMasterDataRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/master-data/reference', async (request, reply) => {
    try {
      await request.jwtVerify();
      const ref = readReferenceFromDisk();
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
