import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { getDatabase, schema } from '../db';
import { hashPassword, verifyPassword, TokenPayload } from '../utils/auth';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { seedMaterialsForTenant } from '../db/seed-materials';
import { seedTemplatesForTenant } from '../db/seed-templates';
import { ensureCategoriesForTenant } from '../db/seed-categories';
import { ensureSlabTemplatesForTenant } from '../db/seed-slab-templates';
import { fetchExchangeRate } from '../utils/fx-rates';
import { getEffectiveProfile } from '../utils/visibility';
import { errorBody } from '../utils/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Refresh token TTL: 30 days */
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Generate a cryptographically random refresh token and its SHA-256 hash. */
function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex'); // 64-char hex
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/** Build access + refresh token pair and persist a new session row. */
async function issueTokens(
  fastify: FastifyInstance,
  payload: TokenPayload,
  deviceLabel?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const db = getDatabase();
  const accessToken = fastify.jwt.sign(payload);
  const { token: refreshToken, hash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await db.insert(schema.sessions).values({
    tenantId: payload.tenantId,
    userId: payload.userId,
    refreshTokenHash: hash,
    deviceLabel: deviceLabel ?? 'web',
    expiresAt,
  });

  return { accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  tenantName: z.string().min(2),
  tenantType: z.enum(['individual', 'company']).default('individual'),
  displayCurrency: z.string().length(3).default('USD'),
  deviceLabel: z.string().max(128).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceLabel: z.string().max(128).optional(),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function registerRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof RegisterSchema> }>,
  reply: FastifyReply
) {
  try {
    const { email, password, displayName, tenantName, tenantType, displayCurrency, deviceLabel } =
      RegisterSchema.parse(request.body);

    const db = getDatabase();

    const existingUser = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return reply.status(409).send(errorBody('CONFLICT', 'Email is already registered'));
    }

    let exchangeRate = 1.0;
    try {
      exchangeRate = await fetchExchangeRate(displayCurrency);
    } catch {
      // fallback to 1.0
    }

    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: tenantName,
        type: tenantType,
        displayCurrency,
        exchangeRateUsdToDisplay: exchangeRate.toString(),
        useAutoFx: true,
      })
      .returning();

    if (!tenant) {
      return reply.status(500).send(errorBody('INTERNAL', 'Failed to create tenant'));
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(schema.users)
      .values({ tenantId: tenant.id, email, passwordHash, displayName, role: 'tenant_admin' })
      .returning({ id: schema.users.id, tenantId: schema.users.tenantId, email: schema.users.email, role: schema.users.role });

    if (!user) {
      return reply.status(500).send(errorBody('INTERNAL', 'Failed to create user'));
    }

    // Seed tenant library (non-fatal)
    try { await seedMaterialsForTenant(tenant.id); } catch (e) { console.error('Seed materials failed:', e); }
    try { await seedTemplatesForTenant(tenant.id); } catch (e) { console.error('Seed templates failed:', e); }
    try { await ensureCategoriesForTenant(tenant.id); await ensureSlabTemplatesForTenant(tenant.id); } catch (e) { console.error('Seed categories/slabs failed:', e); }

    const payload: TokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = await issueTokens(fastify, payload, deviceLabel);

    return reply.status(201).send({
      token: accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayName, role: user.role },
      tenant: { id: tenant.id, name: tenant.name },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(errorBody('VALIDATION', 'Validation failed', error.errors));
    }
    console.error('Register error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Registration failed'));
  }
}

export async function loginRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof LoginSchema> }>,
  reply: FastifyReply
) {
  try {
    const { email, password, deviceLabel } = LoginSchema.parse(request.body);

    const db = getDatabase();

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    // Constant-time failure: always verify even if user not found (prevents user enumeration)
    const dummyHash = '$2a$10$placeholder.for.timing.attack.prevention.xxxxxxxxxx';
    const isValid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, dummyHash).then(() => false).catch(() => false);

    if (!user || !isValid) {
      return reply.status(401).send(errorBody('AUTH_REQUIRED', 'Invalid credentials'));
    }

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, user.tenantId))
      .limit(1);

    const payload: TokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } = await issueTokens(fastify, payload, deviceLabel);

    return reply.send({
      token: accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        displayCurrency: tenant.displayCurrency,
        exchangeRateUsdToDisplay: tenant.exchangeRateUsdToDisplay,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(errorBody('VALIDATION', 'Validation failed', error.errors));
    }
    console.error('Login error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Login failed'));
  }
}

/**
 * POST /auth/refresh — validate refresh token, rotate it, return new access + refresh pair.
 * Body: { refreshToken: string }
 */
