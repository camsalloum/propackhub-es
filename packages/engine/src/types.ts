// Core types for the Estimation Studio engine
// Based on Laravel legacy structure and PRD requirements

import type { LaminationRecipe } from './lamination-recipe';
import type { InkPrintingProcess } from './ink-printing';
import type { PouchAccessorySelection } from './pouch-accessories';
import type { UnitDef } from './unit-conversion';
import type { WasteBand } from './waste-bands';

export type LayerType = 'substrate' | 'ink' | 'adhesive' | 'solvent' | 'packaging';

export interface Material {
  id: string;
  name: string;
  type: LayerType;
  solidPercent: number; // 30 for Ink SB, 100 for Ink UV, 100 for substrates/adhesives
  density: number; // g/cm³
  costPerKgUsd: number;
  /**
   * Unused legacy field. Engine costing does **not** apply per-material scrap.
   * Converting waste is quantity-band only (`wasteBands` / `wastePercentForQuantity`).
   * Kept for API/DB compatibility; prefer `0`.
   */
  wastePercent: number;
  isSolventBased?: boolean; // True for SB ink/adhesive (replaces name.includes('SB') check)
  substrateFamily?: string | null; // BOPP, PET, PE, CPP, PA, ALU, PAPER, SLEEVE, SPECIALTY
  substrateGrade?: string | null; // e.g. BOPP Transparent, PET Metalized HB
  hoover?: string | null; // Description / grade notes
  marketPriceUsd?: number | null; // Market reference price
  /** Platform master key (e.g. packaging-pallet-wood) — used to resolve packaging defaults. */
  platformMasterKey?: string | null;
  /** GP/MP/HP lamination formula (binder + hardener + EA parts). */
  laminationRecipe?: LaminationRecipe | null;
  laminationTier?: string | null;
  // Accessory pricing (zipper / spout / valve / handle / window). Only populated
  // for accessory rows (itemClass='accessory'); null on film/ink/adhesive rows.
  /** USD per linear metre — zipper tape / paper core. */
  costPerMeterUsd?: number | null;
  /** USD per piece — spout / valve / handle / carton / pallet / stretch roll. */
  costPerPieceUsd?: number | null;
  /** Grams per linear metre — zipper tape. */
  weightGramPerMeter?: number | null;
  /** Grams per piece — spout / valve / handle. */
  weightGramPerPiece?: number | null;
  /** Accessory class: 'zipper' | 'spout' | 'valve' | 'handle' | 'window'. */
  accessoryKind?: string | null;
  /** Packaging purchase unit from PB: kgs | mtr | rol | pcs. */
  priceUnit?: string | null;
  /** Packaging unit price (USD per priceUnit) — PB combined avg. */
  unitPriceUsd?: number | null;
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
  // Pouch fields (face dimensions also reused by bag flat-sheet model)
  openWidthMm?: number;
  openHeightMm?: number;
  layFlatValue?: number;
  /**
   * Premade pouch v4 configurator key: `{family}-{variant}`
   * e.g. 'three-side-seal-flat' | 'half-fold-fusion-standing' | 'flat-bottom-box-standing'.
   * Legacy short keys ('stand-up', 'three-side-seal', …) still resolve via pouch-flat-sheet.
   */
  pouchSubtype?: string;
  /** @deprecated VFFS pillow overlap — unused in v4 Center-Fold-Seal model; kept for old JSON. */
  centerSealOverlapMm?: number;
  /** Center-Fold-Seal bottom seal width S1 (mm). */
  bottomSealWidthMm?: number;
  /** Flat-bottom box pouch bottom-panel depth D (mm). */
  bottomDepthMm?: number;
  /** Oblique-Side-Weld cut angle (degrees, 0–20). Scrap factor only — not in base flat area. */
  cutAngleDeg?: number;
  /**
   * Stand-up bottom seal style (visual/tooling). Does not change flat film area.
   * 0/omit = Doyen (U/round gusset), 1 = K-seal (angled K corner seals).
   * Industry: K-seal vs Doyen differ in bottom weld pattern, not webCount.
   */
  bottomSealKseal?: number;
  /** Corner style tooling: 1 = rounded, 0/omit = square — does not change flat area. */
  cornerRounded?: number;
  cornerRadiusMm?: number;
  /** Pouch accessories (zipper / spout / valve / window / …). Empty/undefined = none. */
  accessories?: PouchAccessorySelection[];
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
  /** Roll/sleeve core ID (mm) — packaging + rollSpec. */
  coreInsideDiameterMm?: number;
  coreThicknessMm?: number;
  requiredRollWeightKg?: number;
  rollOutsideDiameterMm?: number;
  /** 1 = OD-driven rollSpec, 0 = weight-driven. */
  rollSpecOdDriven?: number;
}

export interface Slab {
  quantityKg: number;
  /**
   * Sale price per kg in **USD** (engine output / input ladder qty only).
   * Callers convert to display currency for UI/PDF; do not treat as display-native.
   */
  pricePerKg: number;
  /** quantityKg × pricePerKg (USD). */
  total?: number;
}

