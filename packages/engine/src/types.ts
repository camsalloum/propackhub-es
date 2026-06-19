// Core types for the Estimation Studio engine
// Based on Laravel legacy structure and PRD requirements

export type LayerType = 'substrate' | 'ink' | 'adhesive';

export interface Material {
  id: string;
  name: string;
  type: LayerType;
  solidPercent: number; // 30 for Ink SB, 100 for Ink UV, 100 for substrates/adhesives
  density: number; // g/cm³
  costPerKgUsd: number;
  wastePercent: number;
  isSolventBased?: boolean; // True for SB ink/adhesive (replaces name.includes('SB') check)
}

export interface Layer {
  id: string | number;
  materialId: string;
  material?: Material; // Populated when loaded
  micron: number;
  position: number;
  // Calculated fields
  gsm?: number;
  costPerM2?: number;
  // Some legacy tests reference costPerKg; keep optional for compatibility
  costPerKg?: number;
}

export interface EstimateDimensions {
  productType: 'roll' | 'sleeve' | 'pouch';
  // Roll/Sleeve fields
  reelWidthMm?: number;
  cutoffMm?: number;
  extraPrintingTrimMm?: number;
  numberOfUps?: number;
  piecesPerCut?: number;
  // Pouch fields
  openWidthMm?: number;
  openHeightMm?: number;
  layFlatValue?: number;
  // Common
  printingWebClass: 'wide_web' | 'narrow_web'; // Wide Web = Ink SB, Narrow Web = Ink UV
}

export interface Slab {
  quantityKg: number;
  pricePerKg: number; // In display currency
  total?: number; // Calculated
}

export interface Process {
  id: string;
  name: string;
  costPerHour: number;
  speedBasis: 'kg_per_hour' | 'm_per_min' | 'pcs_per_min';
  speedValue: number;
  setupHours: number;
  runHours?: number; // Calculated
  totalCost?: number; // Calculated
  enabled: boolean;
}

export interface Estimate {
  id: string;
  tenantId: string;
  customerId?: string;
  jobName: string;
  status: 'draft' | 'sent' | 'won' | 'lost';
  
  // Structure
  layers: Layer[];
  dimensions: EstimateDimensions;
  
  // Pricing
  markupPercent: number;
  platesPerKg: number; // In display currency
  deliveryPerKg: number; // In display currency
  processes: Process[];
  slabs: Slab[];
  
  // Solvent mix config (for SB ink/adhesive)
  solventCostPerKgUsd?: number; // Cost of solvent in USD (default: 2.0)
  solventRatio?: number; // Ratio (0-1) (default: 0.5)
  
  // Currency
  displayCurrencyCode: string;
  exchangeRateUsdToDisplay: number;
  
  // Metadata
  sourceEstimationId?: string; // For re-quote tracking
  createdAt?: Date;
  updatedAt?: Date;
  
  // Calculated fields (output)
  totalGsm?: number;
  totalMicron?: number;
  filmDensity?: number;
  sqmPerKg?: number;
  piecesPerKg?: number;
  gramsPerPiece?: number;
  linearMPerKgWeb?: number;
  linearMPerKgReel?: number;
  
  // Cost breakdown
  materialCostPerKg?: number;
  markupAmountPerKg?: number;
  operationCostPerKg?: number;
  salePricePerKg?: number;
  
  // Solvent mix (when SB ink/adhesive present)
  solventMixCostPerKg?: number;
  solventMixRatio?: number;
  
  // Order quantities
  orderQuantityKg: number;
  orderQuantityKpcs?: number;
  orderQuantitySqm?: number;
  orderQuantityMeters?: number;
}

export interface CalculationResult {
  estimate: Estimate;
  slabs: Slab[];
  costBreakdown: {
    materialPercent: number;
    wastePercent: number;
    markupPercent: number;
    processPercent: number;
  };
  warnings: string[];
}

export interface VisibilityProfile {
  // Structure & spec
  structureLayers: boolean;
  layerMicrons: boolean;
  dimensions: boolean;
  totalGsm: boolean;
  printingWebClass: boolean;
  
  // Dimensions
  productDimensionInputs: boolean;
  printingWebWidth: boolean;
  filmDensity: boolean;
  gramsPerPiece: boolean;
  
  // Dimensions — internal yield
  yieldConversions: boolean;
  rollAfterSlitting: boolean;
  orderQtyUnitBreakdown: boolean;
  alternatePriceUnits: boolean;
  
  // Costing
  materialCostPerKg: boolean;
  costPerSqm: boolean;
  rmCostPerKg: boolean;
  markupPercent: boolean;
  markupAmount: boolean;
  platesPerKg: boolean;
  deliveryPerKg: boolean;
  operationCost: boolean;
  costBreakdown: boolean;
  solventMixCost: boolean;
  
  // Output
  sellingPrice: boolean;
  slabTable: boolean;
  proposalPdf: boolean;
}