import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { extractUserFromRequest } from '../utils/auth';
import { getMasterMaterialsList } from '../db/seed-materials';

const MasterMaterialSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['substrate', 'ink', 'adhesive']),
  solidPercent: z.number(),
  density: z.number(),
  costPerKgUsd: z.number(),
  wastePercent: z.number(),
  isSolventBased: z.boolean(),
});

function resolveSeedPath(): string {
  const candidates = [
    resolve(process.cwd(), 'src/db/master-materials-seed.json'),
    resolve(process.cwd(), 'packages/server/src/db/master-materials-seed.json'),
  ];
  for (const p of candidates) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error('master-materials-seed.json not found');
}

function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  const user = extractUserFromRequest(request);
  if (user.role !== 'platform_admin') {
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
      return reply.send(getMasterMaterialsList());
    } catch (error) {
      console.error('Get master materials error:', error);
      return reply.status(500).send({ error: 'Failed to load master library' });
    }
  });

  fastify.put<{ Body: z.infer<typeof MasterMaterialSchema>[] }>(
    '/api/v1/platform/master-materials',
    async (request, reply) => {
      try {
        await request.jwtVerify();
        if (!requirePlatformAdmin(request, reply)) return;
        const parsed = z.array(MasterMaterialSchema).parse(request.body);
        writeFileSync(resolveSeedPath(), JSON.stringify(parsed, null, 2) + '\n', 'utf8');
        return reply.send({ ok: true, count: parsed.length });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation failed', details: error.errors });
        }
        console.error('Update master materials error:', error);
        return reply.status(500).send({ error: 'Failed to update master library' });
      }
    }
  );
}
