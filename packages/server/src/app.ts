import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { registerAuthRoutes } from './routes/auth';
import { registerMaterialRoutes } from './routes/materials';
import { registerEstimateRoutes } from './routes/estimates';
import { registerCustomerRoutes } from './routes/customers';
import { registerSettingsRoutes } from './routes/settings';
import { registerTemplateRoutes } from './routes/templates';
import { registerUserRoutes } from './routes/users';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerPlatformRoutes } from './routes/platform';
import { registerCategoryRoutes } from './routes/categories';
import { registerMasterDataRoutes } from './routes/master-data';
import { registerPlatformMasterDataRoutes } from './routes/platform-master-data';

export type BuildAppOptions = {
  jwtSecret?: string;
  corsOrigin?: string;
  logger?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const jwtSecret = options.jwtSecret ?? process.env.JWT_SECRET ?? 'dev-secret-key-change-in-production';
  const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN ?? 'http://localhost:5000';
  const logger = options.logger ?? false;

  const fastify = Fastify({
    logger: logger ? { level: process.env.LOG_LEVEL || 'info' } : false,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await fastify.register(cors, {
    origin: corsOrigin,
    credentials: true,
  });

  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: '7d',
    },
  });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
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
  registerCustomerRoutes(fastify);
  registerSettingsRoutes(fastify);
  registerTemplateRoutes(fastify);
  registerUserRoutes(fastify);
  registerDashboardRoutes(fastify);
  registerPlatformRoutes(fastify);
  registerCategoryRoutes(fastify);
  registerMasterDataRoutes(fastify);
  registerPlatformMasterDataRoutes(fastify);

  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);

    if (error.statusCode === 401) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (error.statusCode === 403) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    if (error.statusCode === 415) {
      return reply.status(415).send({ error: 'Content-Type must be application/json' });
    }

    return reply.status(500).send({ error: 'Internal server error' });
  });

  return fastify;
}
