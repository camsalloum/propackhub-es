/**
 * Outbound packaging costing — separate from laminate stack (like solvents).
 * Quantities from product geometry; prices from PB-synced materials (unitPriceUsd).
 * No numeric fallback: missing price → needsReview + $0.
 */
import type { Estimate, EstimateDimensions, Material } from './types';
import {
  computeRollSpec,
  DEFAULT_CORE_INCH,
  DEFAULT_CORE_THICKNESS_MM,
  DEFAULT_TARGET_OD_MM,
  CORE_INSIDE_MM_BY_INCH,
  type RollSpecResult,
} from './roll-after-slitting';

export const DEFAULT_LOAD_PER_PALLET_KG = 800;
export const DEFAULT_CARTONS_PER_PALLET = 20;
export const DEFAULT_PCS_PER_CARTON = 1000;
export const DEFAULT_LD_WRAP_PASSES = 2;
export const DEFAULT_LD_WRAP_FILM_WIDTH_MM = 500;
export const DEFAULT_LD_WRAP_GSM = 25;
export const DEFAULT_STRETCH_WRAP_LAYERS = 4;
export const DEFAULT_PALLET_FOOTPRINT_L_M = 1;
export const DEFAULT_PALLET_FOOTPRINT_W_M = 1;
export const STRETCH_ROLL_LENGTH_M = 500;

/** Sleeve pack reference OD (mm) — carton + core length use this. */
export const SLEEVE_PACK_TARGET_OD_MM = DEFAULT_TARGET_OD_MM;

/**
 * Carton platform key by roll OD band.
 * Sleeve @ 600 OD → packaging-carton-sleeve-600 (PB SKUs with a side ≥600 mm).
 */
export const CARTON_OD_MATCH_TABLE: ReadonlyArray<{
  platformMasterKey: string;
  minOdMm: number;
  maxOdMm: number;
}> = [
  { platformMasterKey: 'packaging-carton-sleeve-600', minOdMm: 500, maxOdMm: 650 },
];

export function cartonPlatformKeyForOd(odMm: number): string {
  const od = odMm > 0 ? odMm : SLEEVE_PACK_TARGET_OD_MM;
  const hit = CARTON_OD_MATCH_TABLE.find((r) => od >= r.minOdMm && od <= r.maxOdMm);
  return hit?.platformMasterKey ?? 'packaging-carton-default';
}

export type PackagingRole = 'core' | 'ld_wrap' | 'stretch' | 'carton' | 'pallet';

export interface PackagingConfig {
  loadPerPalletKg?: number;
  cartonsPerPallet?: number;
  pcsPerCarton?: number;
  ldWrapPasses?: number;
  ldWrapFilmWidthMm?: number;
  ldWrapGsm?: number;
  stretchWrapLayers?: number;
  palletFootprintLm?: number;
  palletFootprintWm?: number;
  coreMaterialId?: string | null;
  ldWrapMaterialId?: string | null;
  stretchMaterialId?: string | null;
  palletMaterialId?: string | null;
  cartonMaterialId?: string | null;
}

export interface PackagingCostLine {
  role: PackagingRole;
  label: string;
  qty: number;
  qtyUnit: string;
  unitPriceUsd: number | null;
  priceUnit: string | null;
  costJobUsd: number;
  costPerKgUsd: number;
  costPerM2Usd: number;
  needsReview: boolean;
  detail?: Record<string, number>;
}

export interface PackagingCostDetail {
  lines: PackagingCostLine[];
  totalCostPerKg: number;
  totalCostPerM2: number;
  needsReview: boolean;
  rollsInOrder: number;
  palletsInOrder: number;
  cartonsNeeded: number;
  rollWeightKg: number;
}

