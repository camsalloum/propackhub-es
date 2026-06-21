/**
 * CLI: verify all standard template layers resolve against master-materials-seed.json fixtures.
 * Usage: npm run verify-template-links --workspace=packages/server
 */
import masterMaterials from '../db/master-materials-seed.json';
import templateSeed from '../db/structure-templates-seed.json';
import {
  buildTemplateMaterialLookup,
  resolveLayerMaterialId,
} from '../utils/template-material-lookup';
import type { MasterMaterial } from '../db/master-materials-io';
import { costingKeyForMasterKey } from '../db/master-materials-io';

const materials = (masterMaterials as MasterMaterial[]).map((m) => ({
  id: `seed-${m.key}`,
  name: m.name,
  type: m.type,
  substrateFamily: m.substrateFamily,
  substrateGrade: m.substrateGrade,
  costingKey: costingKeyForMasterKey(m.key),
}));

const lookup = buildTemplateMaterialLookup(materials);
const validIds = new Set(materials.map((m) => m.id));

let failures = 0;

for (const template of (templateSeed as { templates: any[] }).templates) {
  console.log(`\n${template.name}`);
  for (const layer of template.default_layers) {
    const id = resolveLayerMaterialId(layer, lookup, validIds);
    const mat = materials.find((m) => m.id === id);
    const status = id ? `OK → ${mat?.name}` : 'UNRESOLVED';
    if (!id) failures++;
    console.log(`  [${layer.layer_type}] ${layer.ref_material_key}: ${status}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} unresolved layer(s)`);
  process.exit(1);
}

console.log('\nAll template layers resolved.');
