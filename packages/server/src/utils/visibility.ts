import type { CalculationResult, VisibilityProfile } from '@es/engine';

/** Keys for Settings customize grid */
export const VISIBILITY_PROFILE_KEYS: Array<keyof VisibilityProfile> = [
  'structureLayers', 'layerMicrons', 'dimensions', 'totalGsm', 'printingWebClass',
  'productDimensionInputs', 'printingWebWidth', 'filmDensity', 'gramsPerPiece',
  'yieldConversions', 'rollAfterSlitting', 'orderQtyUnitBreakdown', 'alternatePriceUnits',
  'materialCostPerKg', 'costPerSqm', 'rmCostPerKg', 'markupPercent', 'markupAmount',
  'platesPerKg', 'deliveryPerKg', 'operationCost', 'costBreakdown', 'solventMixCost',
  'sellingPrice', 'slabTable', 'proposalPdf',
];

export const VISIBILITY_LABELS: Record<keyof VisibilityProfile, string> = {
  structureLayers: 'Layer stack',
  layerMicrons: 'Layer microns',
  dimensions: 'Dimensions',
  totalGsm: 'Total GSM / µ',
  printingWebClass: 'Printing web class',
  productDimensionInputs: 'Dimension inputs',
  printingWebWidth: 'Printing web width',
  filmDensity: 'Film density',
  gramsPerPiece: 'Grams per piece',
  yieldConversions: 'Yield conversions',
  rollAfterSlitting: 'Roll after slitting',
  orderQtyUnitBreakdown: 'Order qty breakdown',
  alternatePriceUnits: 'Alternate price units',
  materialCostPerKg: 'Material cost/kg',
  costPerSqm: 'Cost per m²',
  rmCostPerKg: 'RM cost/kg',
  markupPercent: 'Markup %',
  markupAmount: 'Markup amount',
  platesPerKg: 'Plates/kg',
  deliveryPerKg: 'Delivery/kg',
  operationCost: 'Operation cost',
  costBreakdown: 'Cost breakdown',
  solventMixCost: 'Solvent mix',
  sellingPrice: 'Selling price',
  slabTable: 'Slab table',
  proposalPdf: 'Proposal PDF',
};

export const DEFAULT_SALES_REP_PROFILE: VisibilityProfile = {
  structureLayers: true,
  layerMicrons: true,
  dimensions: true,
  totalGsm: true,
  printingWebClass: true,
  productDimensionInputs: true,
  printingWebWidth: true,
  filmDensity: true,
  gramsPerPiece: false, // PRD §6.8: false for sales rep
  yieldConversions: false,
  rollAfterSlitting: false,
  orderQtyUnitBreakdown: false,
  alternatePriceUnits: false, // PRD §6.8: false for sales rep
  materialCostPerKg: false,
  costPerSqm: false,
  rmCostPerKg: false,
  markupPercent: false,
  markupAmount: false,
  platesPerKg: false,
  deliveryPerKg: false,
  operationCost: false,
  costBreakdown: false,
  solventMixCost: false,
  sellingPrice: true,
  slabTable: true,
  proposalPdf: true,
};

export const DEFAULT_ADMIN_PROFILE: VisibilityProfile = {
  structureLayers: true,
  layerMicrons: true,
  dimensions: true,
  totalGsm: true,
  printingWebClass: true,
  productDimensionInputs: true,
  printingWebWidth: true,
  filmDensity: true,
  gramsPerPiece: true,
  yieldConversions: true,
  rollAfterSlitting: true,
  orderQtyUnitBreakdown: true,
  alternatePriceUnits: true,
  materialCostPerKg: true,
  costPerSqm: true,
  rmCostPerKg: true,
  markupPercent: true,
  markupAmount: true,
  platesPerKg: true,
  deliveryPerKg: true,
  operationCost: true,
  costBreakdown: true,
  solventMixCost: true,
  sellingPrice: true,
  slabTable: true,
  proposalPdf: true,
};

function parseVisibilityProfile(value: unknown): VisibilityProfile | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as VisibilityProfile;
    } catch {
      return undefined;
    }
  }

  if (typeof value === 'object') {
    return value as VisibilityProfile;
  }

  return undefined;
}

function getDefaultProfile(role: string): VisibilityProfile {
  if (role === 'tenant_admin' || role === 'platform_admin') {
    return DEFAULT_ADMIN_PROFILE;
  }

  return DEFAULT_SALES_REP_PROFILE;
}

export function getEffectiveProfile(role: string, storedProfile?: unknown): VisibilityProfile {
  const base = getDefaultProfile(role);
  const customProfile = parseVisibilityProfile(storedProfile);

  if (!customProfile) {
    return base;
  }

  // Merge so newer keys (e.g. solventMixCost) inherit role defaults when absent from saved JSON.
  return { ...base, ...customProfile };
}