export function resolvePackagingUnitPrice(material: Material | undefined | null): {
  unitPriceUsd: number | null;
  priceUnit: string | null;
  needsReview: boolean;
} {
  if (!material) {
    return { unitPriceUsd: null, priceUnit: null, needsReview: true };
  }
  const unit = (material.priceUnit ?? inferPriceUnit(material) ?? 'kgs').toLowerCase();
  let price: number | null = null;
  if (unit === 'kgs' || unit === 'kg') {
    price = positive(material.unitPriceUsd) ?? positive(material.costPerKgUsd);
  } else if (unit === 'mtr' || unit === 'm') {
    price = positive(material.unitPriceUsd) ?? positive(material.costPerMeterUsd);
  } else if (unit === 'pcs' || unit === 'pc' || unit === 'rol' || unit === 'roll') {
    price = positive(material.unitPriceUsd) ?? positive(material.costPerPieceUsd);
  } else {
    price =
      positive(material.unitPriceUsd) ??
      positive(material.costPerKgUsd) ??
      positive(material.costPerMeterUsd) ??
      positive(material.costPerPieceUsd);
  }
  return {
    unitPriceUsd: price,
    priceUnit: unit,
    needsReview: price == null || price <= 0,
  };
}

function inferPriceUnit(m: Material): string | null {
  if (m.priceUnit) return m.priceUnit;
  if (positive(m.costPerMeterUsd) != null) return 'mtr';
  if (positive(m.costPerPieceUsd) != null) return 'pcs';
  if (positive(m.costPerKgUsd) != null) return 'kgs';
  return null;
}

function positive(n: number | null | undefined): number | null {
  return n != null && Number.isFinite(n) && n > 0 ? n : null;
}

function num(n: number | null | undefined, fallback: number): number {
  return n != null && Number.isFinite(n) && n > 0 ? n : fallback;
}

function ceilDiv(a: number, b: number): number {
  if (b <= 0 || a <= 0) return 0;
  return Math.ceil(a / b);
}

/** Map core ID (mm) → packaging-core-76 | 77 | 152 family. */
export function coreFamilyKeyFromInsideMm(insideMm: number): '76' | '77' | '152' {
  if (insideMm >= 140) return '152';
  if (insideMm >= 76.5) return '77';
  return '76';
}

export function stretchFractionPerPallet(cfg: PackagingConfig): number {
  const L = num(cfg.palletFootprintLm, DEFAULT_PALLET_FOOTPRINT_L_M);
  const W = num(cfg.palletFootprintWm, DEFAULT_PALLET_FOOTPRINT_W_M);
  const layers = num(cfg.stretchWrapLayers, DEFAULT_STRETCH_WRAP_LAYERS);
  const perimeterM = 2 * (L + W);
  const filmLengthPerLayerM = perimeterM + L;
  const filmLengthPerPalletM = filmLengthPerLayerM * layers;
  return filmLengthPerPalletM / STRETCH_ROLL_LENGTH_M;
}

export function ldWrapPerRoll(
  rollOdMm: number,
  cfg: PackagingConfig
): { areaM2: number; kg: number } {
  const passes = num(cfg.ldWrapPasses, DEFAULT_LD_WRAP_PASSES);
  const filmWidthMm = num(cfg.ldWrapFilmWidthMm, DEFAULT_LD_WRAP_FILM_WIDTH_MM);
  const gsm = num(cfg.ldWrapGsm, DEFAULT_LD_WRAP_GSM);
  if (rollOdMm <= 0) return { areaM2: 0, kg: 0 };
  const circumferenceM = (Math.PI * rollOdMm) / 1000;
  const filmLengthM = circumferenceM * passes;
  const areaM2 = filmLengthM * (filmWidthMm / 1000);
  const kg = (areaM2 * gsm) / 1000;
  return { areaM2, kg };
}

function lineCost(
  role: PackagingRole,
  label: string,
  qty: number,
  qtyUnit: string,
  material: Material | undefined,
  orderKg: number,
  totalGsm: number,
  detail?: Record<string, number>
): PackagingCostLine {
  const { unitPriceUsd, priceUnit, needsReview } = resolvePackagingUnitPrice(material);
  const costJobUsd = !needsReview && unitPriceUsd != null ? qty * unitPriceUsd : 0;
  const costPerKgUsd = orderKg > 0 ? costJobUsd / orderKg : 0;
  const costPerM2Usd = totalGsm > 0 ? (costPerKgUsd * totalGsm) / 1000 : 0;
  return {
    role,
    label,
    qty,
    qtyUnit,
    unitPriceUsd: needsReview ? null : unitPriceUsd,
    priceUnit,
    costJobUsd,
    costPerKgUsd,
    costPerM2Usd,
    needsReview: needsReview || (qty > 0 && (unitPriceUsd == null || unitPriceUsd <= 0)),
    detail,
  };
}

