/**
 * Remove substrate rows in tenant DBs that are not in Master Data.xlsx (Substrate sheet).
 * Usage: npm run db:prune-orphan-substrates
 */
import { getDatabase, schema } from '../src/db';
import { buildMasterMaterialsFromExcel, resolveMasterDataExcelPath } from '../src/db/master-materials-io';
import { pruneOrphanSubstratesForTenant } from '../src/db/seed-materials';

async function main() {
  const excelPath = resolveMasterDataExcelPath();
  const materials = buildMasterMaterialsFromExcel(excelPath);
  const db = getDatabase();
  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants);

  let total = 0;
  for (const { id } of tenants) {
    const pruned = await pruneOrphanSubstratesForTenant(id, materials);
    if (pruned > 0) {
      console.log(`Tenant ${id}: pruned ${pruned} orphan substrate(s)`);
      total += pruned;
    }
  }

  console.log(`Done. Pruned ${total} orphan substrate row(s) across ${tenants.length} tenant(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