export interface Process {
  id: string;
  name: string;
  /** Stable master-data process code (e.g. 'lamination'). Used for M&O per-kg costing. */
  processKey?: string;
  /**
   * Fixed operating cost per kg for this process (USD). This is the sales-level
   * Manufacturing & Operating cost model — no machine time / web width needed.
   * Mfg & Operating (process_per_kg method) = Σ(costPerKgUsd × processQuantity) for enabled rows.
   */
  costPerKgUsd?: number;
  /** How many times this process is applied (e.g. lamination ×2 for triplex). Default 1. */
  processQuantity?: number;
  // ── Legacy machine-time fields (retained for compatibility; NOT used for costing) ──
  costPerHour?: number;
  speedBasis?: 'kg_per_hour' | 'm_per_min' | 'pcs_per_min';
  speedValue?: number;
  setupHours?: number;
  runHours?: number; // Calculated
  totalCost?: number; // Calculated (per-kg cost × order qty when process_per_kg)
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
  /**
   * Legacy flat prepress $/kg as **USD** for engine math.
   * Stored/edited in display currency; server (`estimate-engine-input`) and
   * client (`estimateCalc`) convert via `displayToUsd` before calling the engine.
   * Superseded by amortized `toolingChargeUsd` when that model is used.
   */
  platesPerKg: number;
  /**
   * Legacy flat transport $/kg as **USD** for engine math.
   * Stored/edited in display currency; converted at the engine boundary (same as plates).
   * Distinct from freight lump sum `deliveryChargeUsd` (already USD).
   */
  deliveryPerKg: number;
  processes: Process[];
  slabs: Slab[];

  /**
   * Manufacturing & Operating cost method (final price breakup):
   *   'process_per_kg'  — Σ(process.costPerKgUsd × processQuantity) for enabled processes,
   *                       plus a separate profit margin % of total cost before margin.
   *                       Default for company tenants (Interplast-style, multi-user).
   *   'markup_over_rm'  — Total RM/kg × markupPercent% (covers conversion + margin).
   *                       Default for individual (single-user) tenants.
   *   'fixed_per_group' — Fixed CoRM/kg from the source template (Margin Over Raw Material;
   *                       converted to USD at the engine boundary — see `cormPerKgUsd`).
   * Estimate may override the tenant default via this field when persisted.
   */
  operatingCostMethod?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  /**
   * Process method only: profit % of (Total RM + process M&O + PrePress + Transport + accessory).
   * Defaults to 5 when unset. Ignored for markup_over_rm / fixed_per_group.
   */
  profitMarginPercent?: number;
  /**
   * Base Fixed CoRM per kg as **USD** for engine math (Printed or Plain already
   * selected by the caller). Scaled by band waste % × `cormScaleWithWaste`.
   * Server/client convert from display-currency storage using the estimate's
   * frozen `exchangeRateUsdToDisplay`.
   */
  cormPerKgUsd?: number | null;
  /**
   * How strongly CoRM tracks waste % (default 1 = waste 10% → CoRM +10%).
   * Platform admin setting; 0 = flat base CoRM at every quantity.
   */
  cormScaleWithWaste?: number;

  // ── Pricing model (new) ──────────────────────────────────────────────────
  // When `pricingMethod` is set, the engine uses the quantity-band waste +
  // lump-sum tooling/delivery (amortized over the order qty) + margin model and
  // ignores platesPerKg/deliveryPerKg and process operation cost. When unset,
  // the legacy additive model runs (full backward compatibility).
  pricingMethod?: 'markup' | 'margin_per_kg';
  /**
   * Margin per kg as **USD** for engine math. Server/client convert from
   * display-currency storage using the estimate's frozen FX rate.
   */
  marginValuePerKgUsd?: number;
  /**
   * Tooling (plates/cylinders) lump-sum as **USD** for engine math.
   * Stored/edited in display currency; converted at the engine boundary.
   */
  toolingChargeUsd?: number;
  /** Whether the tooling charge is billed to the customer (added to the price). */
  toolingBilledToCustomer?: boolean;
  /** Delivery/Incoterm term label (EXW, FOB, CIF, …). */
  deliveryTerm?: string;
  /** Delivery/freight lump-sum charge in **USD** for the whole job (0 for EXW). Freight stays USD. */
  deliveryChargeUsd?: number;
  /** Quantity-based waste bands; falls back to engine defaults when omitted. */
  wasteBands?: WasteBand[];

  // Solvent mix config (for SB ink/adhesive — dry GSM model)
  solventMaterialId?: string; // Library solvent row (default: Solvent Common)
  solventCostPerKgUsd?: number; // Resolved $/kg (from library or quote snapshot)
  solventRatio?: number; // Legacy; ink makeup uses inkPrintingProcess + inkSolventRatio
  /** On-press ink makeup: flexo (less EA) vs rotogravure (more EA). Null → infer PE→flexo. */
  inkPrintingProcess?: InkPrintingProcess | null;
  /** Override dry-ink÷ratio; null → from inkPrintingProcess (flexo 1.5, roto 1.0). */
  inkSolventRatio?: number | null;
  /** Print colors — used for flexo mounting-tape area. */
  printColorCount?: number | null;
  cleaningSolventKgPerJob?: number; // EA kg per job for press cleaning (default 20)
  /** Sleeve seaming solvent coat weight g/m² (default 0.25) when SLEEVE substrate in stack. */
  sleeveSeamingSolventGsm?: number;
  /** Resolved blend $/kg for seaming mix (75% THF + 25% Dioxolane from catalog). */
  seamingSolventCostPerKgUsd?: number;
  /** Per-layer recipe overrides keyed by layer id (estimate-only, option B). */
  laminationRecipeOverrides?: Record<string, LaminationRecipe>;

