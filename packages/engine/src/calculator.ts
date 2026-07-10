import {
  Estimate, Layer, Material, CalculationResult,
  EstimateDimensions, Process, MissingMaterialsError,
} from './types';
import { calculateSolventCosts } from './solvent-costing';
import {
  calculateSubstrateGaugeMicron,
  calculateTotalConstructionMicron,
  calculateStructureDensity,
} from './structure-metrics';
import { calculateBagFlatSheetAreaM2 } from './bag-flat-sheet';
import { calculatePouchFlatSheetAreaM2 } from './pouch-flat-sheet';
import { calculatePouchAccessories } from './pouch-accessories';
import { convertOrderQuantityToKg } from './unit-conversion';
import {
  wastePercentForQuantity,
  effectiveCormPerKg,
  DEFAULT_CORM_SCALE_WITH_WASTE,
  type WasteBand,
} from './waste-bands';

/**
 * Main calculation engine - mirrors Laravel costing formulas
 * Based on COSTING_NOTES.md from legacy Laravel app
 */
export function calculateEstimate(
  estimate: Estimate,
  materials: Map<string, Material>
): CalculationResult {
  const warnings: string[] = [];

  // Validate we have all materials
  const missingMaterials: string[] = [];
  estimate.layers.forEach(layer => {
    if (!materials.has(layer.materialId)) {
      missingMaterials.push(layer.materialId);
    }
  });

  if (missingMaterials.length > 0) {
    throw new MissingMaterialsError(missingMaterials);
  }

  // Step 1: Calculate layer GSM and cost/m² (Laravel formulas)
  const layersWithCalc = estimate.layers.map(layer => {
    const material = materials.get(layer.materialId)!;
    return calculateLayer(layer, material);
  });

  // Step 2: Calculate totals
  const totalGsm = layersWithCalc.reduce((sum, layer) => sum + (layer.gsm || 0), 0);
  const substrateGaugeMicron = calculateSubstrateGaugeMicron(layersWithCalc, materials);
  const totalMicron = calculateTotalConstructionMicron(layersWithCalc, materials);
  const totalCostM2 = layersWithCalc.reduce((sum, layer) => sum + (layer.costPerM2 || 0), 0);

  // Step 3: Structure density and conversion factors
  const filmDensity = calculateStructureDensity(totalGsm, totalMicron);
  const sqmPerKg = totalGsm > 0 ? 1000 / totalGsm : 0;

  // Step 4: Calculate layer RM cost per kg (layers only — before solvent)
  const layerRmCostPerKg = totalGsm > 0 ? (totalCostM2 / totalGsm) * 1000 : 0;

  // Step 5: Calculate printing web width if dimensions available
  const printingWebWidthMm = calculatePrintingWebWidth(estimate.dimensions);

  // Step 6: Calculate product-specific metrics
  const productMetrics = calculateProductMetrics(estimate.dimensions, totalGsm, filmDensity, printingWebWidthMm, materials);

  // Step 6a: Accessory hardware cost per kg (pouch zipper/spout/valve/handle/window).
  // Per-piece cost × pieces/kg → per-kg pass-through term (outside markup).
  const accessoryCostPerKg = (productMetrics.accessoryCostUsdPerPiece || 0) * (productMetrics.piecesPerKg || 0);

  // Step 6b: Convert user-entered order quantity (in `orderQuantityUnit`) to true kg.
  // productMetrics are independent of order quantity, so no circular dependency.
  const trueOrderQuantityKg = convertOrderQuantityToKg(
    estimate.orderQuantityKg,
    estimate.orderQuantityUnitDef ?? estimate.orderQuantityUnit,
    {
      piecesPerKg: productMetrics.piecesPerKg,
      sqmPerKg,
      linearMPerKgWeb: productMetrics.linearMPerKgWeb,
      linearMPerKgReel: productMetrics.linearMPerKgReel,
    }
  );

  // Step 7: Solvent — lamination EA (recipes) + press cleaning (SB ink)
  const solventDetail = calculateSolventCosts(
    estimate,
    layersWithCalc,
    materials,
    totalGsm
  );
  const solventCostPerKg = solventDetail.totalCostPerKg;

  // Step 8: Manufacturing & Operating (M&O) — sales-level model (no machine time).
  // process_per_kg : Σ(process.costPerKgUsd × processQuantity) for enabled rows.
  // markup_over_rm : Total RM/kg × markupPercent% (computed inside the price build-up).
  // fixed_per_group: Per-template fixed CoRM (USD/kg) from the source template.
  const mfg = computeMfgProcessCosts(estimate.processes, trueOrderQuantityKg);

  // ── Step 9: Pricing ──────────────────────────────────────────────────────
  const materialCost = layerRmCostPerKg + solventCostPerKg;
  const rmCostPerM2 = totalCostM2 + solventDetail.totalCostPerM2;

  // Unified final-price breakup (single model — no legacy/per-hour branch):
  //   Total RM  = material × (1 + band waste%)         (substrates + ink/adh/solvent + packaging + waste)
  //   M&O       = markup over Total RM  OR  Σ process cost/kg  OR  fixed CoRM  (the ONLY markup)
  //   PrePress  = plates + tooling(amortized)          (development charge)
  //   Transport = deliveryPerKg + delivery(amortized)  (as defined)
  //   Sale      = Total RM + M&O + PrePress + Transport + accessory
  const operatingCostMethod: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group' =
    estimate.operatingCostMethod ?? 'markup_over_rm';

  const charges = {
    materialPerKg: materialCost,
    accessoryPerKg: accessoryCostPerKg,
    amortizeQtyKg: trueOrderQuantityKg,
    wasteBands: estimate.wasteBands,
    platesPerKg: estimate.platesPerKg,
    deliveryPerKg: estimate.deliveryPerKg,
    toolingChargeUsd: estimate.toolingChargeUsd ?? 0,
    toolingBilled: estimate.toolingBilledToCustomer ?? false,
    deliveryChargeUsd: estimate.deliveryChargeUsd ?? 0,
    operatingCostMethod,
    markupPercent: estimate.markupPercent,
    mfgProcessPerKg: mfg.operationCostPerKg,
    cormPerKgUsd: estimate.cormPerKgUsd ?? 0,
    cormScaleWithWaste: estimate.cormScaleWithWaste ?? DEFAULT_CORM_SCALE_WITH_WASTE,
  };

  const priced = priceWithNewModel({ ...charges, wasteQtyKg: trueOrderQuantityKg });
  const salePricePerKg = priced.salePricePerKg;
  const mfgOperatingPerKg = priced.mfgOperatingPerKg;
  const markupAmount =
    operatingCostMethod === 'markup_over_rm' ? mfgOperatingPerKg : 0;
  const totalCost = salePricePerKg;

  // Slab ladder: waste % (and Fixed CoRM scaled with waste) vary per slab qty.
  // Prepress/transport amortize over each slab's qty so price lists reflect
  // development $/kg at that band (fallback to order qty when slab qty ≤ 0).
  const slabsWithTotals: CalculationResult['slabs'] = estimate.slabs.map(slab => {
    const amortizeQtyKg =
      slab.quantityKg > 0 ? slab.quantityKg : trueOrderQuantityKg;
    const p = priceWithNewModel({
      ...charges,
      wasteQtyKg: slab.quantityKg,
      amortizeQtyKg,
    });
    return { ...slab, pricePerKg: p.salePricePerKg, total: slab.quantityKg * p.salePricePerKg };
  });

  const denom = totalCost > 0 ? totalCost : 0;
  const wasteAmount = priced.wasteAdjustedMaterialPerKg - materialCost;
  const costBreakdown: CalculationResult['costBreakdown'] = {
    materialPercent: denom > 0 ? (materialCost / denom) * 100 : 0,
    wastePercent: denom > 0 ? (wasteAmount / denom) * 100 : 0,
    markupPercent: denom > 0 && operatingCostMethod === 'markup_over_rm' ? (mfgOperatingPerKg / denom) * 100 : 0,
    processPercent: denom > 0 && operatingCostMethod === 'process_per_kg' ? (mfgOperatingPerKg / denom) * 100 : 0,
    cormPercent: denom > 0 && operatingCostMethod === 'fixed_per_group' ? (mfgOperatingPerKg / denom) * 100 : 0,
    accessoryPercent: denom > 0 ? (accessoryCostPerKg / denom) * 100 : 0,
    logisticsPercent: denom > 0 ? (priced.transportCostPerKg / denom) * 100 : 0,
    developmentPercent: denom > 0 ? (priced.prepressCostPerKg / denom) * 100 : 0,
  };


  // Update estimate with calculated fields
  const updatedEstimate: Estimate = {
    ...estimate,
    layers: layersWithCalc,
    processes: mfg.processes,
    totalGsm,
    totalMicron,
    substrateGaugeMicron,
    filmDensity,
    sqmPerKg,
    materialCostPerKg: materialCost,
    layerRmCostPerKg,
    layerRmCostPerM2: totalCostM2,
    rmCostPerM2,
    markupAmountPerKg: markupAmount,
    operationCostPerKg: mfgOperatingPerKg,
    accessoryCostPerKg,
    accessoryWeightGramPerPiece: productMetrics.accessoryWeightGramPerPiece,
    salePricePerKg,
    solventMixCostPerKg: solventCostPerKg,
    solventMixCostPerM2: solventDetail.totalCostPerM2,
    laminationSolventCostPerKg: solventDetail.laminationCostPerKg,
    laminationSolventCostPerM2: solventDetail.laminationCostPerM2,
    inkMakeupSolventCostPerKg: solventDetail.inkMakeupCostPerKg,
    inkMakeupSolventCostPerM2: solventDetail.inkMakeupCostPerM2,
    cleaningSolventCostPerKg: solventDetail.cleaningCostPerKg,
    cleaningSolventCostPerM2: solventDetail.cleaningCostPerM2,
    seamingSolventCostPerKg: solventDetail.seamingCostPerKg,
    seamingSolventCostPerM2: solventDetail.seamingCostPerM2,
    solventMixRatio: solventDetail.inkSolventRatio,
    inkPrintingProcessResolved: solventDetail.inkPrintingProcess,
    inkSolventRatioResolved: solventDetail.inkSolventRatio,
    // Product metrics
    piecesPerKg: productMetrics.piecesPerKg,
    gramsPerPiece: productMetrics.gramsPerPiece,
    linearMPerKgWeb: productMetrics.linearMPerKgWeb,
    linearMPerKgReel: productMetrics.linearMPerKgReel,
    // Order quantities (derived from the converted true kg)
    orderQuantityKgConverted: trueOrderQuantityKg,
    orderQuantityKpcs: trueOrderQuantityKg * (productMetrics.piecesPerKg || 0) / 1000,
    orderQuantitySqm: trueOrderQuantityKg * (sqmPerKg || 0),
    // Web (press) running metres — MES quantity, kept for downstream use.
    orderQuantityMeters: trueOrderQuantityKg * (productMetrics.linearMPerKgWeb || 0),
    // Finished reel running metres — the costing LM (matches the 'lm' order-quantity unit).
    orderQuantityMetersReel: trueOrderQuantityKg * (productMetrics.linearMPerKgReel || 0),
    // Final price breakup (per kg). Total RM (with band waste) + M&O + PrePress + Transport.
    wastePercentApplied: priced.wastePct,
    wasteAdjustedMaterialPerKg: priced.wasteAdjustedMaterialPerKg,
    logisticsCostPerKg: priced.transportCostPerKg,
    developmentCostPerKg: priced.prepressCostPerKg,
    marginPerKg: markupAmount,
    operatingCostMethodResolved: operatingCostMethod,
  };

  return {
    estimate: updatedEstimate,
    slabs: slabsWithTotals,
    costBreakdown,
    warnings
  };
}

