import {
  buildMasterMaterialsFromExcel,
  resolveMasterDataExcelPath,
  writeMasterSeed,
  writeMasterDataReference,
  readMasterDataReference,
} from '../db/master-materials-io.js';

function main() {
  const excelPath = resolveMasterDataExcelPath();
  const materials = buildMasterMaterialsFromExcel(excelPath);
  const reference = readMasterDataReference(excelPath);
  const substrates = materials.filter((m) => m.type === 'substrate').length;
  const outPath = writeMasterSeed(materials);
  const refPath = writeMasterDataReference(reference);
  console.log(`✅ Wrote ${materials.length} materials (${substrates} substrates) to ${outPath}`);
  console.log(`✅ Wrote reference lists to ${refPath}`);
  console.log(`   Source: ${excelPath}`);
}

main();