function mat(
  materials: Map<string, Material>,
  id: string | null | undefined
): Material | undefined {
  if (!id) return undefined;
  return materials.get(id);
}

function findByPlatformKey(
  materials: Map<string, Material>,
  key: string
): Material | undefined {
  for (const m of materials.values()) {
    if (m.platformMasterKey === key) return m;
  }
  return undefined;
}

function resolveCoreMaterial(
  materials: Map<string, Material>,
  cfg: PackagingConfig,
  coreInsideMm: number
): Material | undefined {
  const byId = mat(materials, cfg.coreMaterialId);
  if (byId) return byId;
  const family = coreFamilyKeyFromInsideMm(coreInsideMm);
  return findByPlatformKey(materials, `packaging-core-${family}`);
}

function resolveRoleMaterial(
  materials: Map<string, Material>,
  cfg: PackagingConfig,
  role: Exclude<PackagingRole, 'core'>,
  defaultKey: string
): Material | undefined {
  const idKey =
    role === 'ld_wrap'
      ? cfg.ldWrapMaterialId
      : role === 'stretch'
        ? cfg.stretchMaterialId
        : role === 'pallet'
          ? cfg.palletMaterialId
          : cfg.cartonMaterialId;
  return mat(materials, idKey) ?? findByPlatformKey(materials, defaultKey);
}

function resolveCartonMaterial(
  materials: Map<string, Material>,
  cfg: PackagingConfig,
  productType: string,
  packOdMm: number
): Material | undefined {
  if (cfg.cartonMaterialId) return mat(materials, cfg.cartonMaterialId);
  const key =
    productType === 'sleeve'
      ? cartonPlatformKeyForOd(packOdMm)
      : 'packaging-carton-default';
  return (
    findByPlatformKey(materials, key) ??
    findByPlatformKey(materials, 'packaging-carton-default')
  );
}

function buildRollSpecFromDims(
  dims: EstimateDimensions,
  totalGsm: number,
  filmDensity: number,
  reelWidthMm: number,
  opts?: { forceOdMm?: number }
): RollSpecResult {
  const coreInside =
    dims.coreInsideDiameterMm != null && dims.coreInsideDiameterMm > 0
      ? dims.coreInsideDiameterMm
      : CORE_INSIDE_MM_BY_INCH[DEFAULT_CORE_INCH];
  const coreThickness =
    dims.coreThicknessMm != null && Number.isFinite(dims.coreThicknessMm)
      ? dims.coreThicknessMm
      : DEFAULT_CORE_THICKNESS_MM;
  const cutoff = dims.cutoffMm != null && dims.cutoffMm > 0 ? dims.cutoffMm : 600;
  const ppc = dims.piecesPerCut != null && dims.piecesPerCut > 0 ? dims.piecesPerCut : 1;

  if (opts?.forceOdMm != null && opts.forceOdMm > 0) {
    return computeRollSpec({
      reelWidthMm,
      cutoffMm: cutoff,
      piecesPerCut: ppc,
      totalGsm,
      filmDensityGcm3: filmDensity,
      coreInsideDiameterMm: coreInside,
      coreThicknessMm: coreThickness,
      requiredRollWeightKg: 0,
      rollOutsideDiameterMm: opts.forceOdMm,
      driver: 'od',
    });
  }

  const odDriven = dims.rollSpecOdDriven === 1;
  const od =
    dims.rollOutsideDiameterMm != null && dims.rollOutsideDiameterMm > 0
      ? dims.rollOutsideDiameterMm
      : DEFAULT_TARGET_OD_MM;
  const weight =
    dims.requiredRollWeightKg != null && dims.requiredRollWeightKg > 0
      ? dims.requiredRollWeightKg
      : 0;

  return computeRollSpec({
    reelWidthMm,
    cutoffMm: cutoff,
    piecesPerCut: ppc,
    totalGsm,
    filmDensityGcm3: filmDensity,
    coreInsideDiameterMm: coreInside,
    coreThicknessMm: coreThickness,
    requiredRollWeightKg: weight,
    rollOutsideDiameterMm: od,
    driver: odDriven ? 'od' : 'weight',
  });
}