export function stripEstimateRow(row: any, profile: VisibilityProfile): any {
  const visible: any = {
    id: row.id,
    refNumber: row.refNumber,
    jobName: row.jobName,
    customerId: row.customerId,
    status: row.status,
    productType: row.productType,
    printingWebClass: row.printingWebClass,
    dimensions: row.dimensions,
    displayCurrency: row.displayCurrency,
    exchangeRateUsdToDisplay: row.exchangeRateUsdToDisplay,
    totalGsm: row.totalGsm,
    totalMicron: row.totalMicron,
    salePricePerKg: row.salePricePerKg,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    masterDataVersion: row.masterDataVersion,
    sourceTemplateKey: row.sourceTemplateKey,
    sourceEstimationId: row.sourceEstimationId,
    productSubtype: row.productSubtype,
  };

  if (profile.markupPercent) {
    visible.markupPercent = row.markupPercent;
    // Pricing model v2 inputs (cost-sensitive — gated with markup).
    visible.pricingMethod = row.pricingMethod;
    visible.marginValuePerKgUsd = row.marginValuePerKgUsd;
    visible.cormPerKgUsd = row.cormPerKgUsd;
    visible.toolingChargeUsd = row.toolingChargeUsd;
    visible.toolingBilledToCustomer = row.toolingBilledToCustomer;
    visible.deliveryChargeUsd = row.deliveryChargeUsd;
  }
  // Delivery term is quote metadata (not a cost) — always returned.
  visible.deliveryTerm = row.deliveryTerm;
  // Editable waste bands (quantity → waste %). Not cost-sensitive on their own.
  visible.wasteBands = row.wasteBands;

  if (profile.materialCostPerKg) {
    visible.materialCostPerKg = row.materialCostPerKg ?? row.materialCostPerKgUsd;
  }

  if (profile.platesPerKg) {
    visible.platesPerKg = row.platesPerKg;
  }

  if (profile.deliveryPerKg) {
    visible.deliveryPerKg = row.deliveryPerKg;
  }

  if (profile.filmDensity) {
    visible.filmDensity = row.filmDensity;
  }

  if (profile.solventMixCost) {
    visible.solventMaterialId = row.solventMaterialId;
    visible.solventCostPerKgUsd = row.solventCostPerKgUsd;
    visible.solventRatio = row.solventRatio;
    visible.laminationRecipeOverrides = row.laminationRecipeOverrides;
    visible.cleaningSolventKgPerJob = row.cleaningSolventKgPerJob;
    visible.inkPrintingProcess = row.inkPrintingProcess;
  }

  // Phase 2/3: Structure fork & process customization state (UI flags, not cost-sensitive)
  visible.structureForked = Boolean(row.structureForked);
  visible.processesCustomized = Boolean(row.processesCustomized);
  visible.structureSignature = row.structureSignature ?? null;

  visible.orderQuantityKg = row.orderQuantityKg;
  visible.orderQuantityUnit = row.orderQuantityUnit;

  if (profile.costBreakdown) {
    visible.costBreakdown = row.costBreakdown ?? null;
  }

  return visible;
}

export function stripMaterialRow(row: any, profile: VisibilityProfile): any {
  const visible = { ...row };

  if (!profile.materialCostPerKg && !profile.rmCostPerKg) {
    delete visible.costPerKgUsd;
  }

  return visible;
}

export function stripCalculationResult(result: CalculationResult, profile: VisibilityProfile): any {
  const estimate: any = {
    ...result.estimate,
    layers: result.estimate.layers?.map(layer => {
      const copy = { ...layer };
      if (!profile.costPerSqm) {
        delete copy.costPerM2;
      }
      if (!profile.materialCostPerKg && !profile.rmCostPerKg) {
        delete copy.material;
      }
      return copy;
    }),
  };

  if (!profile.filmDensity) {
    delete estimate.filmDensity;
  }

  if (!profile.materialCostPerKg) {
    delete estimate.materialCostPerKg;
  }

  if (!profile.markupPercent) {
    delete estimate.markupPercent;
  }

  if (!profile.markupAmount) {
    delete estimate.markupAmountPerKg;
  }

  if (!profile.platesPerKg) {
    delete estimate.platesPerKg;
  }

  if (!profile.deliveryPerKg) {
    delete estimate.deliveryPerKg;
  }

  if (!profile.operationCost) {
    delete estimate.operationCostPerKg;
  }

  if (!profile.solventMixCost) {
    delete estimate.solventMixCostPerKg;
    delete estimate.solventMixCostPerM2;
    delete estimate.solventMixRatio;
    delete estimate.layerRmCostPerKg;
    delete estimate.layerRmCostPerM2;
    delete estimate.rmCostPerM2;
    delete estimate.laminationSolventCostPerKg;
    delete estimate.laminationSolventCostPerM2;
    delete estimate.inkMakeupSolventCostPerKg;
    delete estimate.inkMakeupSolventCostPerM2;
    delete estimate.cleaningSolventCostPerKg;
    delete estimate.cleaningSolventCostPerM2;
  }

  const stripped: any = {
    ...result,
    estimate,
  };

  if (!profile.costBreakdown) {
    stripped.costBreakdown = null;
  }

  return stripped;
}