/**
 * Calculate layer GSM and cost/m² based on Laravel formulas
 */
function isGsmDirectSubstrate(material: Material): boolean {
  return /gsm\s*direct/i.test(material.hoover ?? '');
}

function calculateLayer(layer: Layer, material: Material): Layer {
  let gsm: number;
  let costPerM2: number;

  if (material.type === 'substrate') {
    // Paper GSM-direct grades: micron field holds grammage (g/m²), not caliper.
    gsm = isGsmDirectSubstrate(material) ? layer.micron : layer.micron * material.density;
    // cost/m² = (gsm / 1000) × cost_per_kg
    costPerM2 = (gsm / 1000) * material.costPerKgUsd;
  } else {
    // Ink or Adhesive: user enters DRY GSM (what remains on the film after solvent flash-off).
    // layer.micron holds the dry gsm value.
    gsm = layer.micron;

    // costPerKgUsd is the dry-equivalent cost: liquidPrice / (solid% / 100)
    // That was computed in Raw Materials and stored in the library.
    // So: cost/m² = (dry_gsm / 1000) × costPerKgUsd_dry_equiv
    // Example: 2 gsm dry, solidFraction=0.35, liquidPrice=4.60
    //   costPerKgUsd = 4.60/0.35 = 13.143
    //   cost/m² = (2/1000) × 13.143 = 0.02629 ✓
    costPerM2 = (gsm / 1000) * material.costPerKgUsd;
  }

  return {
    ...layer,
    gsm,
    costPerM2,
    material
  };
}

