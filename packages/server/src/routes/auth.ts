import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  getDatabase,
  isTransientDatabaseError,
  resetDatabaseConnection,
  schema,
} from '../db';
import { hashPassword, verifyPassword, TokenPayload } from '../utils/auth';
import { eq } from 'drizzle-orm';
import { seedMaterialsForTenant } from '../db/seed-materials';
import { seedTemplatesForTenant } from '../db/seed-templates';
import { ensureCategoriesForTenant } from '../db/seed-categories';
import { ensureSlabTemplatesForTenant } from '../db/seed-slab-templates';
import { fetchExchangeRate } from '../utils/fx-rates';
import { getEffectiveProfile } from '../utils/visibility';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  tenantName: z.string().min(2),
  tenantType: z.enum(['individual', 'company']).default('individual'),
  displayCurrency: z.string().length(3).default('USD'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function registerRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof RegisterSchema> }>,
  reply: FastifyReply
) {
  try {
    const { email, password, displayName, tenantName, tenantType, displayCurrency } = 
      RegisterSchema.parse(request.body);

    const db = getDatabase();

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return reply.status(409).send({ error: 'User already exists' });
    }

    // Fetch current exchange rate for display currency
    let exchangeRate = 1.0;
    try {
      exchangeRate = await fetchExchangeRate(displayCurrency);
    } catch (error) {
      console.error('Failed to fetch FX rate, using 1.0:', error);
      // Continue with default rate
    }

    // Create tenant with fetched exchange rate
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: tenantName,
        type: tenantType,
        // Default M&O method by tenant type: company → per-kg process cost, individual → markup over RM.
        operatingCostMethod: tenantType === 'company' ? 'process_per_kg' : 'markup_over_rm',
        displayCurrency,
        exchangeRateUsdToDisplay: exchangeRate.toString(),
        useAutoFx: true, // Enable auto-refresh by default
      })
      .returning();

    if (!tenant) {
      return reply.status(500).send({ error: 'Failed to create tenant' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with tenant_admin role (first user)
    const [user] = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email,
        passwordHash,
        displayName,
        role: 'tenant_admin', // First user is always admin
      })
      .returning({ id: schema.users.id, tenantId: schema.users.tenantId, email: schema.users.email, role: schema.users.role });

    if (!user) {
      return reply.status(500).send({ error: 'Failed to create user' });
    }

    // Seed master materials library for new tenant
    try {
      await seedMaterialsForTenant(tenant.id);
    } catch (seedError) {
      console.error('Failed to seed materials, but tenant/user created:', seedError);
      // Continue - user can add materials manually
    }

    // Seed structure templates for new tenant (depends on materials being seeded first)
    try {
      await seedTemplatesForTenant(tenant.id);
    } catch (seedError) {
      console.error('Failed to seed templates, but tenant/user/materials created:', seedError);
    }

    try {
      await ensureCategoriesForTenant(tenant.id);
      await ensureSlabTemplatesForTenant(tenant.id);
    } catch (seedError) {
      console.error('Failed to seed categories/slab templates:', seedError);
    }

    // Generate JWT token
    const token = fastify.jwt.sign({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    return reply.status(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Register error:', error);
    return reply.status(500).send({ error: 'Registration failed' });
  }
}

export async function loginRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof LoginSchema> }>,
  reply: FastifyReply
) {
  try {
    const { email, password } = LoginSchema.parse(request.body);

    const loadUserAndTenant = async () => {
      const db = getDatabase();

      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (!user) {
        return { user: null, tenant: null };
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return { user: null, tenant: null };
      }

      const [tenant] = await db
        .select()
        .from(schema.tenants)
        .where(eq(schema.tenants.id, user.tenantId))
        .limit(1);

      return { user, tenant: tenant ?? null };
    };

    let user: Awaited<ReturnType<typeof loadUserAndTenant>>['user'] = null;
    let tenant: Awaited<ReturnType<typeof loadUserAndTenant>>['tenant'] = null;

    try {
      ({ user, tenant } = await loadUserAndTenant());
    } catch (error) {
      if (!isTransientDatabaseError(error)) throw error;

      fastify.log.warn(
        { err: error },
        'Transient DB failure during login. Resetting DB pool and retrying once.'
      );

      await resetDatabaseConnection();
      ({ user, tenant } = await loadUserAndTenant());
    }

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    if (!tenant) {
      return reply.status(500).send({ error: 'Tenant not found for user' });
    }

    // Generate JWT token
    const token = fastify.jwt.sign({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        displayCurrency: tenant.displayCurrency,
        operatingCostMethod: tenant.operatingCostMethod,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Login error:', error);
    return reply.status(500).send({ error: 'Login failed' });
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

    // Get full user and tenant info
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
        operatingCostMethod: tenantData.operatingCostMethod,
      },
    });
  } catch (error) {
    console.error('Me route error:', error);
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function registerAuthRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: z.infer<typeof RegisterSchema> }>(
    '/api/v1/auth/register',
    async (request, reply) => registerRoute(fastify, request, reply)
  );

  fastify.post<{ Body: z.infer<typeof LoginSchema> }>(
    '/api/v1/auth/login',
    async (request, reply) => loginRoute(fastify, request, reply)
  );

  fastify.get('/api/v1/auth/me', async (request, reply) => meRoute(fastify, request, reply));

  // NOTE: ES and PEBI are separate products with separate users and separate licenses.
  // No cross-app navigation, no SSO. This route is intentionally disabled (PEBI_SSO_URL not set).
  // Kept as a stub in case platform-level entitlement checks are needed in the future.
  fastify.get('/api/v1/auth/sso/pebi', async (_request, reply) => {
    const baseUrl = process.env.PEBI_SSO_URL || '';
    const returnUrl = process.env.ES_PUBLIC_URL || process.env.CORS_ORIGIN || 'http://localhost:5000';
    if (!baseUrl) {
      return reply.send({ enabled: false, url: null });
    }
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}return_url=${encodeURIComponent(returnUrl)}`;
    return reply.send({ enabled: true, url });
  });
}
