/**
 * Platform master — single workbook: Master Data.xlsx (project root)
 *
 * Material sheets (structured table — row 1 headers):
 *   Substrate:     Substrate Family | Substrate Grade | Density (g/cm3) | Solid % | Hoover | User Price | Market Price
 *   Ink & Coating: Family | Grade | Density | Solid % | Hoover | User Price
 *   Adhesive:      Family | Grade | Density | Solid % | Hoover | User Price
 *   Packaging:     Family | Grade | Density | Solid % | Hoover | User Price
 *
 * List sheets: Unit (Units), PT (Product Type + Code), RM Type, Printing Web (label + code)
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

export interface ProductTypeRow {
  label: string;
  code: string;
}

export interface PrintingWebRow {
  label: string;
  code: string;
  inkSystem?: string | null;
  solidPercent?: number | null;
}

export interface MasterDataReference {
  productTypes: string[];
  productTypeRows: ProductTypeRow[];
  units: string[];
  rmTypes: string[];
  /** Same list as rmTypes but with codes for filter/save mapping */
  rmTypeRows?: Array<{ label: string; code: string }>;
  packaging: string[];
  inkCoating: string[];
  adhesive: string[];
  printingWebClasses: PrintingWebRow[];
}

export const MASTER_DATA_SHEETS = {
  substrate: 'Substrate',
  inkCoating: 'Ink & Coating',
  adhesive: 'Adhesive',
  packaging: 'Packaging',
  unit: 'Unit',
  productType: 'PT',
  rmType: 'RM Type',
  printingWeb: 'Printing Web',
} as const;

export const PACKAGING_FAMILY = 'Packaging';

/** Template ref_material_key → master seed `key` (from Excel build). */
export const TEMPLATE_REF_TO_MASTER_KEY: Record<string, string> = {
  'ldpe-natural': 'ldpe-natural',
  'ldpe-white': 'ldpe-white',
  'ldpe-shrink': 'pe-shrink',
  'pet-transparent': 'pet-transparent',
  'pet-shrink': 'pet-shrink',
  'pvc-shrink': 'pvc-shrink-normal-shrink-blown',
  bopp: 'bopp-transparent',
  cpp: 'cpp-transparent',
  'alu-foil': 'aluminium-foil',
  'ink-sb': 'ink-sb',
  'ink-uv': 'ink-uv',
  'adhesive-sb': 'adhesive-sb',
  'adhesive-wb': 'adhesive-wb',
  'adhesive-mono-component': 'adhesive-mono-component',
  'solvent-base': 'adhesive-sb',
};

/** DB costingKey for a platform master row (template alias, e.g. ldpe-shrink on PE Shrink). */
export function costingKeyForMasterKey(masterKey: string): string | null {
  for (const [refKey, mappedKey] of Object.entries(TEMPLATE_REF_TO_MASTER_KEY)) {
    if (mappedKey === masterKey) return refKey;
  }
  return null;
}

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

/** Read label + optional code from a two-column list sheet (row 1 = headers). */
function readLabeledCodeList(
  workbook: XLSX.WorkBook,
  sheetName: string,
  labelHeaderCandidates: string[],
  codeHeaderCandidates: string[]
): Array<{ label: string; code: string }> {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  if (rows.length === 0) return [];

  const first = rows[0];
  const keys = Object.keys(first);
  const findKey = (candidates: string[]) =>
    keys.find((k) => candidates.some((c) => k.trim().toLowerCase() === c.toLowerCase()));

  const labelKey = findKey(labelHeaderCandidates) ?? keys[0];
  const codeKey = findKey(codeHeaderCandidates);

  const out: Array<{ label: string; code: string }> = [];
  for (const row of rows) {
    const label = String(row[labelKey] ?? '').trim();
    if (!label) continue;
    const codeRaw = codeKey ? String(row[codeKey] ?? '').trim() : '';
    out.push({ label, code: codeRaw });
  }
  return out;
}

function readPrintingWebRows(workbook: XLSX.WorkBook): PrintingWebRow[] {
  const sheet = workbook.Sheets[MASTER_DATA_SHEETS.printingWeb];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const out: PrintingWebRow[] = [];
  for (const row of rows) {
    const label = String(
      cell(row, 'Printing Web', 'Label', 'Name') ?? ''
    ).trim();
    const code = String(cell(row, 'Code', 'Slug', 'Value') ?? '').trim();
    if (!label || !code) continue;
    const solidRaw = cell(row, 'Solid %', 'Solid Percent', 'solidPercent');
    const solid =
      solidRaw != null && solidRaw !== '' ? parseSolidPercent(solidRaw, 100) : null;
    out.push({
      label,
      code,
      inkSystem: cell(row, 'Ink System', 'Ink', 'inkSystem')?.toString().trim() || null,
      solidPercent: solid,
    });
  }
  return out;
}