/**
 * Calculate printing web width from dimensions
 */
function calculatePrintingWebWidth(dimensions: EstimateDimensions): number {
  switch (dimensions.productType) {
    case 'roll':
    case 'sleeve':
      if (dimensions.reelWidthMm && dimensions.numberOfUps && dimensions.extraPrintingTrimMm !== undefined) {
        return (dimensions.reelWidthMm * dimensions.numberOfUps) + dimensions.extraPrintingTrimMm;
      }
      break;
    case 'pouch':
    case 'bag':
      if (dimensions.openWidthMm && dimensions.numberOfUps && dimensions.extraPrintingTrimMm !== undefined) {
        return (dimensions.openWidthMm * dimensions.numberOfUps) + dimensions.extraPrintingTrimMm;
      }
      break;
  }
  return 0;
}

/**
 * Calculate product-specific metrics
 */
function calculateProductMetrics(
  dimensions: EstimateDimensions,
  totalGsm: number,
  _filmDensity: number,
  printingWebWidthMm: number,
  materials: Map<string, Material>
) {
  const result = {
    piecesPerKg: 0,
    gramsPerPiece: 0,
    linearMPerKgWeb: 0,
    linearMPerKgReel: 0,
    accessoryCostUsdPerPiece: 0,
    accessoryWeightGramPerPiece: 0
  };

  if (totalGsm === 0) return result;

  const sqmPerKg = 1000 / totalGsm;

  switch (dimensions.productType) {
    case 'roll': {
      const rw = dimensions.reelWidthMm;
      const co = dimensions.cutoffMm;
      const ppc = dimensions.piecesPerCut;

      if (rw && rw > 0) {
        result.linearMPerKgReel = (sqmPerKg / rw) * 1000;
      }

      if (printingWebWidthMm > 0) {
        result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
      }

      if (rw && rw > 0 && co && co > 0 && ppc && ppc >= 1) {
        result.piecesPerKg =
          (1000 / (rw * co * totalGsm * 1e-6)) * ppc;
        result.gramsPerPiece = 1000 / result.piecesPerKg;
      }
      break;
    }

    case 'sleeve': {
      const rw = dimensions.reelWidthMm;
      const co = dimensions.cutoffMm;

      if (rw && rw > 0) {
        result.linearMPerKgReel = (sqmPerKg / rw) * 1000;
      }

      if (printingWebWidthMm > 0) {
        result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
      }

      if (rw && rw > 0 && co && co > 0) {
        result.piecesPerKg = (1000 / (rw * co * totalGsm * 1e-6)) * 1;
        result.gramsPerPiece = 1000 / result.piecesPerKg;
      }
      break;
    }

    case 'pouch': {
      // Pouch: flat-sheet blank area model (front + back + gussets + seals).
      // See pouch-flat-sheet.ts. Falls back to legacy face-area when the subtype
      // is unresolved (existing estimates created before subtype tagging).
      // Accessories (zipper/spout/valve/window/handle) add weight, film area, and cost.
      const pouch = calculatePouchFlatSheetAreaM2(dimensions);
      const acc = calculatePouchAccessories(dimensions, materials);
      result.accessoryCostUsdPerPiece = acc.costUsdPerPiece;
      result.accessoryWeightGramPerPiece = acc.weightGramPerPiece;

      if (pouch.areaM2 > 0) {
        // gramsPerPiece = (blankArea + accessory film) × totalGsm + accessory hardware weight
        result.gramsPerPiece = (pouch.areaM2 + acc.filmAreaM2) * totalGsm + acc.weightGramPerPiece;
        result.piecesPerKg = result.gramsPerPiece > 0 ? 1000 / result.gramsPerPiece : 0;

        if (printingWebWidthMm > 0) {
          result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
        }

        // Reel runs across the blank width (cross-direction)
        if (pouch.blankWidthMm > 0) {
          result.linearMPerKgReel = (sqmPerKg / pouch.blankWidthMm) * 1000;
        }
      } else if (dimensions.openWidthMm && dimensions.openHeightMm) {
        // Fallback: legacy face-area pouch model (one face only).
        // Kept for backward compatibility with pre-subtype estimates.
        const faceAreaM2 = dimensions.openWidthMm * dimensions.openHeightMm * 1e-6;
        result.gramsPerPiece = (faceAreaM2 + acc.filmAreaM2) * totalGsm + acc.weightGramPerPiece;
        result.piecesPerKg = result.gramsPerPiece > 0 ? 1000 / result.gramsPerPiece : 0;

        if (printingWebWidthMm > 0) {
          result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
        }

        // linear_m_per_kg_reel uses open_height (cut length)
        if (dimensions.openHeightMm > 0) {
          result.linearMPerKgReel = (sqmPerKg / dimensions.openHeightMm) * 1000;
        }
      }
      break;
    }

    case 'bag': {
      // Bag: flat-sheet blank area model (gussets, flaps, lips, patches).
      // See bag-flat-sheet.ts. Falls back to face area if subtype unresolved.
      const bag = calculateBagFlatSheetAreaM2(dimensions);
      if (bag.areaM2 > 0) {
        // Weight comes from the STRUCTURE: gramsPerPiece = flatArea × totalGsm,
        // where totalGsm is derived from the layer stack + ink (see step 2 above).
        // The reinforcement patch (patch subtype) is cut from the same film, so it is
        // weighed at the same structure GSM — its area is already included in bag.areaM2.
        // pieces_per_kg = 1000 / (areaM2 × totalGsm)
        result.piecesPerKg = 1000 / (bag.areaM2 * totalGsm);
        result.gramsPerPiece = 1000 / result.piecesPerKg;

        if (printingWebWidthMm > 0) {
          result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
        }

        // Reel runs across the blank width (cross-direction)
        if (bag.blankWidthMm > 0) {
          result.linearMPerKgReel = (sqmPerKg / bag.blankWidthMm) * 1000;
        }
      } else if (dimensions.openWidthMm && dimensions.openHeightMm) {
        // Fallback: unresolved bag subtype → face-area (pouch-style) estimate
        result.piecesPerKg = (1000 / (dimensions.openWidthMm * dimensions.openHeightMm * totalGsm * 1e-6)) * 1;
        result.gramsPerPiece = 1000 / result.piecesPerKg;

        if (printingWebWidthMm > 0) {
          result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
        }
        if (dimensions.openHeightMm > 0) {
          result.linearMPerKgReel = (sqmPerKg / dimensions.openHeightMm) * 1000;
        }
      }
      break;
    }
  }

  return result;
}

