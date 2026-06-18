import 'dotenv/config';
import { initializeDatabase, closeDatabase } from './db';
import { seedDefaultAdmin } from './db/seed-admin';
import { buildApp } from './app';

const PORT = parseInt(process.env.PORT || '5001');
const HOST = process.env.HOST || '0.0.0.0';

const fastify = await buildApp({ logger: true });

async function start() {
  try {
    await initializeDatabase();
    await seedDefaultAdmin();
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