interface StructuredRow {
  family: string;
  grade: string;
  density: number;
  solidPercent: number;
  hoover: string | null;
  userPrice: number;
  marketPrice: number;
  effectiveCost: number;
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

  const userPriceRaw = parsePrice(cell(row, 'User Price', 'costPerKgUsd'));
  const marketFromExcel = parsePrice(cell(row, 'Market Price ', 'Market Price', 'marketPriceUsd'));
  const userPrice = userPriceRaw != null ? roundUsd(userPriceRaw) : 0;
  const marketPrice = marketFromExcel != null ? roundUsd(marketFromExcel) : userPrice;
  const effectiveCost = userPrice > 0 ? userPrice : marketPrice;

  return {
    family,
    grade,
    density: num(cell(row, 'Density (g/cm3)', 'Density', 'density'), 1),
    solidPercent: parseSolidPercent(cell(row, 'Solid %', 'solidPercent', 'Solid Percent')),
    hoover: cell(row, 'Hoover', 'hoover')?.toString().trim() || null,
    userPrice,
    marketPrice,
    effectiveCost,
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
      costPerKgUsd: item.effectiveCost,
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
      costPerKgUsd: item.effectiveCost,
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
      costPerKgUsd: item.effectiveCost,
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
      costPerKgUsd: item.effectiveCost,
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

  const ptRows = readLabeledCodeList(workbook, MASTER_DATA_SHEETS.productType, [
    'Product Type',
    'Ptypes',
    'Label',
  ], ['Code', 'Slug', 'Value']);
  const productTypeRows: ProductTypeRow[] = ptRows.map((r) => ({
    label: r.label,
    code: r.code,
  }));
  const productTypes =
    productTypeRows.length > 0
      ? productTypeRows.map((r) => r.label)
      : readNamedList(workbook, MASTER_DATA_SHEETS.productType, 'Product Type');

  let printingWebClasses = readPrintingWebRows(workbook);

  return {
    productTypes,
    productTypeRows,
    units: readNamedList(workbook, MASTER_DATA_SHEETS.unit, 'Units'),
    rmTypes: readNamedList(workbook, MASTER_DATA_SHEETS.rmType, 'RM Type'),
    packaging: packagingGrades,
    inkCoating: inkGrades,
    adhesive: adhesiveGrades,
    printingWebClasses,
  };
}

/** Backfill reference fields when reading older master-data-reference.json */
export function normalizeReferenceShape(ref: Partial<MasterDataReference>): MasterDataReference {
  const productTypes = ref.productTypes ?? [];
  const productTypeRows =
    ref.productTypeRows && ref.productTypeRows.length > 0
      ? ref.productTypeRows
      : productTypes.map((label) => ({ label, code: '' }));

  return {
    productTypes,
    productTypeRows,
    units: ref.units ?? [],
    rmTypes: ref.rmTypes ?? [],
    packaging: ref.packaging ?? [],
    inkCoating: ref.inkCoating ?? [],
    adhesive: ref.adhesive ?? [],
    printingWebClasses: ref.printingWebClasses ?? [],
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

  const materials = [...substrates, ...inkMaterials, ...adhesiveFromSheet, ...packaging];
  const withPreservedPrices = preserveSeedPricesWhenExcelBlank(materials, existingSeedPath);
  for (const m of withPreservedPrices) {
    if (m.costPerKgUsd <= 0) {
      console.warn(
        `[master-data] ${m.key} (${m.name}) has no User Price or Market Price — cost is $0`
      );
    }
  }
  return withPreservedPrices;
}

/** When Excel User/Market price is blank, keep last committed seed price for that key. */
export function preserveSeedPricesWhenExcelBlank(
  materials: MasterMaterial[],
  existingSeedPath?: string
): MasterMaterial[] {
  const canonicalDefaults: Record<string, number> = {
    'ink-sb': 12,
    'ink-uv': 15,
    'adhesive-sb': 8,
    'adhesive-wb': 8,
    'adhesive-mono-component': 8,
  };

  let existing: MasterMaterial[] = [];
  try {
    existing = readMasterSeed(existingSeedPath);
  } catch {
    /* no prior seed */
  }
  const byKey = new Map(existing.map((m) => [m.key, m]));

  return materials.map((m) => {
    if (m.costPerKgUsd > 0) return m;
    const prev = byKey.get(m.key);
    const fallback =
      prev && prev.costPerKgUsd > 0
        ? prev.costPerKgUsd
        : canonicalDefaults[m.key] ?? 0;
    if (fallback <= 0) return m;
    return {
      ...m,
      costPerKgUsd: fallback,
      marketPriceUsd: prev?.marketPriceUsd ?? fallback,
    };
  });
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