/**
 * Manufacturing & Operating — sales-level per-kg process cost.
 *
 * At sales / pre-estimation stage the web width and machine speeds are unknown,
 * so operation cost is NOT time-based. Each enabled process contributes
 * `costPerKgUsd × processQuantity`; the sum is the M&O cost per kg used by the
 * `process_per_kg` method. `totalCost` per process = perKg × order quantity.
 */
function computeMfgProcessCosts(processes: Process[], orderQuantityKg: number) {
  let operationCostPerKg = 0;

  const updatedProcesses = processes.map(process => {
    if (!process.enabled) {
      return { ...process, runHours: 0, totalCost: 0 };
    }
    const qty = Math.max(1, Math.round(process.processQuantity ?? 1));
    const perKg = (process.costPerKgUsd ?? 0) * qty;
    operationCostPerKg += perKg;
    return {
      ...process,
      processQuantity: qty,
      runHours: 0,
      totalCost: perKg * (orderQuantityKg > 0 ? orderQuantityKg : 0),
    };
  });

  return {
    processes: updatedProcesses,
    totalProcessCost: operationCostPerKg * (orderQuantityKg > 0 ? orderQuantityKg : 0),
    operationCostPerKg,
  };
}

/**
 * Final price build-up (per kg, USD base) — single unified model:
 *   Total RM  = material × (1 + band waste%)      (substrates + ink/adh/solvent + packaging + waste)
 *   M&O       = process_per_kg ? Σ(process cost/kg)
 *             : markup_over_rm ? Total RM × markup%
 *             : fixed_per_group ? cormPerKgUsd
 *               (this M&O figure is the ONLY markup in the price)
 *   PrePress  = platesPerKg + tooling(amortized over order qty)   (development charge)
 *   Transport = deliveryPerKg + delivery(amortized over order qty)
 *   Sale      = Total RM + M&O + PrePress + Transport + accessory
 *
 * `wasteQtyKg` selects the waste band (order qty for the headline; each slab qty for the ladder).
 */
