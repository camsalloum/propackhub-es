/**
 * One-off backfill: seed structure templates for any tenant that has none.
 * Usage: npm run db:seed-templates --workspace=packages/server
 */
import 'dotenv/config';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../src/db/index.js';
import { ensureTemplatesForTenant } from '../src/db/seed-templates.js';
import { ensureMaterialsForTenant } from '../src/db/seed-materials.js';

async function main() {
  await initializeDatabase();
  const db = getDatabase();

  const tenants = await db.select({ id: schema.tenants.id, name: schema.tenants.name }).from(schema.tenants);

  let totalTemplates = 0;
  let totalMaterials = 0;
  for (const tenant of tenants) {
    const matsAdded = await ensureMaterialsForTenant(tenant.id);
    const tplAdded = await ensureTemplatesForTenant(tenant.id);
    if (matsAdded > 0 || tplAdded > 0) {
      console.log(`✓ ${tenant.name}: +${matsAdded} materials, +${tplAdded} templates`);
      totalMaterials += matsAdded;
      totalTemplates += tplAdded;
    } else {
      console.log(`· ${tenant.name}: already seeded`);
    }
  }

  console.log(
    totalMaterials + totalTemplates > 0
      ? `\nDone — ${totalMaterials} materials, ${totalTemplates} templates inserted.`
      : '\nNo backfill needed.'
  );
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
