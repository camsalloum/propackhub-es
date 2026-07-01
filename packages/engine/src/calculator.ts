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
import { wastePercentForQuantity, type WasteBand } from './waste-bands';

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

  // Step 8: Calculate operation costs from processes (using converted kg)
  const processResults = calculateProcessCosts(estimate.processes, trueOrderQuantityKg, productMetrics);

  // ── Step 9: Pricing ──────────────────────────────────────────────────────
  const materialCost = layerRmCostPerKg + solventCostPerKg;
  const rmCostPerM2 = totalCostM2 + solventDetail.totalCostPerM2;

  // Legacy waste-cost impact (sum of per-material wastePercent), used only by the
  // legacy breakdown. The new model derives waste from the order-quantity band.
  let totalWasteCostPerM2 = 0;
  layersWithCalc.forEach(layer => {
    const material = materials.get(layer.materialId);
    if (!material) return;

    let baseCostPerM2: number;
    if (material.type === 'substrate') {
      const gsm = layer.micron * material.density;
      baseCostPerM2 = (gsm / 1000) * material.costPerKgUsd;
    } else {
      baseCostPerM2 = (layer.micron / 1000) * material.costPerKgUsd;
    }
    totalWasteCostPerM2 += baseCostPerM2 * (material.wastePercent / 100);
  });
  const legacyWasteCostPerKg = totalGsm > 0 ? (totalWasteCostPerM2 / totalGsm) * 1000 : 0;

  // When pricingMethod is set the new model runs (quantity-band waste +
  // lump-sum tooling/delivery amortized over the order qty + margin). Otherwise
  // the legacy additive model runs unchanged.
  const useNewModel =
    estimate.pricingMethod === 'markup' || estimate.pricingMethod === 'margin_per_kg';

  let salePricePerKg: number;
  let slabsWithTotals: CalculationResult['slabs'];
  let markupAmount: number;
  let totalCost: number;
  let costBreakdown: CalculationResult['costBreakdown'];
  let newModel: ReturnType<typeof priceWithNewModel> | null = null;

  if (useNewModel) {
    const charges = {
      materialPerKg: materialCost,
      accessoryPerKg: accessoryCostPerKg,
      amortizeQtyKg: trueOrderQuantityKg,
      wasteBands: estimate.wasteBands,
      toolingChargeUsd: estimate.toolingChargeUsd ?? 0,
      toolingBilled: estimate.toolingBilledToCustomer ?? false,
      deliveryChargeUsd: estimate.deliveryChargeUsd ?? 0,
      pricingMethod: estimate.pricingMethod!,
      markupPercent: estimate.markupPercent,
      marginValuePerKgUsd: estimate.marginValuePerKgUsd ?? 0,
    };

    newModel = priceWithNewModel({ ...charges, wasteQtyKg: trueOrderQuantityKg });
    salePricePerKg = newModel.salePricePerKg;
    markupAmount = newModel.marginPerKg;
    totalCost = newModel.salePricePerKg;

    // Slab ladder: waste varies per band (slab quantity); logistics, development
    // and margin parameters stay flat (amortized over the entered order qty).
    slabsWithTotals = estimate.slabs.map(slab => {
      const p = priceWithNewModel({ ...charges, wasteQtyKg: slab.quantityKg });
      return { ...slab, pricePerKg: p.salePricePerKg, total: slab.quantityKg * p.salePricePerKg };
    });

    const denom = totalCost > 0 ? totalCost : 0;
    const wasteAmount = newModel.wasteAdjustedMaterialPerKg - materialCost;
    costBreakdown = {
      materialPercent: denom > 0 ? (materialCost / denom) * 100 : 0,
      wastePercent: denom > 0 ? (wasteAmount / denom) * 100 : 0,
      markupPercent: denom > 0 ? (newModel.marginPerKg / denom) * 100 : 0,
      processPercent: 0,
      accessoryPercent: denom > 0 ? (accessoryCostPerKg / denom) * 100 : 0,
      logisticsPercent: denom > 0 ? (newModel.logisticsCostPerKg / denom) * 100 : 0,
      developmentPercent: denom > 0 ? (newModel.developmentCostPerKg / denom) * 100 : 0,
    };
  } else {
    // ── Legacy additive model (unchanged) ──
    salePricePerKg = calculateSalePrice(
      materialCost,
      estimate.markupPercent,
      estimate.platesPerKg,
      estimate.deliveryPerKg,
      processResults.operationCostPerKg,
      accessoryCostPerKg
    );

    slabsWithTotals = estimate.slabs.map(slab => {
      const slabProcessResults = calculateProcessCosts(
        estimate.processes,
        slab.quantityKg,
        productMetrics
      );
      const slabSalePricePerKg = calculateSalePrice(
        materialCost,
        estimate.markupPercent,
        estimate.platesPerKg,
        estimate.deliveryPerKg,
        slabProcessResults.operationCostPerKg,
        accessoryCostPerKg
      );
      return {
        ...slab,
        pricePerKg: slabSalePricePerKg,
        total: slab.quantityKg * slabSalePricePerKg,
      };
    });

    markupAmount = materialCost * (estimate.markupPercent / 100);
    totalCost = materialCost + markupAmount + estimate.platesPerKg +
      estimate.deliveryPerKg + processResults.operationCostPerKg + accessoryCostPerKg;

    costBreakdown = {
      materialPercent: totalCost > 0 ? (materialCost / totalCost) * 100 : 0,
      wastePercent: totalCost > 0 ? (legacyWasteCostPerKg / totalCost) * 100 : 0,
      markupPercent: totalCost > 0 ? (markupAmount / totalCost) * 100 : 0,
      processPercent: totalCost > 0 ? (processResults.operationCostPerKg / totalCost) * 100 : 0,
      accessoryPercent: totalCost > 0 ? (accessoryCostPerKg / totalCost) * 100 : 0,
    };
  }


  // Update estimate with calculated fields
  const updatedEstimate: Estimate = {
    ...estimate,
    layers: layersWithCalc,
    processes: processResults.processes,
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
    operationCostPerKg: processResults.operationCostPerKg,
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
    // New pricing model breakdown (per kg). Undefined when the legacy model runs.
    wastePercentApplied: newModel?.wastePct,
    wasteAdjustedMaterialPerKg: newModel?.wasteAdjustedMaterialPerKg,
    logisticsCostPerKg: newModel?.logisticsCostPerKg,
    developmentCostPerKg: newModel?.developmentCostPerKg,
    marginPerKg: newModel?.marginPerKg,
    pricingMethodResolved: useNewModel ? estimate.pricingMethod : undefined,
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
function calculateLayer(layer: Layer, material: Material): Layer {
  let gsm: number;
  let costPerM2: number;

  if (material.type === 'substrate') {
    // Substrate: user enters micron; gsm = micron × density
    gsm = layer.micron * material.density;
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
    case 'roll':
      if (dimensions.reelWidthMm && dimensions.cutoffMm && dimensions.piecesPerCut) {
        // pieces_per_kg = (1000 / (reel_width_mm × cut_off_mm × total_gsm × 1e-6)) × pieces_per_cut
        result.piecesPerKg = (1000 / (dimensions.reelWidthMm * dimensions.cutoffMm * totalGsm * 1e-6)) * dimensions.piecesPerCut;
        result.gramsPerPiece = 1000 / result.piecesPerKg;

        if (printingWebWidthMm > 0) {
          // linear_m_per_kg_web = (sqm_per_kg / printing_web_width_mm) × 1000
          result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
        }

        if (dimensions.reelWidthMm > 0) {
          // linear_m_per_kg_reel = (sqm_per_kg / reel_width_mm) × 1000
          result.linearMPerKgReel = (sqmPerKg / dimensions.reelWidthMm) * 1000;
        }
      }
      break;

    case 'sleeve':
      if (dimensions.reelWidthMm && dimensions.cutoffMm) {
        // Same as roll but pieces_per_cut = 1
        result.piecesPerKg = (1000 / (dimensions.reelWidthMm * dimensions.cutoffMm * totalGsm * 1e-6)) * 1;
        result.gramsPerPiece = 1000 / result.piecesPerKg;

        if (printingWebWidthMm > 0) {
          result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
        }

        if (dimensions.reelWidthMm > 0) {
          result.linearMPerKgReel = (sqmPerKg / dimensions.reelWidthMm) * 1000;
        }
      }
      break;

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
 * Calculate process costs
 */
function calculateProcessCosts(
  processes: Process[],
  orderQuantityKg: number,
  productMetrics: ReturnType<typeof calculateProductMetrics>
) {
  let totalProcessCost = 0;

  const updatedProcesses = processes.map(process => {
    if (!process.enabled) {
      return { ...process, runHours: 0, totalCost: 0 };
    }

    let runHours = 0;

    switch (process.speedBasis) {
      case 'kg_per_hour':
        runHours = orderQuantityKg / process.speedValue;
        break;
      case 'm_per_min':
        const meters = orderQuantityKg * (productMetrics.linearMPerKgWeb || 0);
        runHours = meters / (process.speedValue * 60);
        break;
      case 'pcs_per_min':
        // pieces = kg × piecesPerKg (piecesPerKg is pieces/kg, NOT kpcs/kg)
        const pieces = orderQuantityKg * (productMetrics.piecesPerKg || 0);
        runHours = pieces / (process.speedValue * 60);
        break;
    }

    const setupCost = process.costPerHour * process.setupHours;
    const runCost = process.costPerHour * runHours;
    const totalCost = setupCost + runCost;
    totalProcessCost += totalCost;

    return {
      ...process,
      runHours,
      totalCost
    };
  });

  const operationCostPerKg = orderQuantityKg > 0 ? totalProcessCost / orderQuantityKg : 0;

  return {
    processes: updatedProcesses,
    totalProcessCost,
    operationCostPerKg
  };
}

/**
 * Calculate sale price per kg using Laravel additive formula
 * sale_price_kg = rm_kg + (rm_kg × markup% / 100) + plates_kg + delivery_kg + operation_kg + accessory_kg
 * Accessory hardware (zipper/spout/valve/etc.) is a pass-through component cost,
 * added outside the markup like plates and delivery.
 */
function calculateSalePrice(
  materialCostPerKg: number,
  markupPercent: number,
  platesPerKg: number,
  deliveryPerKg: number,
  operationPerKg: number,
  accessoryPerKg: number = 0
): number {
  const markupAmount = materialCostPerKg * (markupPercent / 100);
  return materialCostPerKg + markupAmount + platesPerKg + deliveryPerKg + operationPerKg + accessoryPerKg;
}

/**
 * New pricing model price build-up (per kg, USD base):
 *   wasteAdjMaterial = material × (1 + bandWaste%/100)
 *   costBase         = wasteAdjMaterial + accessory + logistics + development
 *   margin           = markup% × costBase   OR   fixed margin/kg
 *   sale             = costBase + margin
 *
 * Logistics & development are lump sums amortized over `amortizeQtyKg` (the
 * entered order quantity). `wasteQtyKg` selects the waste band (the order qty
 * for the headline price; each slab's qty for the ladder).
 */
function priceWithNewModel(params: {
  materialPerKg: number;
  accessoryPerKg: number;
  wasteQtyKg: number;
  amortizeQtyKg: number;
  wasteBands?: WasteBand[];
  toolingChargeUsd: number;
  toolingBilled: boolean;
  deliveryChargeUsd: number;
  pricingMethod: 'markup' | 'margin_per_kg';
  markupPercent: number;
  marginValuePerKgUsd: number;
}): {
  wastePct: number;
  wasteAdjustedMaterialPerKg: number;
  logisticsCostPerKg: number;
  developmentCostPerKg: number;
  costBasePerKg: number;
  marginPerKg: number;
  salePricePerKg: number;
} {
  const wastePct = wastePercentForQuantity(params.wasteQtyKg, params.wasteBands);
  const wasteAdjustedMaterialPerKg = params.materialPerKg * (1 + wastePct / 100);
  const amort = params.amortizeQtyKg > 0 ? params.amortizeQtyKg : 0;
  const logisticsCostPerKg = amort > 0 ? params.deliveryChargeUsd / amort : 0;
  const developmentCostPerKg =
    params.toolingBilled && amort > 0 ? params.toolingChargeUsd / amort : 0;
  const costBasePerKg =
    wasteAdjustedMaterialPerKg + params.accessoryPerKg + logisticsCostPerKg + developmentCostPerKg;
  const marginPerKg =
    params.pricingMethod === 'margin_per_kg'
      ? params.marginValuePerKgUsd
      : costBasePerKg * (params.markupPercent / 100);
  const salePricePerKg = costBasePerKg + marginPerKg;
  return {
    wastePct,
    wasteAdjustedMaterialPerKg,
    logisticsCostPerKg,
    developmentCostPerKg,
    costBasePerKg,
    marginPerKg,
    salePricePerKg,
  };
}