function priceWithNewModel(params: {
  materialPerKg: number;
  accessoryPerKg: number;
  wasteQtyKg: number;
  amortizeQtyKg: number;
  wasteBands?: WasteBand[];
  /** USD/kg — caller converts from display at engine boundary. */
  platesPerKg: number;
  /** USD/kg — caller converts from display at engine boundary. */
  deliveryPerKg: number;
  toolingChargeUsd: number;
  toolingBilled: boolean;
  deliveryChargeUsd: number;
  operatingCostMethod: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  markupPercent: number;
  mfgProcessPerKg: number;
  /** Base Fixed CoRM (USD/kg) for print mode; scaled by waste when fixed_per_group. */
  cormPerKgUsd: number;
  /** Multiplier on waste % applied to CoRM (default 1 = waste 10% → CoRM +10%). */
  cormScaleWithWaste: number;
}): {
  wastePct: number;
  wasteAdjustedMaterialPerKg: number;
  mfgOperatingPerKg: number;
  prepressCostPerKg: number;
  transportCostPerKg: number;
  salePricePerKg: number;
} {
  const wastePct = wastePercentForQuantity(params.wasteQtyKg, params.wasteBands);
  // Total RM per kg (material incl. solvent/packaging, adjusted for band waste).
  const wasteAdjustedMaterialPerKg = params.materialPerKg * (1 + wastePct / 100);

  const amort = params.amortizeQtyKg > 0 ? params.amortizeQtyKg : 0;
  // PrePress / Transport — platesPerKg & deliveryPerKg are USD (converted at boundary).
  const prepressCostPerKg =
    params.platesPerKg + (params.toolingBilled && amort > 0 ? params.toolingChargeUsd / amort : 0);
  const transportCostPerKg =
    params.deliveryPerKg + (amort > 0 ? params.deliveryChargeUsd / amort : 0);

  // Manufacturing & Operating — the ONLY markup mechanism.
  // process_per_kg  → Σ(enabled process cost/kg)
  // markup_over_rm  → Total RM × markupPercent%
  // fixed_per_group → base CoRM × (1 + waste% × scale)  (scale default 1)
  const mfgOperatingPerKg =
    params.operatingCostMethod === 'process_per_kg'
      ? params.mfgProcessPerKg
      : params.operatingCostMethod === 'fixed_per_group'
        ? effectiveCormPerKg(params.cormPerKgUsd, wastePct, params.cormScaleWithWaste)
        : wasteAdjustedMaterialPerKg * (params.markupPercent / 100);

  const salePricePerKg =
    wasteAdjustedMaterialPerKg +
    mfgOperatingPerKg +
    prepressCostPerKg +
    transportCostPerKg +
    params.accessoryPerKg;

  return {
    wastePct,
    wasteAdjustedMaterialPerKg,
    mfgOperatingPerKg,
    prepressCostPerKg,
    transportCostPerKg,
    salePricePerKg,
  };
}