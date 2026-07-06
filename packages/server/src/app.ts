import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { ZodError } from 'zod';
import { registerAuthRoutes } from './routes/auth';
import { registerMaterialRoutes } from './routes/materials';
import { registerEstimateRoutes } from './routes/estimates';
import { registerQuoteRoutes } from './routes/quotes';
import { registerCustomerRoutes } from './routes/customers';
import { registerSettingsRoutes } from './routes/settings';
import { registerTemplateRoutes } from './routes/templates';
import { registerAdminPlatformTemplateRoutes } from './routes/admin-platform-templates';
import { registerUserRoutes } from './routes/users';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerPlatformRoutes } from './routes/platform';
import { registerCategoryRoutes } from './routes/categories';
import { registerMasterDataRoutes } from './routes/master-data';
import { registerPlatformMasterDataRoutes } from './routes/platform-master-data';
import { sql } from 'drizzle-orm';
import { AppError, errorBody, isAuthError, isFkViolation } from './utils/errors';
import { getDatabase } from './db';

export type BuildAppOptions = {
  jwtSecret?: string;
  corsOrigin?: string | string[];
  logger?: boolean;
};

// Capacitor native apps use these origins — must be allowed in CORS
const CAPACITOR_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const DEFAULT_DEV_JWT_SECRET = 'dev-secret-key-change-in-production';
  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET ?? DEFAULT_DEV_JWT_SECRET;

  // Refuse to start in production with the public default secret. This secret
  // signs access/refresh tokens AND peppers platform service-key hashes, so a
  // silent fallback would let anyone forge tokens or predict key hashes.
  if (process.env.NODE_ENV === 'production' && jwtSecret === DEFAULT_DEV_JWT_SECRET) {
    throw new Error(
      'JWT_SECRET must be set to a strong, non-default value in production. Refusing to start with the built-in development secret.'
    );
  }

  // Build allowed-origin list: web dev + any extra from env + capacitor native origins
  const envOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5000';
  const extraOrigins: string[] = Array.isArray(options.corsOrigin)
    ? options.corsOrigin
    : options.corsOrigin
      ? [options.corsOrigin]
      : [envOrigin];

  const allowedOrigins = Array.from(
    new Set([...extraOrigins, ...CAPACITOR_ORIGINS])
  );

  const logger = options.logger ?? false;

  const fastify = Fastify({
    logger: logger ? { level: process.env.LOG_LEVEL || 'info' } : false,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (server-to-server, curl) and all allowed origins
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`), false);
      }
    },
    // Bearer tokens in Authorization (not cookies) — credentials not required.
    credentials: false,
  });

  // Baseline browser security headers (CSP left off — API returns JSON, not HTML pages).
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await fastify.register(fastifyCompress, {
    global: true,
    threshold: 1024,
  });

  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      // Phase 2.3: short-lived access tokens (30 min)
      // Refresh via POST /auth/refresh with a long-lived refresh token
      expiresIn: '30m',
    },
  });

  // Phase 2.4: rate limiting — tight on auth endpoints, generous on API
  await fastify.register(fastifyRateLimit, {
    global: false, // opt-in per route or prefix
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, context) =>
      errorBody('RATE_LIMITED', `Too many requests — try again in ${context.after}`),
  });

  // Phase 2.5: OpenAPI at /docs
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'ProPackHub Estimation Studio API',
        description: 'Costing & estimation API for flexible packaging sales',
        version: '1.0.0',
      },
      servers: [{ url: process.env.ES_PUBLIC_URL || 'http://localhost:5001' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

  // Liveness probe
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Readiness probe — checks DB connectivity (Phase 2 §12.6)
  fastify.get('/health/ready', async (_req, reply) => {
    try {
      const db = getDatabase();
      await db.execute(sql`SELECT 1`);
      return reply.send({ status: 'ready', timestamp: new Date().toISOString() });
    } catch {
      return reply.status(503).send({ status: 'not_ready', error: 'DB unreachable' });
    }
  });

  fastify.get('/api/v1', async () => {
    return {
      version: '1.0.0',
      name: 'ProPackHub Estimation Studio API',
      status: 'operational',
    };
  });

  registerAuthRoutes(fastify);
  registerMaterialRoutes(fastify);
  registerEstimateRoutes(fastify);
  registerQuoteRoutes(fastify);
  registerCustomerRoutes(fastify);
  registerSettingsRoutes(fastify);
  registerTemplateRoutes(fastify);
  registerAdminPlatformTemplateRoutes(fastify);
  registerUserRoutes(fastify);
  registerDashboardRoutes(fastify);
  registerPlatformRoutes(fastify);
  registerCategoryRoutes(fastify);
  registerMasterDataRoutes(fastify);
  registerPlatformMasterDataRoutes(fastify);

  // -------------------------------------------------------------------------
  // Central error handler — maps all errors to the standard envelope.
  // Routes still send their own errors for backwards compat but this catches
  // anything that bubbles up uncaught.
  // -------------------------------------------------------------------------
  fastify.setErrorHandler((error, _request, reply) => {
    // AppError — fully typed application error
    if (error instanceof AppError) {
      return reply.status(error.status).send(errorBody(error.code, error.message, error.details));
    }

    // Zod validation error
    if (error instanceof ZodError) {
      return reply.status(400).send(
        errorBody('VALIDATION', 'Request validation failed', error.errors)
      );
    }

    // JWT / auth errors (also covers AppError AUTH_* if not caught above)
    if (isAuthError(error)) {
      const isExpired =
        (error as { code?: string }).code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
        (error as { code?: string }).code === 'FAST_JWT_EXPIRED' ||
        error.message?.toLowerCase().includes('expired');
      return reply.status(401).send(
        errorBody(
          isExpired ? 'AUTH_EXPIRED' : 'AUTH_REQUIRED',
          isExpired ? 'Token expired' : 'Authentication required'
        )
      );
    }

    // Postgres FK violation
    if (isFkViolation(error)) {
      return reply.status(409).send(
        errorBody('FK_IN_USE', 'Resource is referenced and cannot be deleted')
      );
    }

    if (error.statusCode === 403) {
      return reply.status(403).send(errorBody('FORBIDDEN', error.message || 'Forbidden'));
    }

    if (error.statusCode === 404) {
      return reply.status(404).send(errorBody('NOT_FOUND', error.message || 'Not found'));
    }

    if (error.statusCode === 409) {
      return reply.status(409).send(errorBody('CONFLICT', error.message || 'Conflict'));
    }

    if (error.statusCode === 429) {
      return reply.status(429).send(errorBody('RATE_LIMITED', 'Too many requests'));
    }

    if (error.statusCode === 415) {
      return reply.status(415).send(errorBody('VALIDATION', 'Content-Type must be application/json'));
    }

    fastify.log.error(error);
    return reply.status(500).send(errorBody('INTERNAL', 'Internal server error'));
  });

  return fastify;
}
