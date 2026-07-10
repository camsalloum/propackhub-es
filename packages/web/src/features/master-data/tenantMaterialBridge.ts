import type { PlatformMasterMaterialRow } from '../../lib/api';
import { roundUsd } from '../../lib/currency';

type TenantMaterialRow = {
  id: string;
  name: string;
  type: string;
  solidPercent: number | string;
  density: string | number;
  costPerKgUsd: string | number;
  wastePercent?: number | string;
  isSolventBased?: boolean;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
  marketPriceUsd?: string | number | null;
  platformMasterKey?: string | null;
  costingKey?: string | null;
  externalId?: string | null;
  externalSource?: string | null;
  isTenantOnly?: boolean;
  priceSource?: string | null;
  accessoryKind?: string | null;
  costPerMeterUsd?: string | number | null;
  costPerPieceUsd?: string | number | null;
  weightGramPerMeter?: string | number | null;
  weightGramPerPiece?: string | number | null;
  priceUnit?: string | null;
  unitPriceUsd?: string | number | null;
  laminationRecipe?: unknown;
};

function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function usd(v: string | number | null | undefined): number {
  return roundUsd(num(v));
}

export function tenantMaterialToPlatformRow(m: TenantMaterialRow): PlatformMasterMaterialRow & {
  isTenantOnly?: boolean;
} {
  const costPerKgUsd = usd(m.costPerKgUsd);
  const solidPercent = Math.round(num(m.solidPercent));
  const liquidCostUsd =
    (m.type === 'ink' || m.type === 'adhesive') && solidPercent > 0 && solidPercent < 100
      ? roundUsd((costPerKgUsd * solidPercent) / 100)
      : costPerKgUsd;

  return {
    id: m.id,
    key: m.platformMasterKey ?? m.costingKey ?? m.id,
    name: m.name,
    type: m.type as PlatformMasterMaterialRow['type'],
    solidPercent,
    density: Math.round(num(m.density) * 100) / 100,
    costPerKgUsd,
    liquidCostUsd,
    wastePercent: Math.round(num(m.wastePercent)),
    isSolventBased: Boolean(m.isSolventBased),
    substrateFamily: m.substrateFamily ?? null,
    substrateGrade: m.substrateGrade ?? null,
    hoover: m.hoover ?? null,
    marketPriceUsd: m.marketPriceUsd != null ? usd(m.marketPriceUsd) : null,
    externalId: m.externalId ?? null,
    externalSource: m.externalSource ?? null,
    priceSource: (m as { priceSource?: string | null }).priceSource ?? null,
    accessoryKind: (m.accessoryKind as PlatformMasterMaterialRow['accessoryKind']) ?? null,
    costPerMeterUsd: m.costPerMeterUsd != null ? usd(m.costPerMeterUsd) : null,
    costPerPieceUsd: m.costPerPieceUsd != null ? usd(m.costPerPieceUsd) : null,
    weightGramPerMeter: m.weightGramPerMeter != null ? num(m.weightGramPerMeter) : null,
    weightGramPerPiece: m.weightGramPerPiece != null ? num(m.weightGramPerPiece) : null,
    priceUnit: (m.priceUnit as PlatformMasterMaterialRow['priceUnit']) ?? null,
    unitPriceUsd: m.unitPriceUsd != null ? usd(m.unitPriceUsd) : null,
    laminationRecipe: m.laminationRecipe ?? null,
    isTenantOnly: Boolean(m.isTenantOnly),
  };
}

