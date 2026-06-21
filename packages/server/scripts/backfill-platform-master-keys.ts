/**
 * One-time / idempotent backfill: set materials.platform_master_key from platform catalog.
 * Match order: existing platform_master_key → costing_key → legacy heuristics via sync.
 *
 * Usage: npm run db:backfill-platform-keys --workspace=packages/server
 */
import { eq } from 'drizzle-orm';
import { getDatabase, schema } from '../src/db';
import { listPlatformMasterMaterials, syncPlatformMasterToAllTenants } from '../src/db/platform-master-data';

async function main() {
  const db = getDatabase();
  const platformMaterials = await listPlatformMasterMaterials();
  const platformKeys = new Set(platformMaterials.map((m) => m.key));

  const tenants = await db.select({ id: schema.tenants.id, name: schema.tenants.name }).from(schema.tenants);
  console.log(`Backfill platform_master_key — ${tenants.length} tenant(s), ${platformMaterials.length} platform material(s)`);

  const ambiguous: string[] = [];

  for (const tenant of tenants) {
    const rows = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenant.id));

    const byCostingKey = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.costingKey || row.isTenantOnly) continue;
      const list = byCostingKey.get(row.costingKey) ?? [];
      list.push(row);
      byCostingKey.set(row.costingKey, list);
    }

    for (const [costingKey, matches] of byCostingKey) {
      if (!platformKeys.has(costingKey)) continue;
      if (matches.length > 1) {
        ambiguous.push(`${tenant.name}: costing_key=${costingKey} (${matches.length} rows)`);
      }
    }
  }

  if (ambiguous.length > 0) {
    console.warn('Ambiguous rows (manual review recommended):');
    ambiguous.forEach((line) => console.warn(`  - ${line}`));
  }

  const result = await syncPlatformMasterToAllTenants({ pruneOrphans: false });
  console.log('Sync complete:', result);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
