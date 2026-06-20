/**
 * Platform master — single workbook: Master Data.xlsx (project root)
 *
 * Material sheets (structured table — row 1 headers):
 *   Substrate:     Substrate Family | Substrate Grade | Density (g/cm3) | Solid % | Hoover | User Price | Market Price
 *   Ink & Coating: Family | Grade | Density | Solid % | Hoover | User Price
 *   Adhesive:      Family | Grade | Density | Solid % | Hoover | User Price
 *   Packaging:     Family | Grade | Density | Solid % | Hoover | User Price
 *
 * List sheets: Unit (Units), PT (Product Type), RM Type (RM Type)
 *
 * Excel must use ListObject tables (auto-expand). If Name Manager shows #REF!,
 * run: npm run repair-master-data-excel
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { roundUsd } from '../utils/usd';

export interface MasterMaterial {
  key: string;
  name: string;
  type: 'substrate' | 'ink' | 'adhesive';
  solidPercent: number;
  density: number;
  costPerKgUsd: number;
  wastePercent: number;
  isSolventBased: boolean;
  substrateFamily: string | null;
  substrateGrade: string | null;
  hoover: string | null;
  marketPriceUsd: number | null;
}

export interface MasterDataReference {
  productTypes: string[];
  units: string[];
  rmTypes: string[];
  packaging: string[];
  inkCoating: string[];
  adhesive: string[];
}

export const MASTER_DATA_SHEETS = {
  substrate: 'Substrate',
  inkCoating: 'Ink & Coating',
  adhesive: 'Adhesive',
  packaging: 'Packaging',
  unit: 'Unit',
  productType: 'PT',
  rmType: 'RM Type',
} as const;

export const PACKAGING_FAMILY = 'Packaging';

/** Costing template keys — first matching Excel row receives this key. */
const INK_COSTING_FAMILY_KEYS: Array<{ match: (family: string) => boolean; key: string }> = [
  { match: (f) => f.includes('solvent based') || f === 'sb', key: 'ink-sb' },
  { match: (f) => f.includes('uv'), key: 'ink-uv' },
];

const ADHESIVE_COSTING_FAMILY_KEYS: Record<string, string> = {
  'solvent base': 'adhesive-sb',
  'solvent less': 'adhesive-wb',
  'mono component': 'adhesive-mono-component',
};

function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../..');
}

export function resolveMasterDataExcelPath(): string {
  const envPath =
    process.env.MASTER_DATA_EXCEL_PATH?.trim() ||
    process.env.SUBSTRATES_EXCEL_PATH?.trim();
  if (envPath && existsSync(envPath)) {
    return resolve(envPath);
  }

  const candidates = [
    resolve(repoRoot(), 'Master Data.xlsx'),
    resolve(repoRoot(), 'Master data.xlsx'),
    resolve(process.cwd(), 'Master Data.xlsx'),
    resolve(process.cwd(), '../../Master Data.xlsx'),
    resolve(repoRoot(), 'Substrates Master.xlsx'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `Master Data.xlsx not found (set MASTER_DATA_EXCEL_PATH or place at project root; tried: ${candidates.join(', ')})`
  );
}

/** @deprecated Use resolveMasterDataExcelPath */
export function resolveSubstratesExcelPath(): string {
  return resolveMasterDataExcelPath();
}

export function resolveMasterSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, 'master-materials-seed.json');
}

export function resolveMasterDataReferencePath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, 'master-data-reference.json');
}

function slugFromText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cell(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] != null && row[key] !== '') return row[key];
  }
  return null;
}

