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

const NON_SUBSTRATE_KEYS = new Set(['ink-sb', 'ink-uv', 'adhesive-sb', 'adhesive-wb']);

function repoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../..');
}

export function resolveSubstratesExcelPath(): string {
  const envPath = process.env.SUBSTRATES_EXCEL_PATH?.trim();
  if (envPath && existsSync(envPath)) {
    return resolve(envPath);
  }

  const candidates = [
    resolve(repoRoot(), 'Substrates Master.xlsx'),
    resolve(process.cwd(), 'Substrates Master.xlsx'),
    resolve(process.cwd(), '../../Substrates Master.xlsx'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(`Substrates Master.xlsx not found (tried: ${candidates.join(', ')})`);
}

export function resolveMasterSeedPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, 'master-materials-seed.json');
}

function slugFromGrade(grade: string): string {
  return grade
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
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Parse USD price from number or formatted string ($2.20). */
function parsePrice(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? roundUsd(n) : null;
}

/** Map Substrates Master.xlsx rows to substrate master records. */
export function substratesFromExcelRows(rows: Record<string, unknown>[]): MasterMaterial[] {
  const usedKeys = new Set<string>();
  const draft: Array<{
    family: string;
    grade: string;
    hoover: string | null;
    userPrice: number;
    marketPrice: number;
    density: number;
  }> = [];

  for (const row of rows) {
    const family = cell(row, 'Substrate Family', 'substrateFamily')?.toString().trim();
    const grade = cell(row, 'Substrate Grade', 'substrateGrade')?.toString().trim();
    if (!family || !grade) continue;

    const userPrice = roundUsd(parsePrice(cell(row, 'User Price', 'costPerKgUsd')) ?? 0);
    const marketFromExcel = parsePrice(cell(row, 'Market Price ', 'Market Price', 'marketPriceUsd'));
    const marketPrice = marketFromExcel != null ? marketFromExcel : userPrice;

    draft.push({
      family,
      grade,
      hoover: cell(row, 'Hoover', 'hoover')?.toString().trim() || null,
      userPrice,
      marketPrice,
      density: num(cell(row, 'Density (g/cm3)', 'density'), 1),
    });
  }

  const gradeCounts = new Map<string, number>();
  for (const item of draft) {
    const k = `${item.family}|${item.grade}`;
    gradeCounts.set(k, (gradeCounts.get(k) || 0) + 1);
  }

  const results: MasterMaterial[] = [];
  for (const item of draft) {
    const gradeKey = `${item.family}|${item.grade}`;
    const duplicateGrade = (gradeCounts.get(gradeKey) || 0) > 1;
    const name =
      duplicateGrade && item.hoover ? `${item.grade} — ${item.hoover}` : item.grade;

    let key = slugFromGrade(name);
    if (usedKeys.has(key)) {
      key = `${slugFromGrade(item.family)}-${slugFromGrade(item.grade)}-${slugFromGrade(item.hoover || 'x')}`;
    }
    usedKeys.add(key);

    results.push({
      key,
      name,
      type: 'substrate',
      solidPercent: 100,
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

export function readSubstratesFromExcel(excelPath?: string): MasterMaterial[] {
  const path = excelPath ?? resolveSubstratesExcelPath();
  const workbook = XLSX.readFile(path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  return substratesFromExcelRows(rows);
}

export function readMasterSeed(seedPath?: string): MasterMaterial[] {
  const path = seedPath ?? resolveMasterSeedPath();
  return JSON.parse(readFileSync(path, 'utf8')) as MasterMaterial[];
}

/** Preserve ink/adhesive rows; replace substrate list from Excel. */
export function buildMasterMaterialsFromExcel(
  excelPath?: string,
  existingSeedPath?: string
): MasterMaterial[] {
  const substrates = readSubstratesFromExcel(excelPath);
  let preserved: MasterMaterial[] = [];

  try {
    const existing = readMasterSeed(existingSeedPath);
    preserved = existing.filter((m) => m.type !== 'substrate' || NON_SUBSTRATE_KEYS.has(m.key));
  } catch {
    preserved = [
      {
        key: 'ink-sb',
        name: 'Ink SB (Solvent Based)',
        type: 'ink',
        solidPercent: 30,
        density: 1.0,
        costPerKgUsd: 12.0,
        wastePercent: 0,
        isSolventBased: true,
        substrateFamily: null,
        substrateGrade: null,
        hoover: null,
        marketPriceUsd: 12.0,
      },
      {
        key: 'ink-uv',
        name: 'Ink UV',
        type: 'ink',
        solidPercent: 100,
        density: 1.0,
        costPerKgUsd: 15.0,
        wastePercent: 0,
        isSolventBased: false,
        substrateFamily: null,
        substrateGrade: null,
        hoover: null,
        marketPriceUsd: 15.0,
      },
      {
        key: 'adhesive-sb',
        name: 'Adhesive SB (Solvent Based)',
        type: 'adhesive',
        solidPercent: 100,
        density: 1.0,
        costPerKgUsd: 6.5,
        wastePercent: 0,
        isSolventBased: true,
        substrateFamily: null,
        substrateGrade: null,
        hoover: null,
        marketPriceUsd: 6.5,
      },
      {
        key: 'adhesive-wb',
        name: 'Adhesive WB (Water Based)',
        type: 'adhesive',
        solidPercent: 100,
        density: 1.0,
        costPerKgUsd: 5.8,
        wastePercent: 0,
        isSolventBased: false,
        substrateFamily: null,
        substrateGrade: null,
        hoover: null,
        marketPriceUsd: 5.8,
      },
    ];
  }

  const nonSubstrates = preserved.filter((m) => m.type !== 'substrate');
  return [...substrates, ...nonSubstrates];
}

export function writeMasterSeed(materials: MasterMaterial[], seedPath?: string): string {
  const path = seedPath ?? resolveMasterSeedPath();
  writeFileSync(path, `${JSON.stringify(materials, null, 2)}\n`, 'utf8');
  return path;
}
