import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import cors from '@fastify/cors';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { initializeDatabase, closeDatabase } from './db';
import { registerAuthRoutes } from './routes/auth';
import { registerMaterialRoutes } from './routes/materials';
import { registerEstimateRoutes } from './routes/estimates';
import { registerCustomerRoutes } from './routes/customers';
import { registerSettingsRoutes } from './routes/settings';

const PORT = parseInt(process.env.PORT || '5001');
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5000';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
}).withTypeProvider<TypeBoxTypeProvider>();

// Plugins
await fastify.register(cors, {
  origin: CORS_ORIGIN,
  credentials: true,
});

await fastify.register(fastifyJwt, {
  secret: JWT_SECRET,
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API info
fastify.get('/api/v1', async () => {
  return {
    version: '1.0.0',
    name: 'ProPackHub Estimation Studio API',
    status: 'operational',
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        me: 'GET /api/v1/auth/me',
      },
      materials: {
        list: 'GET /api/v1/materials',
        create: 'POST /api/v1/materials',
        update: 'PATCH /api/v1/materials/:id',
        delete: 'DELETE /api/v1/materials/:id',
      },
      estimates: {
        list: 'GET /api/v1/estimates',
        create: 'POST /api/v1/estimates',
        get: 'GET /api/v1/estimates/:id',
        update: 'PATCH /api/v1/estimates/:id',
        delete: 'DELETE /api/v1/estimates/:id',
        calculate: 'POST /api/v1/estimates/:id/calculate',
        requote: 'POST /api/v1/estimates/:id/requote',
      },
      customers: {
        list: 'GET /api/v1/customers',
        create: 'POST /api/v1/customers',
        get: 'GET /api/v1/customers/:id',
        update: 'PATCH /api/v1/customers/:id',
        delete: 'DELETE /api/v1/customers/:id',
      },
      settings: {
        get: 'GET /api/v1/settings',
        update: 'PATCH /api/v1/settings',
        refreshFx: 'POST /api/v1/settings/refresh-fx',
      },
    },
  };
});

// Register route handlers
registerAuthRoutes(fastify);
registerMaterialRoutes(fastify);
registerEstimateRoutes(fastify);
registerCustomerRoutes(fastify);
registerSettingsRoutes(fastify);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.statusCode === 401) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  if (error.statusCode === 403) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  return reply.status(500).send({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Initialize database
    await initializeDatabase();

    // Listen
    await fastify.listen({ port: PORT, host: HOST });

    console.log(`
╔════════════════════════════════════════════════════════╗
║  ProPackHub Estimation Studio - API Server             ║
╠════════════════════════════════════════════════════════╣
║  ✓ Server listening on http://${HOST}:${PORT}
║  ✓ Database connected
║  ✓ API available at http://${HOST}:${PORT}/api/v1
║  ✓ Health check: http://${HOST}:${PORT}/health
╚════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await closeDatabase();
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await closeDatabase();
  await fastify.close();
  process.exit(0);
});

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});