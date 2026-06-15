/**
 * Visibility Profile Enforcement
 * Strips hidden fields from API responses based on user's visibility profile
 * Decision #20: Sales rep sees only selling price, admin sees full cost breakdown
 */

export interface VisibilityProfile {
  // Cost breakdown
  showMarkupPercent: boolean;
  showMaterialCost: boolean;
  showCostPerM2: boolean;
  showPlateCost: boolean;
  showDeliveryCost: boolean;
  showOperationCost: boolean;
  showCostBreakdownPercent: boolean;
  
  // Material library
  showLibraryPrices: boolean;
  
  // Solvent mix
  showSolventCost: boolean;
  
  // Calculations
  showYieldConversions: boolean;
  showRollAfterSlittingDetail: boolean;
  
  // Alternate pricing
  showAlternateUnitPrices: boolean;
}

// Predefined profiles
export const VISIBILITY_PROFILES: Record<string, VisibilityProfile> = {
  sales_rep: {
    showMarkupPercent: false,
    showMaterialCost: false,
    showCostPerM2: false,
    showPlateCost: false,
    showDeliveryCost: false,
    showOperationCost: false,
    showCostBreakdownPercent: false,
    showLibraryPrices: false,
    showSolventCost: false,
    showYieldConversions: false,
    showRollAfterSlittingDetail: false,
    showAlternateUnitPrices: false,
  },
  
  tenant_admin: {
    showMarkupPercent: true,
    showMaterialCost: true,
    showCostPerM2: true,
    showPlateCost: true,
    showDeliveryCost: true,
    showOperationCost: true,
    showCostBreakdownPercent: true,
    showLibraryPrices: true,
    showSolventCost: true,
    showYieldConversions: true,
    showRollAfterSlittingDetail: true,
    showAlternateUnitPrices: true,
  },
  
  platform_admin: {
    showMarkupPercent: true,
    showMaterialCost: true,
    showCostPerM2: true,
    showPlateCost: true,
    showDeliveryCost: true,
    showOperationCost: true,
    showCostBreakdownPercent: true,
    showLibraryPrices: true,
    showSolventCost: true,
    showYieldConversions: true,
    showRollAfterSlittingDetail: true,
    showAlternateUnitPrices: true,
  },
};

/**
 * Strip hidden fields from estimate based on user's visibility profile
 */
export function applyVisibilityToEstimate(estimate: any, profileName: string): any {
  const profile = VISIBILITY_PROFILES[profileName] || VISIBILITY_PROFILES.sales_rep;
  
  const visible: any = {
    id: estimate.id,
    refNumber: estimate.refNumber,
    jobName: estimate.jobName,
    customerId: estimate.customerId,
    status: estimate.status,
    productType: estimate.productType,
    printingWebClass: estimate.printingWebClass,
    dimensions: estimate.dimensions,
    displayCurrency: estimate.displayCurrency,
    exchangeRateUsdToDisplay: estimate.exchangeRateUsdToDisplay,
    
    // Always visible
    totalGsm: estimate.totalGsm,
    totalMicron: estimate.totalMicron,
    salePricePerKg: estimate.salePricePerKg,
    
    // Structure always visible
    layers: estimate.layers?.map((layer: any) => ({
      id: layer.id,
      materialId: layer.materialId,
      position: layer.position,
      micron: layer.micron,
      gsm: layer.gsm,
      ...(profile.showCostPerM2 && { costPerM2: layer.costPerM2 }),
    })),
    
    // Slabs always visible (price only)
    slabs: estimate.slabs,
    
    createdAt: estimate.createdAt,
    updatedAt: estimate.updatedAt,
  };
  
  // Conditional fields
  if (profile.showMarkupPercent) {
    visible.markupPercent = estimate.markupPercent;
  }
  
  if (profile.showMaterialCost) {
    visible.materialCostPerKg = estimate.materialCostPerKg;
  }
  
  if (profile.showPlateCost) {
    visible.platesPerKg = estimate.platesPerKg;
  }
  
  if (profile.showDeliveryCost) {
    visible.deliveryPerKg = estimate.deliveryPerKg;
  }
  
  if (profile.showOperationCost) {
    visible.processes = estimate.processes;
  }
  
  if (profile.showSolventCost) {
    visible.solventCostPerKgUsd = estimate.solventCostPerKgUsd;
    visible.solventRatio = estimate.solventRatio;
  }
  
  if (profile.showYieldConversions) {
    visible.orderQuantityKg = estimate.orderQuantityKg;
  }
  
  return visible;
}

/**
 * Strip hidden fields from material based on user's visibility profile
 */
export function applyVisibilityToMaterial(material: any, profileName: string): any {
  const profile = VISIBILITY_PROFILES[profileName] || VISIBILITY_PROFILES.sales_rep;
  
  const visible: any = {
    id: material.id,
    name: material.name,
    type: material.type,
    solidPercent: material.solidPercent,
    density: material.density,
    wastePercent: material.wastePercent,
    isSolventBased: material.isSolventBased,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  };
  
  if (profile.showLibraryPrices) {
    visible.costPerKgUsd = material.costPerKgUsd;
  }
  
  return visible;
}

/**
 * Get visibility profile for user role
 */
export function getVisibilityProfile(role: string, customProfile?: string): VisibilityProfile {
  if (customProfile && VISIBILITY_PROFILES[customProfile]) {
    return VISIBILITY_PROFILES[customProfile];
  }
  
  return VISIBILITY_PROFILES[role] || VISIBILITY_PROFILES.sales_rep;
}