export function buildTenantMaterialPayload(row: PlatformMasterMaterialRow) {
  return {
    name: (row.name || '').trim() || 'Unnamed',
    type: row.type,
    solidPercent: Math.round(row.solidPercent),
    density: Number(row.density) || 0.9,
    costPerKgUsd: usd(row.costPerKgUsd),
    wastePercent: Math.round(row.wastePercent ?? 0),
    substrateFamily: row.substrateFamily?.trim() || null,
    substrateGrade: row.substrateGrade?.trim() || null,
    hoover: row.hoover?.trim() || null,
    marketPriceUsd: row.marketPriceUsd != null ? usd(row.marketPriceUsd) : null,
    ...(row.type === 'accessory'
      ? {
          accessoryKind: row.accessoryKind ?? null,
          costPerMeterUsd: row.costPerMeterUsd != null ? usd(row.costPerMeterUsd) : null,
          costPerPieceUsd: row.costPerPieceUsd != null ? usd(row.costPerPieceUsd) : null,
          weightGramPerMeter: row.weightGramPerMeter != null ? Number(row.weightGramPerMeter) : null,
          weightGramPerPiece: row.weightGramPerPiece != null ? Number(row.weightGramPerPiece) : null,
        }
      : {}),
    ...(row.type === 'packaging'
      ? {
          priceUnit: row.priceUnit ?? null,
          unitPriceUsd: row.unitPriceUsd != null ? usd(row.unitPriceUsd) : null,
        }
      : {}),
  };
}

export function canEditTenantMaterialRow(
  row: PlatformMasterMaterialRow & {
    isTenantOnly?: boolean;
    priceSource?: string | null;
    type?: string;
    substrateFamily?: string | null;
  },
  canEditSyncedMaterials: boolean,
  catalogSource: 'tenant' | 'platform' | 'pebi' = 'tenant'
): boolean {
  if (row.isTenantOnly) return true;
  if (canEditSyncedMaterials) return true;
  if (
    row.type === 'substrate' &&
    row.substrateFamily === 'PE' &&
    !(row.externalSource === 'pebi' && row.priceSource === 'pebi')
  ) {
    return true;
  }
  // All ink/coating grades: editable except live PEBI-priced SB/UV Common (price only).
  // Solid%/density stay editable via canEditInkPhysicalProps when price is PEBI-locked.
  if (row.type === 'ink' && !(row.externalSource === 'pebi' && row.priceSource === 'pebi')) {
    return true;
  }
  if (row.type === 'adhesive' && !(row.externalSource === 'pebi' && row.priceSource === 'pebi')) {
    return true;
  }
  // Manual solvents always editable; PEBI-linked solvents: density always, price when not live PEBI.
  if (row.type === 'solvent' && !(row.externalSource === 'pebi' && row.priceSource === 'pebi')) {
    return true;
  }
  if (row.type === 'packaging' && !(row.externalSource === 'pebi' && row.priceSource === 'pebi')) {
    return true;
  }
  if (
    catalogSource === 'pebi' &&
    row.externalSource === 'pebi' &&
    (row.priceSource === 'manual' || row.priceSource === 'platform')
  ) {
    return true;
  }
  return false;
}

/** ES owns ink solid% and density even when PEBI owns liquid/dry price. */
export function canEditInkPhysicalProps(
  row: { type?: string; isTenantOnly?: boolean },
  canEditSyncedMaterials: boolean
): boolean {
  if (row.type !== 'ink') return false;
  if (row.isTenantOnly || canEditSyncedMaterials) return true;
  return true;
}

/** ES owns adhesive mix / solid% / density even when PEBI owns component prices. */
export function canEditAdhesivePhysicalProps(
  row: { type?: string; isTenantOnly?: boolean },
  canEditSyncedMaterials: boolean
): boolean {
  if (row.type !== 'adhesive') return false;
  if (row.isTenantOnly || canEditSyncedMaterials) return true;
  return true;
}

/** ES owns solvent density even when PEBI owns liquid price. */
export function canEditSolventPhysicalProps(
  row: { type?: string; isTenantOnly?: boolean },
  canEditSyncedMaterials: boolean
): boolean {
  if (row.type !== 'solvent') return false;
  if (row.isTenantOnly || canEditSyncedMaterials) return true;
  return true;
}