export async function refreshRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof RefreshSchema> }>,
  reply: FastifyReply
) {
  try {
    const { refreshToken } = RefreshSchema.parse(request.body);
    const hash = createHash('sha256').update(refreshToken).digest('hex');

    const db = getDatabase();
    const now = new Date();

    const [session] = await db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.refreshTokenHash, hash),
          isNull(schema.sessions.revokedAt),
          // expiresAt > now  (not expired)
        )
      )
      .limit(1);

    if (!session || session.expiresAt < now) {
      // Revoke the session if found-but-expired to clean up
      if (session) {
        await db
          .update(schema.sessions)
          .set({ revokedAt: now })
          .where(eq(schema.sessions.id, session.id));
      }
      return reply.status(401).send(errorBody('AUTH_EXPIRED', 'Refresh token expired or revoked'));
    }

    // Look up current user to get fresh role/status
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    if (!user) {
      return reply.status(401).send(errorBody('AUTH_EXPIRED', 'User no longer exists'));
    }

    // Rotate: revoke old session, issue new pair
    await db
      .update(schema.sessions)
      .set({ revokedAt: now })
      .where(eq(schema.sessions.id, session.id));

    const payload: TokenPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken: newRefreshToken } = await issueTokens(
      fastify,
      payload,
      session.deviceLabel ?? undefined
    );

    return reply.send({ token: accessToken, refreshToken: newRefreshToken });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(errorBody('VALIDATION', 'Validation failed', error.errors));
    }
    console.error('Refresh error:', error);
    return reply.status(401).send(errorBody('AUTH_EXPIRED', 'Invalid refresh token'));
  }
}

/** POST /auth/logout — revoke the current refresh token (client must also drop access token). */
export async function logoutRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Body: { refreshToken?: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const { refreshToken } = request.body ?? {};

    if (refreshToken) {
      const hash = createHash('sha256').update(refreshToken).digest('hex');
      const db = getDatabase();
      await db
        .update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(eq(schema.sessions.refreshTokenHash, hash));
    }

    return reply.status(204).send();
  } catch {
    return reply.status(204).send(); // Always 204 — don't reveal session state
  }
}

export async function meRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = request.user as TokenPayload;
    const db = getDatabase();

    const [userData] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.userId))
      .limit(1);

    const [tenantData] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, user.tenantId))
      .limit(1);

    if (!userData || !tenantData) {
      return reply.status(401).send(errorBody('AUTH_EXPIRED', 'Session no longer valid'));
    }

    return reply.send({
      user: {
        id: userData.id,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        visibilityProfile: getEffectiveProfile(userData.role, userData.visibilityProfile),
      },
      tenant: {
        id: tenantData.id,
        name: tenantData.name,
        displayCurrency: tenantData.displayCurrency,
      },
    });
  } catch {
    return reply.status(401).send(errorBody('AUTH_EXPIRED', 'Unauthorized'));
  }
}

/** Purge expired+revoked sessions older than 7 days (background housekeeping, called on login). */
async function purgeExpiredSessions(): Promise<void> {
  try {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db
      .delete(schema.sessions)
      .where(lt(schema.sessions.expiresAt, cutoff));
  } catch {
    // Non-fatal
  }
}

export async function registerAuthRoutes(fastify: FastifyInstance) {
  // Phase 2.4: tight rate limit on login + register to prevent brute-force
  fastify.post<{ Body: z.infer<typeof RegisterSchema> }>(
    '/api/v1/auth/register',
    {
      config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    },
    async (request, reply) => registerRoute(fastify, request, reply)
  );

  fastify.post<{ Body: z.infer<typeof LoginSchema> }>(
    '/api/v1/auth/login',
    {
      config: { rateLimit: { max: 20, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      purgeExpiredSessions().catch(() => {});
      return loginRoute(fastify, request, reply);
    }
  );

  // Phase 2.3: refresh accepts body { refreshToken } instead of old Authorization header re-sign
  fastify.post<{ Body: z.infer<typeof RefreshSchema> }>(
    '/api/v1/auth/refresh',
    {
      config: { rateLimit: { max: 60, timeWindow: '15 minutes' } },
    },
    async (request, reply) => refreshRoute(fastify, request, reply)
  );

  fastify.post<{ Body: { refreshToken?: string } }>(
    '/api/v1/auth/logout',
    async (request, reply) => logoutRoute(fastify, request, reply)
  );

  fastify.get('/api/v1/auth/me', async (request, reply) => meRoute(fastify, request, reply));

  fastify.get('/api/v1/auth/sso/pebi', async (_request, reply) => {
    const baseUrl = process.env.PEBI_SSO_URL || '';
    const returnUrl = process.env.ES_PUBLIC_URL || process.env.CORS_ORIGIN || 'http://localhost:5000';
    if (!baseUrl) return reply.send({ enabled: false, url: null });
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}return_url=${encodeURIComponent(returnUrl)}`;
    return reply.send({ enabled: true, url });
  });
}
