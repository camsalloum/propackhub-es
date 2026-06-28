import 'dotenv/config';
import { initializeDatabase, closeDatabase } from './db';
import { seedDefaultAdmin } from './db/seed-admin';
import { ensurePlatformMasterSeeded, ensureProcessesSeeded, ensureSolventCatalogSeeded, ensureLaminationAdhesivesSeeded } from './db/platform-master-data';
import { bootstrapPlatformStandardCatalog } from './db/seed-platform-templates';
import { buildApp } from './app';

const PORT = parseInt(process.env.PORT || '5001');
const HOST = process.env.HOST || '0.0.0.0';

const fastify = await buildApp({ logger: true });

async function start() {
  try {
    await initializeDatabase();
    await ensurePlatformMasterSeeded();
    await ensureProcessesSeeded();
    await ensureSolventCatalogSeeded();
    await ensureLaminationAdhesivesSeeded();
    await seedDefaultAdmin();
    try {
      await bootstrapPlatformStandardCatalog();
    } catch (err) {
      // Boot must not fail if the platform_standard_templates table doesn't
      // exist yet (e.g. dev environments that haven't run migrations).
      console.warn('⚠  bootstrapPlatformStandardCatalog skipped:', (err as Error).message);
    }
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
