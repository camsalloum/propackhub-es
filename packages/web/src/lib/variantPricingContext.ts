import {
  DEFAULT_CORM_SCALE_WITH_WASTE,
  DEFAULT_WASTE_BANDS_BY_PRINT_MODE,
  plainCormFromPrinted,
  structureIsPrinted,
  wasteBandsForPrintMode,
  type WasteBand,
} from '@es/engine';
import { runClientCalculation, type ClientCalcMaterial } from './estimateCalc';
import {
  DEFAULT_MASTER_REFERENCE,
  normalizeProductType,
  normalizeUnitValue,
} from './masterDataReference';
import { ALL_SUBTYPES, engineTypeForFamily, type ProductFamily } from './productCatalog';
import { toolingDevelopmentTotal } from './tooling';
import { availablePriceListUnits, type PriceListPricingInput, type PriceListUnit } from './priceListPricing';

const isExwDelivery = (term: string | null | undefined) =>
  String(term ?? '').trim().toUpperCase() === 'EXW';

export type VariantPricingContext = PriceListPricingInput & {
  id: string;
  label: string;
  structureSummary?: string;
  estimateDisplayCurrency: string;
  availableUnits: PriceListUnit[];
  configured: boolean;
};

type MaterialRow = ClientCalcMaterial;

