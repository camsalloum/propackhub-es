import XLSX from 'xlsx';
import { resolveMasterDataExcelPath } from '../db/master-materials-io';

const path = resolveMasterDataExcelPath();
const wb = XLSX.readFile(path, { cellDates: true });
console.log('File:', path);
console.log('Sheets:', wb.SheetNames.join(', '));
console.log(
  'Names:',
  (wb.Workbook?.Names || []).map((n) => `${n.Name}=${n.Ref}`).join('\n  ')
);

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  console.log(`\n=== ${name} (${rows.length} data rows) ===`);
  console.log('Headers:', headerRows[0]);
  if (rows.length > 0) console.log('First row keys:', Object.keys(rows[0]));
  console.log('Row 1:', JSON.stringify(rows[0]));
  if (rows[1]) console.log('Row 2:', JSON.stringify(rows[1]));
}