function num(value: unknown, fallback = 0): number {
  if (value == null || value === '' || value === '-') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseSolidPercent(value: unknown, fallback = 100): number {
  if (value == null || value === '' || value === '-') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function parsePrice(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? roundUsd(n) : null;
}

function readWorkbook(excelPath?: string): XLSX.WorkBook {
  return XLSX.readFile(excelPath ?? resolveMasterDataExcelPath());
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
}

/** Read a single-column list sheet by header name (row 1) or first column values. */
function readNamedList(workbook: XLSX.WorkBook, sheetName: string, preferredHeader?: string): string[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  if (rows.length === 0) return [];

  const header = String(rows[0]?.[0] ?? '').trim();
  const headerLower = header.toLowerCase();
  const isHeader =
    preferredHeader != null
      ? headerLower === preferredHeader.toLowerCase() ||
        headerLower === 'units' ||
        headerLower === 'unit' ||
        headerLower === 'rm type' ||
        headerLower === 'product type'
      : false;

  const values: string[] = [];
  const start = isHeader ? 1 : 0;
  for (let i = start; i < rows.length; i++) {
    const v = String(rows[i]?.[0] ?? '').trim();
    if (!v) continue;
    if (i === 0 && !isHeader && preferredHeader && v.toLowerCase() === preferredHeader.toLowerCase()) {
      continue;
    }
    values.push(v);
  }
  return values;
}

interface StructuredRow {
  family: string;
  grade: string;
  density: number;
  solidPercent: number;
  hoover: string | null;
  userPrice: number;
  marketPrice: number;
}

function parseStructuredRow(row: Record<string, unknown>): StructuredRow | null {
  const family = cell(
    row,
    'Substrate Family',
    'Family',
    'substrateFamily',
    'family'
  )
    ?.toString()
    .trim();
  const grade = cell(row, 'Substrate Grade', 'Grade', 'substrateGrade', 'grade')
    ?.toString()
    .trim();
  if (!family || !grade) return null;

  const userPrice = roundUsd(parsePrice(cell(row, 'User Price', 'costPerKgUsd')) ?? 0);
  const marketFromExcel = parsePrice(cell(row, 'Market Price ', 'Market Price', 'marketPriceUsd'));
  const marketPrice = marketFromExcel != null ? marketFromExcel : userPrice;

  return {
    family,
    grade,
    density: num(cell(row, 'Density (g/cm3)', 'Density', 'density'), 1),
    solidPercent: parseSolidPercent(cell(row, 'Solid %', 'solidPercent', 'Solid Percent')),
    hoover: cell(row, 'Hoover', 'hoover')?.toString().trim() || null,
    userPrice,
    marketPrice,
  };
}

function displayName(grade: string, hoover: string | null, duplicateGrade: boolean): string {
  if (duplicateGrade && hoover) return `${grade} — ${hoover}`;
  return grade;
}

function assignUniqueKey(
  baseKey: string,
  usedKeys: Set<string>,
  family: string,
  grade: string,
  hoover: string | null
): string {
  let key = baseKey;
  if (usedKeys.has(key)) {
    key = `${slugFromText(family)}-${slugFromText(grade)}-${slugFromText(hoover || 'x')}`;
  }
  if (usedKeys.has(key)) {
    key = `${key}-${usedKeys.size}`;
  }
  usedKeys.add(key);
  return key;
}

/** Map Substrate sheet rows to substrate master records. */
export function substratesFromExcelRows(rows: Record<string, unknown>[]): MasterMaterial[] {
  const parsed = rows.map(parseStructuredRow).filter((r): r is StructuredRow => r != null);
  const gradeCounts = new Map<string, number>();
  for (const item of parsed) {
    const k = `${item.family}|${item.grade}`;
    gradeCounts.set(k, (gradeCounts.get(k) || 0) + 1);
  }

  const usedKeys = new Set<string>();
  const results: MasterMaterial[] = [];

  for (const item of parsed) {
    const duplicateGrade = (gradeCounts.get(`${item.family}|${item.grade}`) || 0) > 1;
    const name = displayName(item.grade, item.hoover, duplicateGrade);
    const key = assignUniqueKey(slugFromText(name), usedKeys, item.family, item.grade, item.hoover);

    results.push({
      key,
      name,
      type: 'substrate',
      solidPercent: item.solidPercent,
      density: item.density,
      costPerKgUsd: item.userPrice,
      wastePercent: 0,
      isSolventBased: false,
      substrateFamily: item.family,
      substrateGrade: item.grade,
      hoover: item.hoover,
      marketPriceUsd: item.marketPrice,
    });
  }

  return results;
}

function familyIsSolventBased(family: string): boolean {
  const f = family.toLowerCase();
  return f.includes('solvent based') || f.includes('solvent base') || f === 'sb';
}

function familyIsUv(family: string): boolean {
  return family.toLowerCase().includes('uv');
}

function inkMaterialsFromRows(rows: Record<string, unknown>[]): MasterMaterial[] {
  const parsed = rows.map(parseStructuredRow).filter((r): r is StructuredRow => r != null);
  const gradeCounts = new Map<string, number>();
  for (const item of parsed) {
    const k = `${item.family}|${item.grade}`;
    gradeCounts.set(k, (gradeCounts.get(k) || 0) + 1);
  }

  const usedKeys = new Set<string>();
  const costingAssigned = new Set<string>();
  const results: MasterMaterial[] = [];

  for (const item of parsed) {
    const familyNorm = item.family.toLowerCase();
    const duplicateGrade = (gradeCounts.get(`${item.family}|${item.grade}`) || 0) > 1;
    const name = displayName(item.grade, item.hoover, duplicateGrade);

    let key = `ink-${slugFromText(item.family)}-${slugFromText(item.grade)}`;
    for (const rule of INK_COSTING_FAMILY_KEYS) {
      if (rule.match(familyNorm) && !costingAssigned.has(rule.key)) {
        key = rule.key;
        costingAssigned.add(rule.key);
        break;
      }
    }
    key = assignUniqueKey(key, usedKeys, item.family, item.grade, item.hoover);

    results.push({
      key,
      name,
      type: 'ink',
      solidPercent: item.solidPercent,
      density: item.density,
      costPerKgUsd: item.userPrice,
      wastePercent: 0,
      isSolventBased: familyIsSolventBased(item.family),
      substrateFamily: item.family,
      substrateGrade: item.grade,
      hoover: item.hoover,
      marketPriceUsd: item.marketPrice,
    });
  }

  return results;
}

function adhesiveMaterialsFromRows(rows: Record<string, unknown>[]): MasterMaterial[] {
  const parsed = rows.map(parseStructuredRow).filter((r): r is StructuredRow => r != null);
  const usedKeys = new Set<string>();
  const results: MasterMaterial[] = [];

  for (const item of parsed) {
    const familyNorm = item.family.toLowerCase();
    const gradeNorm = item.grade.toLowerCase();
    const lookup = ADHESIVE_COSTING_FAMILY_KEYS[familyNorm] ?? ADHESIVE_COSTING_FAMILY_KEYS[gradeNorm];
    const name = item.grade;
    let key = lookup ?? `adhesive-${slugFromText(item.family)}-${slugFromText(item.grade)}`;
    key = assignUniqueKey(key, usedKeys, item.family, item.grade, item.hoover);

    const solventBased = !familyNorm.includes('less') && !gradeNorm.includes('less');

    results.push({
      key,
      name,
      type: 'adhesive',
      solidPercent: item.solidPercent,
      density: item.density,
      costPerKgUsd: item.userPrice,
      wastePercent: 0,
      isSolventBased: solventBased,
      substrateFamily: item.family,
      substrateGrade: item.grade,
      hoover: item.hoover,
      marketPriceUsd: item.marketPrice,
    });
  }

  return results;
}

function packagingMaterialsFromRows(rows: Record<string, unknown>[]): MasterMaterial[] {
  const parsed = rows.map(parseStructuredRow).filter((r): r is StructuredRow => r != null);
  const usedKeys = new Set<string>();
  const results: MasterMaterial[] = [];

  for (const item of parsed) {
    const name = item.grade;
    let key = `packaging-${slugFromText(item.grade)}`;
    key = assignUniqueKey(key, usedKeys, item.family, item.grade, item.hoover);

    results.push({
      key,
      name,
      type: 'substrate',
      solidPercent: item.solidPercent,
      density: item.density,
      costPerKgUsd: item.userPrice,
      wastePercent: 0,
      isSolventBased: false,
      substrateFamily: PACKAGING_FAMILY,
      substrateGrade: item.grade,
      hoover: item.hoover,
      marketPriceUsd: item.marketPrice,
    });
  }

  return results;
}

export function readMasterDataReference(excelPath?: string): MasterDataReference {
  const workbook = readWorkbook(excelPath);

  const inkRows = sheetRows(workbook, MASTER_DATA_SHEETS.inkCoating);
  const adhesiveRows = sheetRows(workbook, MASTER_DATA_SHEETS.adhesive);
  const packagingRows = sheetRows(workbook, MASTER_DATA_SHEETS.packaging);

  const inkGrades = inkRows
    .map(parseStructuredRow)
    .filter((r): r is StructuredRow => r != null)
    .map((r) => `${r.family} — ${r.grade}`);
  const adhesiveGrades = adhesiveRows
    .map(parseStructuredRow)
    .filter((r): r is StructuredRow => r != null)
    .map((r) => r.grade);
  const packagingGrades = packagingRows
    .map(parseStructuredRow)
    .filter((r): r is StructuredRow => r != null)
    .map((r) => r.grade);

  return {
    productTypes: readNamedList(workbook, MASTER_DATA_SHEETS.productType, 'Product Type'),
    units: readNamedList(workbook, MASTER_DATA_SHEETS.unit, 'Units'),
    rmTypes: readNamedList(workbook, MASTER_DATA_SHEETS.rmType, 'RM Type'),
    packaging: packagingGrades,
    inkCoating: inkGrades,
    adhesive: adhesiveGrades,
  };
}

export function writeMasterDataReference(ref: MasterDataReference, outPath?: string): string {
  const path = outPath ?? resolveMasterDataReferencePath();
  writeFileSync(path, `${JSON.stringify(ref, null, 2)}\n`, 'utf8');
  return path;
}

function findSubstrateSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  for (const name of [MASTER_DATA_SHEETS.substrate, 'Substrate Costing Master', 'Substrates']) {
    if (workbook.Sheets[name]) return workbook.Sheets[name];
  }
  const first = workbook.SheetNames[0];
  if (!first || !workbook.Sheets[first]) {
    throw new Error('No worksheet found in Master Data.xlsx');
  }
  return workbook.Sheets[first];
}

export function readSubstratesFromExcel(excelPath?: string): MasterMaterial[] {
  const workbook = readWorkbook(excelPath);
  const sheet = findSubstrateSheet(workbook);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  return substratesFromExcelRows(rows);
}

export function readMasterSeed(seedPath?: string): MasterMaterial[] {
  const path = seedPath ?? resolveMasterSeedPath();
  return JSON.parse(readFileSync(path, 'utf8')) as MasterMaterial[];
}

function fallbackInkCosting(existingSeedPath?: string): MasterMaterial[] {
  const defaults: MasterMaterial[] = [
    {
      key: 'ink-sb',
      name: 'Ink SB (Solvent Based)',
      type: 'ink',
      solidPercent: 30,
      density: 1,
      costPerKgUsd: 12,
      wastePercent: 0,
      isSolventBased: true,
      substrateFamily: 'Solvent Based',
      substrateGrade: 'Ink SB',
      hoover: null,
      marketPriceUsd: 12,
    },
    {
      key: 'ink-uv',
      name: 'Ink UV',
      type: 'ink',
      solidPercent: 100,
      density: 1,
      costPerKgUsd: 15,
      wastePercent: 0,
      isSolventBased: false,
      substrateFamily: 'UV-LED',
      substrateGrade: 'Ink UV',
      hoover: null,
      marketPriceUsd: 15,
    },
  ];
  try {
    const existing = readMasterSeed(existingSeedPath);
    return defaults.map((row) => {
      const prev = existing.find((m) => m.key === row.key);
      return prev ? { ...row, costPerKgUsd: prev.costPerKgUsd, marketPriceUsd: prev.marketPriceUsd } : row;
    });
  } catch {
    return defaults;
  }
}

/** All materials from Master Data.xlsx structured sheets. */
export function buildMasterMaterialsFromExcel(
  excelPath?: string,
  existingSeedPath?: string
): MasterMaterial[] {
  const workbook = readWorkbook(excelPath);

  const substrates = substratesFromExcelRows(
    XLSX.utils.sheet_to_json(findSubstrateSheet(workbook), { defval: null })
  );

  const inkFromSheet = inkMaterialsFromRows(sheetRows(workbook, MASTER_DATA_SHEETS.inkCoating));
  const inkMaterials =
    inkFromSheet.length > 0
      ? inkFromSheet
      : fallbackInkCosting(existingSeedPath);

  const adhesiveFromSheet = adhesiveMaterialsFromRows(
    sheetRows(workbook, MASTER_DATA_SHEETS.adhesive)
  );

  const packaging = packagingMaterialsFromRows(sheetRows(workbook, MASTER_DATA_SHEETS.packaging));

  return [...substrates, ...inkMaterials, ...adhesiveFromSheet, ...packaging];
}

export function writeMasterSeed(materials: MasterMaterial[], seedPath?: string): string {
  const path = seedPath ?? resolveMasterSeedPath();
  writeFileSync(path, `${JSON.stringify(materials, null, 2)}\n`, 'utf8');
  return path;
}

/** Stable sync key — family + grade + hoover for all RM types. */
export function materialSyncKey(m: {
  type: string;
  name: string;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
}): string {
  if (m.type === 'substrate' && m.substrateFamily === PACKAGING_FAMILY) {
    return `packaging|${m.substrateGrade || m.name}|${m.hoover || ''}`;
  }
  if (m.type === 'substrate') {
    return `substrate|${m.substrateFamily || ''}|${m.substrateGrade || m.name}|${m.hoover || ''}`;
  }
  if (m.type === 'ink' || m.type === 'adhesive') {
    return `${m.type}|${m.substrateFamily || ''}|${m.substrateGrade || m.name}|${m.hoover || ''}`;
  }
  return `${m.type}|${m.name}`;
}
