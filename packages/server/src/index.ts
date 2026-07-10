import 'dotenv/config';
import { initializeDatabase, closeDatabase } from './db';
import { seedDefaultAdmin } from './db/seed-admin';
import { ensurePlatformMasterSeeded, ensureProcessesSeeded, ensureSolventCatalogSeeded, ensureLaminationAdhesivesSeeded, ensurePetSubstratesFromSeed, ensureBoppSubstratesFromSeed, ensureCppSubstratesFromSeed, ensurePaSubstratesFromSeed, ensurePapSubstratesFromSeed, ensureSpecialtySubstratesFromSeed, ensurePeSubstratesFromSeed } from './db/platform-master-data';
import { bootstrapPlatformStandardCatalog } from './db/seed-platform-templates';
import { buildApp } from './app';
import { log } from './utils/logger';
import {
  startPebiOracleSyncCoordinator,
  stopPebiOracleSyncCoordinator,
} from './services/pebi-oracle-sync-coordinator';

const PORT = parseInt(process.env.PORT || '5001');
const HOST = process.env.HOST || '0.0.0.0';

const fastify = await buildApp({ logger: true });

async function start() {
  try {
    await initializeDatabase();
    await ensurePlatformMasterSeeded();
    await ensureProcessesSeeded();
    await ensureSolventCatalogSeeded();
    try {
      await ensureLaminationAdhesivesSeeded();
    } catch (err) {
      log.warn({ err }, 'ensureLaminationAdhesivesSeeded failed — API will still start');
    }
    await ensurePetSubstratesFromSeed();
    await ensureBoppSubstratesFromSeed();
    await ensureCppSubstratesFromSeed();
    await ensurePaSubstratesFromSeed();
    await ensurePapSubstratesFromSeed();
    await ensureSpecialtySubstratesFromSeed();
    await ensurePeSubstratesFromSeed();
    await seedDefaultAdmin();
    try {
      await bootstrapPlatformStandardCatalog();
    } catch (err) {
      // Boot must not fail if the platform_standard_templates table doesn't
      // exist yet (e.g. dev environments that haven't run migrations).
      log.warn({ err }, 'bootstrapPlatformStandardCatalog skipped');
    }
    await fastify.listen({ port: PORT, host: HOST });

    startPebiOracleSyncCoordinator();

    log.info(
      { host: HOST, port: PORT },
      'ProPackHub Estimation Studio API listening'
    );
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, 'shutting down');
  stopPebiOracleSyncCoordinator();
  try {
    await fastify.close();
  } catch (err) {
    log.error({ err }, 'Error closing HTTP server');
  }
  try {
    await closeDatabase();
  } catch (err) {
    log.error({ err }, 'Error closing database');
  }
  process.exit(0);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('uncaughtException', (err) => {
  log.fatal({ err }, 'Uncaught exception — process will exit');
  void shutdown('uncaughtException').finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  log.fatal({ err: reason }, 'Unhandled promise rejection — process will exit');
  void shutdown('unhandledRejection').finally(() => process.exit(1));
});

start().catch((error) => {
  log.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