/**
 * Core tube length (m) = reel width × roll count.
 * PB sells cores $/m of tube axis length (≈ finished reel width), not film running metres.
 */
export function coreMetersForJob(reelWidthMm: number, rollsInOrder: number): number {
  if (reelWidthMm <= 0 || rollsInOrder <= 0) return 0;
  return (reelWidthMm / 1000) * rollsInOrder;
}

/** Platform / template defaults for packaging config (user-overridable on estimate). */
export function defaultPackagingConfig(): PackagingConfig {
  return {
    loadPerPalletKg: DEFAULT_LOAD_PER_PALLET_KG,
    cartonsPerPallet: DEFAULT_CARTONS_PER_PALLET,
    pcsPerCarton: DEFAULT_PCS_PER_CARTON,
    ldWrapPasses: DEFAULT_LD_WRAP_PASSES,
    ldWrapFilmWidthMm: DEFAULT_LD_WRAP_FILM_WIDTH_MM,
    ldWrapGsm: DEFAULT_LD_WRAP_GSM,
    stretchWrapLayers: DEFAULT_STRETCH_WRAP_LAYERS,
    palletFootprintLm: DEFAULT_PALLET_FOOTPRINT_L_M,
    palletFootprintWm: DEFAULT_PALLET_FOOTPRINT_W_M,
  };
}

/** Merge saved/partial config over platform defaults (nullish fields filled). */
export function mergePackagingConfigDefaults(
  partial?: PackagingConfig | null
): PackagingConfig {
  const base = defaultPackagingConfig();
  if (!partial) return base;
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(partial).filter(([, v]) => v !== undefined && v !== null)
    ),
  };
}

function emptyDetail(): PackagingCostDetail {
  return {
    lines: [],
    totalCostPerKg: 0,
    totalCostPerM2: 0,
    needsReview: false,
    rollsInOrder: 0,
    palletsInOrder: 0,
    cartonsNeeded: 0,
    rollWeightKg: 0,
  };
}

function finalize(lines: PackagingCostLine[], meta: Omit<PackagingCostDetail, 'lines' | 'totalCostPerKg' | 'totalCostPerM2' | 'needsReview'>): PackagingCostDetail {
  const totalCostPerKg = lines.reduce((s, l) => s + l.costPerKgUsd, 0);
  const totalCostPerM2 = lines.reduce((s, l) => s + l.costPerM2Usd, 0);
  const needsReview = lines.some((l) => l.needsReview);
  return { lines, totalCostPerKg, totalCostPerM2, needsReview, ...meta };
}

export function calculatePackagingCosts(
  estimate: Estimate,
  materials: Map<string, Material>,
  opts: {
    orderQuantityKg: number;
    totalGsm: number;
    filmDensity: number;
    piecesPerKg: number;
  }
): PackagingCostDetail {
  const orderKg = opts.orderQuantityKg;
  const totalGsm = opts.totalGsm;
  if (orderKg <= 0 || totalGsm <= 0) return emptyDetail();

  const dims = estimate.dimensions;
  const productType = dims?.productType;
  if (!productType) return emptyDetail();

  const cfg: PackagingConfig = mergePackagingConfigDefaults(estimate.packagingConfig);

  if (productType === 'roll') {
    return costRoll(estimate, materials, cfg, opts);
  }
  if (productType === 'sleeve') {
    return costSleeve(estimate, materials, cfg, opts);
  }
  if (productType === 'pouch' || productType === 'bag') {
    return costPouchBag(estimate, materials, cfg, opts);
  }
  return emptyDetail();
}

