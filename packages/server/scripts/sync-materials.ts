/**
 * Upsert master materials (from master-materials-seed.json) for every tenant.
 * Usage: npm run db:sync-materials --workspace=packages/server
 */
import 'dotenv/config';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../src/db/index.js';
import { readMasterSeed } from '../src/db/master-materials-io.js';
import { syncMaterialsForTenant } from '../src/db/seed-materials.js';

async function main() {
  await initializeDatabase();
  const db = getDatabase();
  const materials = readMasterSeed();

  const tenants = await db
    .select({ id: schema.tenants.id, name: schema.tenants.name })
    .from(schema.tenants);

  let totalInserted = 0;
  let totalUpdated = 0;

  for (const tenant of tenants) {
    const { inserted, updated } = await syncMaterialsForTenant(tenant.id, materials);
    totalInserted += inserted;
    totalUpdated += updated;
    console.log(`✓ ${tenant.name}: +${inserted} inserted, ${updated} updated`);
  }

  console.log(`\nDone — ${totalInserted} inserted, ${totalUpdated} updated across ${tenants.length} tenant(s).`);
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
