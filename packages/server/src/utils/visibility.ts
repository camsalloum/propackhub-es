import type { CalculationResult, Estimate as EngineEstimate, VisibilityProfile } from '@es/engine';

export const DEFAULT_SALES_REP_PROFILE: VisibilityProfile = {
  structureLayers: true,
  layerMicrons: true,
  dimensions: true,
  totalGsm: true,
  printingWebClass: true,
  productDimensionInputs: true,
  printingWebWidth: true,
  filmDensity: true,
  gramsPerPiece: true,
  yieldConversions: false,
  rollAfterSlitting: false,
  orderQtyUnitBreakdown: false,
  alternatePriceUnits: true,
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
  const customProfile = parseVisibilityProfile(storedProfile);

  if (customProfile) {
    return customProfile;
  }

  return getDefaultProfile(role);
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
  };

  if (profile.markupPercent) {
    visible.markupPercent = row.markupPercent;
  }

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
    visible.solventCostPerKgUsd = row.solventCostPerKgUsd;
    visible.solventRatio = row.solventRatio;
  }

  if (profile.costBreakdown) {
    visible.costBreakdown = row.costBreakdown ?? null;
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
    delete estimate.solventMixRatio;
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
