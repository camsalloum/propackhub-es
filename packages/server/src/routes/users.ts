import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { and, eq } from 'drizzle-orm';
import { getEffectiveProfile, DEFAULT_SALES_REP_PROFILE, DEFAULT_ADMIN_PROFILE } from '../utils/visibility';
import type { VisibilityProfile } from '@es/engine';

const VisibilityProfileSchema = z.record(z.boolean()) as unknown as z.ZodType<VisibilityProfile>;

const PatchUserVisibilitySchema = z.object({
  visibilityProfile: VisibilityProfileSchema,
});

function normalizeVisibilityProfile(role: string, profile?: VisibilityProfile): VisibilityProfile {
  const base = role === 'tenant_admin' || role === 'platform_admin' ? DEFAULT_ADMIN_PROFILE : DEFAULT_SALES_REP_PROFILE;
  return { ...base, ...(profile ?? {}) };
}

async function getTenantUsersRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    const users = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.tenantId, tenantId))
      .orderBy(schema.users.displayName);

    return reply.send({
      users: users.map((user: (typeof users)[number]) => ({
        ...user,
        visibilityProfile: getEffectiveProfile(user.role, user.visibilityProfile),
      })),
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return reply.status(500).send({ error: 'Failed to fetch users' });
  }
}

async function updateUserVisibilityRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof PatchUserVisibilitySchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const requester = extractUserFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    if (requester.role !== 'tenant_admin' && requester.role !== 'platform_admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const [targetUser] = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.tenantId, tenantId)));

    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const normalized = normalizeVisibilityProfile(targetUser.role, request.body.visibilityProfile);

    const [updated] = await db
      .update(schema.users)
      .set({
        visibilityProfile: normalized,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.users.id, id), eq(schema.users.tenantId, tenantId)))
      .returning();

    return reply.send({
      ...updated,
      visibilityProfile: getEffectiveProfile(updated.role, updated.visibilityProfile),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update user visibility error:', error);
    return reply.status(500).send({ error: 'Failed to update user visibility' });
  }
}

export async function registerUserRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/users', async (request, reply) => getTenantUsersRoute(fastify, request, reply));
  fastify.patch<{ Params: { id: string }; Body: z.infer<typeof PatchUserVisibilitySchema> }>(
    '/api/v1/users/:id/visibility',
    async (request, reply) => updateUserVisibilityRoute(fastify, request, reply)
  );

  // D5: Visibility presets (3 named profiles)
  fastify.get('/api/v1/visibility-presets', async (_request, reply) => {
    return reply.send({
      admin: { name: 'Admin (Full Access)', profile: DEFAULT_ADMIN_PROFILE },
      sales_rep: { name: 'Sales Rep (Selling Price Only)', profile: DEFAULT_SALES_REP_PROFILE },
      read_only: {
        name: 'Read Only (View Only)',
        profile: {
          ...DEFAULT_SALES_REP_PROFILE,
          slabTable: false,
          proposalPdf: false,
          alternatePriceUnits: false,
        },
      },
    });
  });
}