function costRoll(
  estimate: Estimate,
  materials: Map<string, Material>,
  cfg: PackagingConfig,
  opts: { orderQuantityKg: number; totalGsm: number; filmDensity: number; piecesPerKg: number }
): PackagingCostDetail {
  const dims = estimate.dimensions!;
  const reelWidthMm = dims.reelWidthMm ?? 0;
  if (reelWidthMm <= 0) return emptyDetail();

  const rollSpec = buildRollSpecFromDims(dims, opts.totalGsm, opts.filmDensity, reelWidthMm);
  const rollWeightKg = rollSpec.totalRollWeightKg;
  if (rollWeightKg <= 0) return emptyDetail();

  const rollsInOrder = opts.orderQuantityKg / rollWeightKg;
  const loadPerPallet = num(cfg.loadPerPalletKg, DEFAULT_LOAD_PER_PALLET_KG);
  const palletsInOrder = ceilDiv(opts.orderQuantityKg, loadPerPallet);

  const coreInside =
    dims.coreInsideDiameterMm != null && dims.coreInsideDiameterMm > 0
      ? dims.coreInsideDiameterMm
      : CORE_INSIDE_MM_BY_INCH[DEFAULT_CORE_INCH];

  const coreM = mat(materials, cfg.coreMaterialId) ?? resolveCoreMaterial(materials, cfg, coreInside);
  const ldM = resolveRoleMaterial(materials, cfg, 'ld_wrap', 'packaging-ld-wrap-film');
  const stretchM = resolveRoleMaterial(materials, cfg, 'stretch', 'packaging-stretch-wrap-roll');
  const palletM = resolveRoleMaterial(materials, cfg, 'pallet', 'packaging-pallet-wood');

  const coreQty = coreMetersForJob(reelWidthMm, rollsInOrder);
  const wrap = ldWrapPerRoll(rollSpec.rollOutsideDiameterMm, cfg);
  const wrapKg = wrap.kg * rollsInOrder;
  const stretchFrac = stretchFractionPerPallet(cfg);
  const stretchQty = stretchFrac * palletsInOrder;

  const lines: PackagingCostLine[] = [
    lineCost('core', 'Core', coreQty, 'm', coreM, opts.orderQuantityKg, opts.totalGsm, {
      rollsInOrder,
      reelWidthMm,
    }),
    lineCost('ld_wrap', 'Roll wrap (LD)', wrapKg, 'kg', ldM, opts.orderQuantityKg, opts.totalGsm, {
      wrapKgPerRoll: wrap.kg,
      wrapAreaM2PerRoll: wrap.areaM2,
      rollOdMm: rollSpec.rollOutsideDiameterMm,
    }),
    lineCost('stretch', 'Stretch wrap', stretchQty, 'roll', stretchM, opts.orderQuantityKg, opts.totalGsm, {
      stretchFraction: stretchFrac,
      palletsInOrder,
    }),
    lineCost('pallet', 'Pallet', palletsInOrder, 'pc', palletM, opts.orderQuantityKg, opts.totalGsm, {
      loadPerPalletKg: loadPerPallet,
      rollsPerPallet: Math.floor(loadPerPallet / rollWeightKg),
    }),
  ];

  return finalize(lines, {
    rollsInOrder,
    palletsInOrder,
    cartonsNeeded: 0,
    rollWeightKg,
  });
}

