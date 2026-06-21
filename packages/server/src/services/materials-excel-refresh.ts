import { getDatabase, schema } from '../db';
import {
  buildMasterMaterialsFromExcel,
  resolveMasterDataExcelPath,
  readMasterDataReference,
  writeMasterSeed,
  writeMasterDataReference,
} from '../db/master-materials-io';
import { syncMaterialsForTenant } from '../db/seed-materials';
import { relinkTemplatesForTenant } from '../db/seed-templates';

export interface ExcelRefreshResult {
  excelPath: string;
  seedPath: string;
  referencePath: string;
  substrateCount: number;
  inkCount: number;
  adhesiveCount: number;
  packagingCount: number;
  totalMaterials: number;
  tenantsSynced: number;
  inserted: number;
  updated: number;
  orphans: number;
  pruned: number;
  templatesRelinked: number;
  reference: {
    productTypes: number;
    units: number;
    rmTypes: number;
  };
}

/** Read Master Data.xlsx → update seed JSON → upsert tenant library (platform master). */
export async function refreshMaterialsFromExcel(
  tenantId: string,
  options?: { syncAllTenants?: boolean; pruneOrphans?: boolean }
): Promise<ExcelRefreshResult> {
  const excelPath = resolveMasterDataExcelPath();
  const materials = buildMasterMaterialsFromExcel(excelPath);
  const reference = readMasterDataReference(excelPath);

  const db = getDatabase();
  let inserted = 0;
  let updated = 0;
  let orphans = 0;
  let pruned = 0;
  let tenantsSynced = 0;
  let templatesRelinked = 0;

  const tenantIds = options?.syncAllTenants
    ? (await db.select({ id: schema.tenants.id }).from(schema.tenants)).map((t: { id: string }) => t.id)
    : [tenantId];

  // Sync DB with freshly parsed Excel rows before writing seed JSON
  for (const id of tenantIds) {
    const result = await syncMaterialsForTenant(id, materials, {
      pruneOrphans: options?.pruneOrphans !== false,
    });
    inserted += result.inserted;
    updated += result.updated;
    orphans += result.orphans;
    pruned += result.pruned;
    templatesRelinked += await relinkTemplatesForTenant(id);
    tenantsSynced++;
  }

  const seedPath = writeMasterSeed(materials);
  const referencePath = writeMasterDataReference(reference);

  const inkCount = materials.filter((m) => m.type === 'ink').length;
  const adhesiveCount = materials.filter((m) => m.type === 'adhesive').length;

  return {
    excelPath,
    seedPath,
    referencePath,
    substrateCount: materials.filter(
      (m) => m.type === 'substrate' && m.substrateFamily !== 'Packaging'
    ).length,
    inkCount,
    adhesiveCount,
    packagingCount: materials.filter((m) => m.substrateFamily === 'Packaging').length,
    totalMaterials: materials.length,
    tenantsSynced,
    inserted,
    updated,
    orphans,
    pruned,
    templatesRelinked,
    reference: {
      productTypes: reference.productTypes.length,
      units: reference.units.length,
      rmTypes: reference.rmTypes.length,
    },
  };
}
