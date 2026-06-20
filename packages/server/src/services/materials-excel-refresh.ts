import { getDatabase, schema } from '../db';
import {
  buildMasterMaterialsFromExcel,
  resolveSubstratesExcelPath,
  writeMasterSeed,
} from '../db/master-materials-io';
import { syncMaterialsForTenant } from '../db/seed-materials';

export interface ExcelRefreshResult {
  excelPath: string;
  seedPath: string;
  substrateCount: number;
  totalMaterials: number;
  tenantsSynced: number;
  inserted: number;
  updated: number;
  orphans: number;
  pruned: number;
}

/** Read Substrates Master.xlsx → update seed JSON → upsert tenant library. */
export async function refreshMaterialsFromExcel(
  tenantId: string,
  options?: { syncAllTenants?: boolean; pruneOrphans?: boolean }
): Promise<ExcelRefreshResult> {
  const excelPath = resolveSubstratesExcelPath();
  const materials = buildMasterMaterialsFromExcel(excelPath);

  const db = getDatabase();
  let inserted = 0;
  let updated = 0;
  let orphans = 0;
  let pruned = 0;
  let tenantsSynced = 0;

  const tenantIds = options?.syncAllTenants
    ? (await db.select({ id: schema.tenants.id }).from(schema.tenants)).map((t: { id: string }) => t.id)
    : [tenantId];

  // Sync DB with freshly parsed Excel rows before writing seed JSON
  for (const id of tenantIds) {
    const result = await syncMaterialsForTenant(id, materials, {
      pruneOrphans: options?.pruneOrphans,
    });
    inserted += result.inserted;
    updated += result.updated;
    orphans += result.orphans;
    pruned += result.pruned;
    tenantsSynced++;
  }

  const seedPath = writeMasterSeed(materials);

  return {
    excelPath,
    seedPath,
    substrateCount: materials.filter((m) => m.type === 'substrate').length,
    totalMaterials: materials.length,
    tenantsSynced,
    inserted,
    updated,
    orphans,
    pruned,
  };
}
