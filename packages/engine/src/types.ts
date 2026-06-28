// Core types for the Estimation Studio engine
// Based on Laravel legacy structure and PRD requirements

import type { LaminationRecipe } from './lamination-recipe';
import type { InkPrintingProcess } from './ink-printing';

export type LayerType = 'substrate' | 'ink' | 'adhesive' | 'solvent';

export interface Material {
  id: string;
  name: string;
  type: LayerType;
  solidPercent: number; // 30 for Ink SB, 100 for Ink UV, 100 for substrates/adhesives
  density: number; // g/cm³
  costPerKgUsd: number;
  wastePercent: number;
  isSolventBased?: boolean; // True for SB ink/adhesive (replaces name.includes('SB') check)
  substrateFamily?: string | null; // BOPP, PET, PE, CPP, PA, ALU, PAPER, SLEEVE, SPECIALTY
  substrateGrade?: string | null; // e.g. BOPP Transparent, PET Metalized HB
  hoover?: string | null; // Description / grade notes
  marketPriceUsd?: number | null; // Market reference price
  /** GP/MP/HP lamination formula (binder + hardener + EA parts). */
  laminationRecipe?: LaminationRecipe | null;
  laminationTier?: string | null;
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
  productType: 'roll' | 'sleeve' | 'pouch' | 'bag';
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
  // Bag fields (flat-sheet area model — see bag-flat-sheet.ts)
  /** Configurator type: 'bottom-gusset' | 'side-gusset' | 'courier' | 'diaper' | 'industrial' | 'loop' | 'patch' | 'punch' | 'wicket'. */
  bagSubtype?: string;
  /** Original product subtype code (e.g. 'bag_bottom_gusset_shopping') — fallback for inference. */
  productSubtype?: string;
  bottomGussetMm?: number;
  sideGussetMm?: number;
  flapMm?: number;
  handleLengthMm?: number;
  bagHandleWidthMm?: number;
  /** Loop handle construction: 1 = welded-on strip (adds handle film), 0 = die-cut (no extra film). Default 1. */
  bagLoopWelded?: number;
  bagPatchWidthMm?: number;
  bagPatchHeightMm?: number;
  /** Top fold/hem or header seal added to the cut length (mm) — e.g. diaper top fold. */
  bagTopFoldMm?: number;
  /** Courier POD (proof-of-delivery) document pocket height (mm). Adds a W×POD film panel. 0 = none. */
  bagPodHeightMm?: number;
  /** Wicket lip/header strip height (mm). Added to length on top of the body. */
  bagWicketLipMm?: number;
  /** Seal allowance per cut (mm). Default 10 mm when omitted. */
  sealAllowanceMm?: number;
  // Common
  /** Derived metadata for DB/reporting — not used in costing formulas. */
  printingWebClass?: 'wide_web' | 'narrow_web';
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

  // Solvent mix config (for SB ink/adhesive — dry GSM model)
  solventMaterialId?: string; // Library solvent row (default: Solvent Common)
  solventCostPerKgUsd?: number; // Resolved $/kg (from library or quote snapshot)
  solventRatio?: number; // Legacy; ink makeup uses inkPrintingProcess + inkSolventRatio
  /** On-press ink makeup: flexo (less EA) vs rotogravure (more EA). Null → infer PE→flexo. */
  inkPrintingProcess?: InkPrintingProcess | null;
  /** Override dry-ink÷ratio; null → from inkPrintingProcess (flexo 1.5, roto 1.0). */
  inkSolventRatio?: number;
  cleaningSolventKgPerJob?: number; // EA kg per job for press cleaning (default 20)
  /** Per-layer recipe overrides keyed by layer id (estimate-only, option B). */
  laminationRecipeOverrides?: Record<string, LaminationRecipe>;

  // Currency
  displayCurrencyCode: string;
  exchangeRateUsdToDisplay: number;

  // Metadata
  sourceEstimationId?: string; // For re-quote tracking
  createdAt?: Date;
  updatedAt?: Date;

  // Calculated fields (output)
  totalGsm?: number;
  /** Physical construction thickness (µm) — Option C (substrate µ + ink/adh gsm÷ρ). */
  totalMicron?: number;
  /** Substrate film gauge only (µm) — sum of substrate layer microns. */
  substrateGaugeMicron?: number;
  /** Composite structure density (g/cm³) = totalGsm / totalMicron. */
  filmDensity?: number;
  sqmPerKg?: number;
  piecesPerKg?: number;
  gramsPerPiece?: number;
  linearMPerKgWeb?: number;
  linearMPerKgReel?: number;

  // Cost breakdown (RM = layers + solvents)
  materialCostPerKg?: number;
  layerRmCostPerKg?: number;
  layerRmCostPerM2?: number;
  rmCostPerM2?: number;
  markupAmountPerKg?: number;
  operationCostPerKg?: number;
  salePricePerKg?: number;

  // Solvent mix (when SB ink/adhesive present)
  solventMixCostPerKg?: number;
  solventMixCostPerM2?: number;
  laminationSolventCostPerKg?: number;
  laminationSolventCostPerM2?: number;
  inkMakeupSolventCostPerKg?: number;
  inkMakeupSolventCostPerM2?: number;
  cleaningSolventCostPerKg?: number;
  cleaningSolventCostPerM2?: number;
  solventMixRatio?: number;
  inkPrintingProcessResolved?: InkPrintingProcess;
  inkSolventRatioResolved?: number;

  // Order quantities
  orderQuantityKg: number;
  /** Unit the user entered `orderQuantityKg` in: 'kgs' | 'kpcs' | 'sqm' | 'lm' | 'roll_500_lm'.
   *  'kgs' is the default (no conversion). All others are converted to true kg using productMetrics. */
  orderQuantityUnit?: string;
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

/** Thrown when a layer references a material ID not in the materials map. */
export class MissingMaterialsError extends Error {
  readonly materialIds: string[];

  constructor(materialIds: string[]) {
    super(`Missing material data for layer(s): ${materialIds.join(', ')}`);
    this.name = 'MissingMaterialsError';
    this.materialIds = materialIds;
  }
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