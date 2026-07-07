/**
 * Sync PEBI CRM customers into the linked ES company tenant.
 *
 * Usage:
 *   npm run db:sync-customers-pebi --workspace=packages/server
 *
 * Env (pick one path):
 *   PEBI_DATABASE_URL=postgresql://...@localhost:5432/fp_database
 *   — or —
 *   PEBI_API_URL=http://localhost:3001
 *   PEBI_ES_INTEGRATION_SECRET=...
 */
import 'dotenv/config';
import { initializeDatabase, closeDatabase } from '../src/db/index.js';
import { syncCustomersForPlatformCompany } from '../src/services/pebi-customer-sync.js';

const COMPANY_CODE = process.env.INTERPLAST_PLATFORM_COMPANY_CODE?.trim() || 'interplast';

async function main() {
  await initializeDatabase();
  const result = await syncCustomersForPlatformCompany(COMPANY_CODE);
  console.log(JSON.stringify(result, null, 2));
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