function costSleeve(
  estimate: Estimate,
  materials: Map<string, Material>,
  cfg: PackagingConfig,
  opts: { orderQuantityKg: number; totalGsm: number; filmDensity: number; piecesPerKg: number }
): PackagingCostDetail {
  const dims = estimate.dimensions!;
  const layFlatMm = dims.layFlatValue ?? dims.reelWidthMm ?? 0;
  if (layFlatMm <= 0) return emptyDetail();

  const packSpec = buildRollSpecFromDims(dims, opts.totalGsm, opts.filmDensity, layFlatMm, {
    forceOdMm: SLEEVE_PACK_TARGET_OD_MM,
  });
  const rollWeightKg = packSpec.totalRollWeightKg;
  if (rollWeightKg <= 0) return emptyDetail();

  const sleeveRollsInOrder = ceilDiv(opts.orderQuantityKg, rollWeightKg);
  const cartonsNeeded = sleeveRollsInOrder;
  const cartonsPerPallet = num(cfg.cartonsPerPallet, DEFAULT_CARTONS_PER_PALLET);
  const palletsInOrder = ceilDiv(cartonsNeeded, cartonsPerPallet);

  const coreInside =
    dims.coreInsideDiameterMm != null && dims.coreInsideDiameterMm > 0
      ? dims.coreInsideDiameterMm
      : CORE_INSIDE_MM_BY_INCH[DEFAULT_CORE_INCH];

  const coreM = resolveCoreMaterial(materials, cfg, coreInside);
  const cartonM = resolveCartonMaterial(materials, cfg, 'sleeve', SLEEVE_PACK_TARGET_OD_MM);
  const stretchM = resolveRoleMaterial(materials, cfg, 'stretch', 'packaging-stretch-wrap-roll');
  const palletM = resolveRoleMaterial(materials, cfg, 'pallet', 'packaging-pallet-wood');

  const coreQty = coreMetersForJob(layFlatMm, sleeveRollsInOrder);
  const stretchFrac = stretchFractionPerPallet(cfg);
  const stretchQty = stretchFrac * palletsInOrder;

  const lines: PackagingCostLine[] = [
    lineCost('core', 'Core', coreQty, 'm', coreM, opts.orderQuantityKg, opts.totalGsm, {
      sleeveRollsInOrder,
      packOdMm: SLEEVE_PACK_TARGET_OD_MM,
    }),
    lineCost('carton', 'Carton', cartonsNeeded, 'pc', cartonM, opts.orderQuantityKg, opts.totalGsm, {
      rollsPerCarton: 1,
      sleeveRollWeightKg: rollWeightKg,
      cartonOdMm: SLEEVE_PACK_TARGET_OD_MM,
    }),
    lineCost('stretch', 'Stretch wrap', stretchQty, 'roll', stretchM, opts.orderQuantityKg, opts.totalGsm, {
      stretchFraction: stretchFrac,
      palletsInOrder,
    }),
    lineCost('pallet', 'Pallet', palletsInOrder, 'pc', palletM, opts.orderQuantityKg, opts.totalGsm, {
      cartonsPerPallet,
    }),
  ];

  return finalize(lines, {
    rollsInOrder: sleeveRollsInOrder,
    palletsInOrder,
    cartonsNeeded,
    rollWeightKg,
  });
}

function costPouchBag(
  estimate: Estimate,
  materials: Map<string, Material>,
  cfg: PackagingConfig,
  opts: { orderQuantityKg: number; totalGsm: number; filmDensity: number; piecesPerKg: number }
): PackagingCostDetail {
  const piecesPerKg = opts.piecesPerKg;
  if (piecesPerKg <= 0) return emptyDetail();

  const piecesInOrder = opts.orderQuantityKg * piecesPerKg;
  const pcsPerCarton = num(cfg.pcsPerCarton, DEFAULT_PCS_PER_CARTON);
  const cartonsNeeded = ceilDiv(piecesInOrder, pcsPerCarton);
  const cartonsPerPallet = num(cfg.cartonsPerPallet, DEFAULT_CARTONS_PER_PALLET);
  const palletsInOrder = ceilDiv(cartonsNeeded, cartonsPerPallet);

  const cartonM = resolveCartonMaterial(materials, cfg, 'pouch', 0);
  const stretchM = resolveRoleMaterial(materials, cfg, 'stretch', 'packaging-stretch-wrap-roll');
  const palletM = resolveRoleMaterial(materials, cfg, 'pallet', 'packaging-pallet-wood');

  const stretchFrac = stretchFractionPerPallet(cfg);
  const stretchQty = stretchFrac * palletsInOrder;

  const lines: PackagingCostLine[] = [
    lineCost('carton', 'Carton', cartonsNeeded, 'pc', cartonM, opts.orderQuantityKg, opts.totalGsm, {
      pcsPerCarton,
      piecesInOrder,
    }),
    lineCost('stretch', 'Stretch wrap', stretchQty, 'roll', stretchM, opts.orderQuantityKg, opts.totalGsm, {
      stretchFraction: stretchFrac,
      palletsInOrder,
    }),
    lineCost('pallet', 'Pallet', palletsInOrder, 'pc', palletM, opts.orderQuantityKg, opts.totalGsm, {
      cartonsPerPallet,
    }),
  ];

  return finalize(lines, {
    rollsInOrder: 0,
    palletsInOrder,
    cartonsNeeded,
    rollWeightKg: 0,
  });
}
