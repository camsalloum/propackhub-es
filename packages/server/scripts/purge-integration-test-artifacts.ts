/**
 * One-time cleanup: remove integration-test pollution from Postgres
 * (APT/TB templates, test tenants, example.com users).
 *
 * Usage:
 *   npm run db:purge-integration-artifacts
 *   npm run db:purge-integration-artifacts -- --force   # production
 */
import 'dotenv/config';
import { initializeDatabase, closeDatabase, getDatabase } from '../src/db';
import { purgeIntegrationArtifacts } from '../src/test/purge-integration-artifacts';
import { databaseUrl } from '../src/test/require-database';

const FORCE = process.argv.includes('--force') || process.env.FORCE === '1';

async function main() {
  const url = databaseUrl();
  if (!url) {
    console.error('✗ DATABASE_URL is not set');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && !FORCE) {
    console.error('✗ Refusing to purge in production without --force');
    process.exit(1);
  }

  console.log(`Purging integration-test artifacts from ${url.replace(/:[^:@/]+@/, ':***@')}`);

  await initializeDatabase();
  const db = getDatabase();
  const result = await purgeIntegrationArtifacts(db, { allKnownPatterns: true });

  console.log('Done:');
  console.log(`  platform_standard_templates: ${result.platformTemplates}`);
  console.log(`  structure_templates:       ${result.structureTemplates}`);
  console.log(`  tenants:                   ${result.tenants}`);

  await closeDatabase();
}

main().catch((err) => {
  console.error('✗ Purge failed:', err);
  process.exit(1);
});
