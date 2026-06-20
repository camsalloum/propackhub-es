/**
 * Remove substrate rows in tenant DBs that are not in Substrates Master.xlsx.
 * Usage: npm run db:prune-orphan-substrates
 */
import { getDatabase, schema } from '../src/db';
import { buildMasterMaterialsFromExcel, resolveSubstratesExcelPath } from '../src/db/master-materials-io';
import { pruneOrphanSubstratesForTenant } from '../src/db/seed-materials';

async function main() {
  const excelPath = resolveSubstratesExcelPath();
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
