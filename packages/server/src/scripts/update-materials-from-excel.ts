import {
  buildMasterMaterialsFromExcel,
  resolveSubstratesExcelPath,
  writeMasterSeed,
} from '../db/master-materials-io.js';

function main() {
  const excelPath = resolveSubstratesExcelPath();
  const materials = buildMasterMaterialsFromExcel(excelPath);
  const substrates = materials.filter((m) => m.type === 'substrate').length;
  const outPath = writeMasterSeed(materials);
  console.log(`✅ Wrote ${materials.length} materials (${substrates} substrates) to ${outPath}`);
  console.log(`   Source: ${excelPath}`);
}

main();
