import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { hashPassword, verifyPassword, TokenPayload } from '../utils/auth';
import { eq, and } from 'drizzle-orm';
import { seedMaterialsForTenant } from '../db/seed-materials';
import { seedTemplatesForTenant } from '../db/seed-templates';
import { fetchExchangeRate } from '../utils/fx-rates';

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
      // Continue - templates are optional
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

    const db = getDatabase();

    // Find user
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Get tenant info
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, user.tenantId))
      .limit(1);

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
  fastify: FastifyInstance,
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
      },
      tenant: {
        id: tenantData.id,
        name: tenantData.name,
        displayCurrency: tenantData.displayCurrency,
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
}