export function buildVariantPricingContext(
  data: Record<string, unknown>,
  materials: MaterialRow[],
  masterReference: typeof DEFAULT_MASTER_REFERENCE,
  tenant: { operatingCostMethod?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group' } | null,
  userPricingMethod?: 'markup' | 'margin_per_kg'
): VariantPricingContext | null {
  const id = String(data.id ?? '');
  if (!id) return null;

  const rawLayers = (data.layers as Array<Record<string, unknown>>) || [];
  const mappedLayers = rawLayers.map((l) => ({
    id: String(l.id ?? crypto.randomUUID()),
    materialId: String(l.materialId ?? l.material_id ?? ''),
    materialType: String(l.materialType ?? l.material_type ?? 'substrate'),
    micron: parseFloat(String(l.micron)) || 0,
    costPerKgUsd:
      parseFloat(String(l.unit_cost_snapshot_usd ?? l.unitCostSnapshotUsd ?? '')) ||
      parseFloat(String(l.materialCostPerKgUsd ?? '')) ||
      0,
  }));

  if (mappedLayers.length === 0 || mappedLayers.some((l) => !l.materialId || l.micron === 0)) {
    return {
      id,
      label: String(data.skuLabel || data.jobName || 'Estimate'),
      structureSummary: String(data.structureSummary || ''),
      configured: false,
      wasteBands: [],
      materialPerKgUsd: 0,
      logisticsPerKgUsd: 0,
      developmentPerKgUsd: 0,
      accessoryPerKgUsd: 0,
      pricingMethod: 'markup',
      markupPercent: 15,
      marginValuePerKgDisplay: 0,
      estimateFxRate: 1,
      estimateDisplayCurrency: String(data.displayCurrency || 'USD'),
      totalGsm: 0,
      piecesPerKg: null,
      lmPerKgReel: null,
      reelWidthMm: 0,
      rollLengthLm: 0,
      availableUnits: ['kg'],
    };
  }

  const productTypeOptions = masterReference.productTypeOptions ?? DEFAULT_MASTER_REFERENCE.productTypeOptions;
  const unitOptions = masterReference.unitOptions ?? DEFAULT_MASTER_REFERENCE.unitOptions;

  const productFamily: ProductFamily = (() => {
    const subtype = data.productSubtype as string | undefined;
    if (subtype) {
      const staticEntry = ALL_SUBTYPES.find((s) => s.key === subtype);
      if (staticEntry) return staticEntry.family;
    }
    return normalizeProductType(data.productType as string, productTypeOptions) as ProductFamily;
  })();

  const engineType = engineTypeForFamily(productFamily);
  const dimensions = (data.dimensions as Record<string, unknown>) || {};
  const accessories = Array.isArray((dimensions as { accessories?: unknown }).accessories)
    ? (dimensions as { accessories: unknown[] }).accessories
    : [];

  const orderQuantityUnit = normalizeUnitValue(
    String(data.orderQuantityUnit || 'kgs'),
    unitOptions
  );
  const unitDef = (
    masterReference as {
      unitRows?: Array<{
        code: string;
        basis: 'kg' | 'pieces' | 'sqm' | 'lm';
        multiplier: number;
        variableMultiplier?: boolean;
      }>;
    }
  ).unitRows?.find((u) => u.code === orderQuantityUnit);

  const orderUnitMultiplier = Number(dimensions.orderUnitMultiplier);
  const orderQuantityUnitDef =
    unitDef && unitDef.variableMultiplier && Number.isFinite(orderUnitMultiplier) && orderUnitMultiplier > 0
      ? { basis: unitDef.basis, multiplier: orderUnitMultiplier }
      : unitDef
        ? { basis: unitDef.basis, multiplier: unitDef.multiplier }
        : undefined;

  const requiresRollLength = unitDef?.variableMultiplier === true;
  const rollLengthLm = Number(dimensions.orderUnitMultiplier) || 0;
  const reelWidthMm = Number(dimensions.reelWidthMm) || 0;

  const allowedUnitBases =
    productFamily === 'pouch' || productFamily === 'bag'
      ? new Set(['kg', 'pieces'])
      : new Set(['kg', 'pieces', 'sqm', 'lm']);

  const patchedMaterials = [...materials];
  const layerInputs = mappedLayers.map((l, i) => {
    const libMat = materials.find((m) => m.id === l.materialId);
    const libraryPrice = libMat
      ? parseFloat(String(libMat.costPerKgUsd)) || 0
      : 0;
    if (libMat && l.costPerKgUsd > 0 && l.costPerKgUsd !== libraryPrice) {
      patchedMaterials.push({ ...libMat, id: l.id, costPerKgUsd: String(l.costPerKgUsd) });
      return { id: l.id, materialId: l.id, micron: l.micron, position: i };
    }
    return { id: l.id, materialId: l.materialId, micron: l.micron, position: i };
  });

  const processes = ((data.processes as Array<Record<string, unknown>>) || []).map((p, i) => ({
    id: String(p.id ?? `proc-${i}`),
    name: String(p.name ?? 'Process'),
    processKey: (p.processKey ?? p.process_key) as string | null | undefined,
    processQuantity: Number(p.processQuantity ?? p.process_quantity ?? 1),
    costPerKgUsd: parseFloat(String(p.costPerKgUsd ?? p.cost_per_kg_usd ?? 0)) || 0,
    costPerHour: parseFloat(String(p.costPerHour ?? p.cost_per_hour ?? 0)) || 0,
    speedBasis: (p.speedBasis ?? p.speed_basis ?? 'kg_per_hour') as 'kg_per_hour' | 'm_per_min' | 'pcs_per_min',
    speedValue: parseFloat(String(p.speedValue ?? p.speed_value ?? 0)) || 0,
    setupHours: parseFloat(String(p.setupHours ?? p.setup_hours ?? 0)) || 0,
    enabled: p.enabled !== false,
  }));

  const slabs = ((data.slabs as Array<Record<string, unknown>>) || []).map((s) => ({
    quantityKg: parseFloat(String(s.quantityKg)) || 0,
    pricePerKg: parseFloat(String(s.pricePerKg)) || 0,
  }));

  const printColorCount =
    data.printColorCount != null && data.printColorCount !== ''
      ? Number(data.printColorCount)
      : null;
  const costPerColor =
    data.costPerColor != null && data.costPerColor !== '' ? Number(data.costPerColor) : null;
  const toolingScenario = (data.toolingScenario as 'new' | 'existing' | 'modification') ?? 'new';
  const billableColorCount =
    data.billableColorCount != null && data.billableColorCount !== ''
      ? Number(data.billableColorCount)
      : null;
  const toolingBillingMode =
    data.toolingBillingMode === 'amortized' ||
    data.toolingBillingMode === 'separate' ||
    data.toolingBillingMode === 'not_billed'
      ? data.toolingBillingMode
      : 'separate';
  const toolingChargeUsd = parseFloat(String(data.toolingChargeUsd)) || 0;
  const deliveryTerm = String(data.deliveryTerm || 'EXW');
  const deliveryChargeUsd = isExwDelivery(deliveryTerm)
    ? 0
    : parseFloat(String(data.deliveryChargeUsd)) || 0;

  const cormPerKgUsd = parseFloat(String(data.cormPerKgUsd)) || 0;
  const cormPerKgPlain =
    data.cormPerKgPlain != null && data.cormPerKgPlain !== ''
      ? parseFloat(String(data.cormPerKgPlain)) || 0
      : plainCormFromPrinted(cormPerKgUsd);

  const wastePrintMode = structureIsPrinted(mappedLayers) ? 'printed' : 'plain';
  const wasteBands: WasteBand[] = wasteBandsForPrintMode(
    masterReference.wasteBandsByPrintMode ?? DEFAULT_WASTE_BANDS_BY_PRINT_MODE,
    wastePrintMode
  );
  const cormScaleWithWaste = masterReference.cormScaleWithWaste ?? DEFAULT_CORM_SCALE_WITH_WASTE;
  const baseCormDisplay =
    wastePrintMode === 'printed'
      ? cormPerKgUsd
      : cormPerKgPlain > 0
        ? cormPerKgPlain
        : plainCormFromPrinted(cormPerKgUsd);

  const moqKg =
    data.moqKg != null && data.moqKg !== '' ? parseFloat(String(data.moqKg)) || null : null;

  let calc;
  try {
    calc = runClientCalculation({
      layers: layerInputs,
      materials: patchedMaterials,
      processes,
      productType: engineType,
      dimensions: { ...dimensions, accessories },
      markupPercent: parseFloat(String(data.markupPercent)) || 15,
      platesPerKg: parseFloat(String(data.platesPerKg)) || 0,
      deliveryPerKg: parseFloat(String(data.deliveryPerKg)) || 0,
      slabs: slabs.length > 0 ? slabs : [{ quantityKg: 1000, pricePerKg: 0 }],
      orderQuantityKg: parseFloat(String(data.orderQuantityKg)) || 1000,
      orderQuantityUnit,
      orderQuantityUnitDef,
      displayCurrency: String(data.displayCurrency || 'USD'),
      exchangeRateUsdToDisplay: parseFloat(String(data.exchangeRateUsdToDisplay)) || 1,
      pricingMethod:
        (data.pricingMethod as 'markup' | 'margin_per_kg' | undefined) ?? userPricingMethod ?? 'markup',
      marginValuePerKgUsd: parseFloat(String(data.marginValuePerKgUsd)) || 0,
      operatingCostMethod: tenant?.operatingCostMethod,
      cormPerKgUsd: baseCormDisplay,
      cormScaleWithWaste,
      toolingChargeUsd:
        printColorCount != null && costPerColor != null
          ? toolingDevelopmentTotal({
              toolingScenario,
              printColorCount,
              billableColorCount,
              costPerColor,
            }) ?? 0
          : toolingChargeUsd,
      toolingBilledToCustomer:
        printColorCount != null && costPerColor != null
          ? toolingBillingMode === 'amortized' &&
            (toolingDevelopmentTotal({
              toolingScenario,
              printColorCount,
              billableColorCount,
              costPerColor,
            }) ?? 0) > 0
          : toolingChargeUsd > 0,
      deliveryTerm,
      deliveryChargeUsd,
      wasteBands,
    });
  } catch {
    return null;
  }

  const ce = calc.estimate;
  const pos = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) && n > 0 ? n : null;
  const piecesPerKg = pos(ce.piecesPerKg);
  const lmPerKgReel = pos(ce.linearMPerKgReel);
  const totalGsm = ce.totalGsm ?? 0;
  const fx = parseFloat(String(data.exchangeRateUsdToDisplay)) || 1;

  const availableUnits = availablePriceListUnits({
    allowedUnitBases,
    totalGsm,
    piecesPerKg,
    lmPerKgReel,
    reelWidthMm,
    requiresRollLength,
    rollLengthLm,
  });

  return {
    id,
    label: String(data.skuLabel || data.jobName || 'Estimate'),
    structureSummary: String(data.structureSummary || ''),
    configured: true,
    wasteBands,
    materialPerKgUsd: ce.materialCostPerKg ?? 0,
    logisticsPerKgUsd: ce.logisticsCostPerKg ?? 0,
    developmentPerKgUsd: ce.developmentCostPerKg ?? 0,
    accessoryPerKgUsd: ce.accessoryCostPerKg ?? 0,
    pricingMethod:
      (data.pricingMethod as 'markup' | 'margin_per_kg' | undefined) ?? userPricingMethod ?? 'markup',
    markupPercent: parseFloat(String(data.markupPercent)) || 15,
    marginValuePerKgDisplay: parseFloat(String(data.marginValuePerKgUsd)) || 0,
    estimateFxRate: fx,
    estimateDisplayCurrency: String(data.displayCurrency || 'USD'),
    totalGsm,
    piecesPerKg,
    lmPerKgReel,
    reelWidthMm,
    rollLengthLm,
    operatingCostMethod: tenant?.operatingCostMethod,
    baseCormDisplay,
    cormScaleWithWaste,
    moqKg,
    availableUnits,
  };
}
