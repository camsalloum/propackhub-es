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
import { convertOrderQuantityToKg } from './unit-conversion';

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
  const productMetrics = calculateProductMetrics(estimate.dimensions, totalGsm, filmDensity, printingWebWidthMm);

  // Step 6b: Convert user-entered order quantity (in `orderQuantityUnit`) to true kg.
  // productMetrics are independent of order quantity, so no circular dependency.
  const trueOrderQuantityKg = convertOrderQuantityToKg(
    estimate.orderQuantityKg,
    estimate.orderQuantityUnit,
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

  // Step 9: Calculate sale price per kg (Laravel additive formula)
  const salePricePerKg = calculateSalePrice(
    layerRmCostPerKg + solventCostPerKg,
    estimate.markupPercent,
    estimate.platesPerKg,
    estimate.deliveryPerKg,
    processResults.operationCostPerKg
  );

  // Step 10: Calculate per‑slab prices and totals
  // Each slab may have a different order quantity, affecting process costs and thus sale price.
  const slabsWithTotals = estimate.slabs.map(slab => {
    // Re‑calculate process costs for this slab's quantity
    const slabProcessResults = calculateProcessCosts(
      estimate.processes,
      slab.quantityKg,
      productMetrics
    );

    const slabSalePricePerKg = calculateSalePrice(
      layerRmCostPerKg + solventCostPerKg,
      estimate.markupPercent,
      estimate.platesPerKg,
      estimate.deliveryPerKg,
      slabProcessResults.operationCostPerKg
    );

    return {
      ...slab,
      pricePerKg: slabSalePricePerKg,
      total: slab.quantityKg * slabSalePricePerKg
    };
  });

  // Step 11: Calculate cost breakdown percentages
  const materialCost = layerRmCostPerKg + solventCostPerKg;
  const rmCostPerM2 = totalCostM2 + solventDetail.totalCostPerM2;
  const markupAmount = materialCost * (estimate.markupPercent / 100);
  const totalCost = materialCost + markupAmount + estimate.platesPerKg +
    estimate.deliveryPerKg + processResults.operationCostPerKg;

  // Calculate waste cost impact: sum of (cost_m2 × waste/100) across all layers, converted to per-kg
  let totalWasteCostPerM2 = 0;
  layersWithCalc.forEach(layer => {
    const material = materials.get(layer.materialId);
    if (!material) return;

    let baseCostPerM2: number;
    if (material.type === 'substrate') {
      const gsm = layer.micron * material.density;
      baseCostPerM2 = (gsm / 1000) * material.costPerKgUsd;
    } else {
      // New model: layer.micron = dry gsm; costPerKgUsd = dry-equiv cost
      // cost/m² = (dry_gsm / 1000) × costPerKgUsd_dry_equiv
      baseCostPerM2 = (layer.micron / 1000) * material.costPerKgUsd;
    }
    totalWasteCostPerM2 += baseCostPerM2 * (material.wastePercent / 100);
  });
  const wasteCostPerKg = totalGsm > 0 ? (totalWasteCostPerM2 / totalGsm) * 1000 : 0;

  const costBreakdown = {
    materialPercent: totalCost > 0 ? (materialCost / totalCost) * 100 : 0,
    wastePercent: totalCost > 0 ? (wasteCostPerKg / totalCost) * 100 : 0,
    markupPercent: totalCost > 0 ? (markupAmount / totalCost) * 100 : 0,
    processPercent: totalCost > 0 ? (processResults.operationCostPerKg / totalCost) * 100 : 0
  };

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
    orderQuantityKpcs: trueOrderQuantityKg * (productMetrics.piecesPerKg || 0) / 1000,
    orderQuantitySqm: trueOrderQuantityKg * (sqmPerKg || 0),
    orderQuantityMeters: trueOrderQuantityKg * (productMetrics.linearMPerKgWeb || 0)
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
  printingWebWidthMm: number
) {
  const result = {
    piecesPerKg: 0,
    gramsPerPiece: 0,
    linearMPerKgWeb: 0,
    linearMPerKgReel: 0
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

    case 'pouch':
      // Pouch: face-area model.
      // pieces_per_kg = 1000 / (openWidthMm × openHeightMm × totalGsm × 1e-6)
      if (dimensions.openWidthMm && dimensions.openHeightMm) {
        result.piecesPerKg = (1000 / (dimensions.openWidthMm * dimensions.openHeightMm * totalGsm * 1e-6)) * 1;
        result.gramsPerPiece = 1000 / result.piecesPerKg;

        if (printingWebWidthMm > 0) {
          result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
        }

        // linear_m_per_kg_reel uses open_height (cut length)
        if (dimensions.openHeightMm > 0) {
          result.linearMPerKgReel = (sqmPerKg / dimensions.openHeightMm) * 1000;
        }
      }
      break;

    case 'bag': {
      // Bag: flat-sheet blank area model (gussets, flaps, lips, patches).
      // See bag-flat-sheet.ts. Falls back to face area if subtype unresolved.
      const bag = calculateBagFlatSheetAreaM2(dimensions);
      if (bag.areaM2 > 0) {
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
 * sale_price_kg = rm_kg + (rm_kg × markup% / 100) + plates_kg + delivery_kg + operation_kg
 */
function calculateSalePrice(
  materialCostPerKg: number,
  markupPercent: number,
  platesPerKg: number,
  deliveryPerKg: number,
  operationPerKg: number
): number {
  const markupAmount = materialCostPerKg * (markupPercent / 100);
  return materialCostPerKg + markupAmount + platesPerKg + deliveryPerKg + operationPerKg;
}