  /** Outbound packaging config (load/pallet, cartons/pallet, material picks). */
  packagingConfig?: import('./packaging-costing').PackagingConfig;
  /** Process consumables (mounting tape + other) — averaged PB groups. */
  consumablesConfig?: import('./consumables-costing').ConsumablesConfig;

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
  /** Process method only: profit margin $/kg (see profitMarginPercent). */
  profitMarginPerKg?: number;
  /** Pouch accessory hardware cost per kg (zipper/spout/valve/handle/window) — pass-through, outside markup. */
  accessoryCostPerKg?: number;
  /** Extra grams added per piece by accessories (hardware + window film). */
  accessoryWeightGramPerPiece?: number;
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
  seamingSolventCostPerKg?: number;
  seamingSolventCostPerM2?: number;
  solventMixRatio?: number;
  inkPrintingProcessResolved?: InkPrintingProcess;
  inkSolventRatioResolved?: number;

  // Packaging (outbound — separate from laminate)
  packagingCostPerKg?: number;
  packagingCostPerM2?: number;
  packagingNeedsReview?: boolean;
  packagingCostLines?: import('./packaging-costing').PackagingCostLine[];
  consumablesCostPerKg?: number;
  consumablesCostPerM2?: number;
  consumablesNeedsReview?: boolean;
  consumablesCostLines?: import('./consumables-costing').ConsumablesCostLine[];

  // Order quantities
  orderQuantityKg: number;
  /** Unit the user entered `orderQuantityKg` in: 'kgs' | 'kpcs' | 'sqm' | 'lm' | 'roll_500_lm'.
   *  'kgs' is the default (no conversion). All others are converted to true kg using productMetrics. */
  orderQuantityUnit?: string;
  /** Resolved {basis, multiplier} for `orderQuantityUnit`, looked up from the tenant's
   *  effective unit list. Takes precedence over `orderQuantityUnit` when present; enables
   *  custom/tenant-defined units. Falls back to the legacy code map when omitted. */
  orderQuantityUnitDef?: UnitDef;
  orderQuantityKpcs?: number;
  orderQuantitySqm?: number;
  orderQuantityMeters?: number;
  /** Order quantity converted to true kilograms (regardless of the entered unit). */
  orderQuantityKgConverted?: number;
  /** Finished reel running metres for the order — the costing LM (matches the 'lm' unit). */
  orderQuantityMetersReel?: number;

  // ── New pricing model — output breakdown (per kg, USD) ───────────────────
  /** Waste % applied to the material cost for the order quantity's band. */
  wastePercentApplied?: number;
  /** Material cost per kg after applying the band waste %. */
  wasteAdjustedMaterialPerKg?: number;
  /** Logistics (delivery) cost per kg — lump sum amortized over the order qty. */
  logisticsCostPerKg?: number;
  /** Development (tooling) cost per kg — lump sum amortized over the order qty. */
  developmentCostPerKg?: number;
  /** Margin added per kg (markup amount, or the fixed margin/kg). */
  marginPerKg?: number;
  /** Pricing method actually used by the engine. */
  pricingMethodResolved?: 'markup' | 'margin_per_kg';
  /** Manufacturing & Operating method actually used by the engine. */
  operatingCostMethodResolved?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  /** Process method: profit % actually applied (default 5). */
  profitMarginPercentResolved?: number;
}

export interface CalculationResult {
  estimate: Estimate;
  slabs: Slab[];
  costBreakdown: {
    materialPercent: number;
    wastePercent: number;
    markupPercent: number;
    processPercent: number;
    /**
     * Fixed CoRM (per-template USD/kg) share of total cost — populated when
     * `operatingCostMethod === 'fixed_per_group'`. Mirrors the markupPercent /
     * processPercent branches for the third M&O method.
     */
    cormPercent?: number;
    /** Process-method profit margin share of sale price. */
    profitPercent?: number;
    /** Accessory hardware share of total cost (pouch zipper/spout/valve/etc.). */
    accessoryPercent?: number;
    /** Logistics (delivery) share of the sale price — new pricing model. */
    logisticsPercent?: number;
    /** Development (tooling) share of the sale price — new pricing model. */
    developmentPercent?: number;
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
  /** Allow estimate-level override of Manufacturing & Operating method (+ process profit %). */
  overrideOperatingCostMethod: boolean;

  // Output
  sellingPrice: boolean;
  slabTable: boolean;
  proposalPdf: boolean;
}