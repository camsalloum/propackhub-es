import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

/**
 * Reads Substrates Master.xlsx (located at project root) and generates
 * packages/server/src/db/master-materials-seed.json.
 * Expected columns (header row) match the material fields used elsewhere:
 *   key, name, type, solidPercent, density, costPerKgUsd, wastePercent,
 *   isSolventBased, substrateFamily, substrateGrade, hoover, marketPriceUsd
 */
function main() {
  // Resolve Excel file located at project root regardless of cwd
  // __dirname points to .../packages/server/src/scripts
  // Resolve Excel file located at project root (apps/estimation-studio)
  // When this script runs, the cwd is the server package folder (packages/server)
  const excelPath = path.resolve(process.cwd(), '../../', 'Substrates Master.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found at', excelPath);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const materials = rows.map((row) => {
    // Ensure required fields have sensible defaults
    const type = (row.type || 'substrate').toString().toLowerCase();
    const waste = row.wastePercent != null ? Number(row.wastePercent) : 0;
    const market = row.marketPriceUsd != null ? Number(row.marketPriceUsd) : Number(row.costPerKgUsd);
    return {
      key: row.key?.toString() ?? undefined,
      name: row.name?.toString() ?? undefined,
      type,
      solidPercent: Number(row.solidPercent ?? 100),
      density: Number(row.density ?? 1),
      costPerKgUsd: Number(row.costPerKgUsd ?? 0),
      wastePercent: waste,
      isSolventBased: Boolean(row.isSolventBased),
      substrateFamily: row.substrateFamily ?? null,
      substrateGrade: row.substrateGrade ?? null,
      hoover: row.hoover ?? null,
      marketPriceUsd: market,
    };
  });

  // Output JSON should be written to the server db folder
  const outPath = path.resolve(process.cwd(), 'src', 'db', 'master-materials-seed.json');
  fs.writeFileSync(outPath, JSON.stringify(materials, null, 2), { encoding: 'utf8' });
  console.log(`✅ Updated ${materials.length} materials to ${outPath}`);
}

main();
