import {
  Estimate, Layer, Material, CalculationResult,
  EstimateDimensions, Process, MissingMaterialsError,
} from './types';
import { hasSolventBasedLayers } from './validator';

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
  const totalMicron = calculateTotalMicron(layersWithCalc, materials);
  const totalCostM2 = layersWithCalc.reduce((sum, layer) => sum + (layer.costPerM2 || 0), 0);

  // Step 3: Calculate film density and conversion factors
  const filmDensity = totalMicron > 0 ? totalGsm / totalMicron : 0;
  const sqmPerKg = totalGsm > 0 ? 1000 / totalGsm : 0;

  // Step 4: Calculate material cost per kg
  const materialCostPerKg = totalGsm > 0 ? (totalCostM2 / totalGsm) * 1000 : 0;

  // Step 5: Calculate printing web width if dimensions available
  const printingWebWidthMm = calculatePrintingWebWidth(estimate.dimensions);

  // Step 6: Calculate product-specific metrics
  const productMetrics = calculateProductMetrics(estimate.dimensions, totalGsm, filmDensity, printingWebWidthMm);

  // Step 7: Calculate solvent mix if needed
  const solventMix = calculateSolventMix(estimate, layersWithCalc, materials, totalGsm);

  // Step 8: Calculate operation costs from processes
  const processResults = calculateProcessCosts(estimate.processes, estimate.orderQuantityKg, productMetrics);

  // Step 9: Calculate sale price per kg (Laravel additive formula)
  const salePricePerKg = calculateSalePrice(
    materialCostPerKg + (solventMix.costPerM2 || 0) / totalGsm * 1000,
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
      materialCostPerKg + (solventMix.costPerM2 || 0) / totalGsm * 1000,
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
  const materialCost = materialCostPerKg + (solventMix.costPerM2 || 0) / totalGsm * 1000;
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
    totalGsm,
    totalMicron,
    filmDensity,
    sqmPerKg,
    materialCostPerKg: materialCost,
    markupAmountPerKg: markupAmount,
    operationCostPerKg: processResults.operationCostPerKg,
    salePricePerKg,
    solventMixCostPerKg: solventMix.costPerM2 ? solventMix.costPerM2 / totalGsm * 1000 : 0,
    solventMixRatio: solventMix.ratio,
    // Product metrics
    piecesPerKg: productMetrics.piecesPerKg,
    gramsPerPiece: productMetrics.gramsPerPiece,
    linearMPerKgWeb: productMetrics.linearMPerKgWeb,
    linearMPerKgReel: productMetrics.linearMPerKgReel,
    // Order quantities
    orderQuantityKpcs: estimate.orderQuantityKg * (productMetrics.piecesPerKg || 0) / 1000,
    orderQuantitySqm: estimate.orderQuantityKg * (sqmPerKg || 0),
    orderQuantityMeters: estimate.orderQuantityKg * (productMetrics.linearMPerKgWeb || 0)
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
    // Substrate: gsm = micron × density
    gsm = layer.micron * material.density;
    // cost_m2 = (gsm / 1000) × cost_per_kg × (1 + waste/100)
    costPerM2 = (gsm / 1000) * material.costPerKgUsd * (1 + material.wastePercent / 100);
  } else {
    // Ink or Adhesive: gsm = (solid × micron) / 100
    gsm = (material.solidPercent * layer.micron) / 100;
    // cost_m2 = (micron / 1000) × cost_per_kg × (1 + waste/100)
    // Note: uses micron, not gsm (Laravel specific)
    costPerM2 = (layer.micron / 1000) * material.costPerKgUsd * (1 + material.wastePercent / 100);
  }

  return {
    ...layer,
    gsm,
    costPerM2,
    material
  };
}

/**
 * Calculate total micron per COSTING_NOTES §3:
 * total_micron = Σ substrate_micron + Σ ink/adhesive_gsm
 * (substrate µ + ink/adhesive_gsm treated as thickness equivalent)
 *
 * This mixing of units is intentional: GSM of ink/adhesive layers is used as a
 * thickness equivalent in the total_micron calculation for film_density.
 */
function calculateTotalMicron(layers: Layer[], materials: Map<string, Material>): number {
  return layers.reduce((sum, layer) => {
    const material = materials.get(layer.materialId);
    if (!material) return sum;

    if (material.type === 'substrate') {
      // Substrate: add micron directly
      return sum + layer.micron;
    } else {
      // Ink/Adhesive: sum GSM as thickness equivalent (COSTING_NOTES §3)
      const gsm = (material.solidPercent * layer.micron) / 100;
      return sum + gsm;
    }
  }, 0);
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
      if (dimensions.openWidthMm && dimensions.openHeightMm) {
        // pieces_per_kg = (1000 / (open_width_mm × open_height_mm × total_gsm × 1e-6)) × 1
        result.piecesPerKg = (1000 / (dimensions.openWidthMm * dimensions.openHeightMm * totalGsm * 1e-6)) * 1;
        result.gramsPerPiece = 1000 / result.piecesPerKg;

        if (printingWebWidthMm > 0) {
          result.linearMPerKgWeb = (sqmPerKg / printingWebWidthMm) * 1000;
        }

        // For pouch, linear_m_per_kg_reel uses open_height (Laravel specific)
        if (dimensions.openHeightMm > 0) {
          result.linearMPerKgReel = (sqmPerKg / dimensions.openHeightMm) * 1000;
        }
      }
      break;
  }

  return result;
}

/**
 * Calculate solvent mix cost (when SB ink/adhesive present)
 */
function calculateSolventMix(
  estimate: Estimate,
  layers: Layer[],
  materials: Map<string, Material>,
  totalGsm: number
) {
  // Check if we need solvent mix
  const needsSolventMix = hasSolventBasedLayers(estimate.layers, materials);

  if (!needsSolventMix || totalGsm === 0) {
    return { costPerM2: 0, ratio: 0 };
  }

  // Sum GSM of solvent-based layers
  let solventBasedGsm = 0;
  layers.forEach(layer => {
    const material = materials.get(layer.materialId);
    if (material) {
      // Use isSolventBased field if available, otherwise fallback to name check
      const isSB = material.isSolventBased !== undefined
        ? material.isSolventBased
        : material.name.includes('SB');

      if ((material.type === 'ink' || material.type === 'adhesive') && isSB) {
        solventBasedGsm += layer.gsm || 0;
      }
    }
  });

  // Get solvent mix cost from estimate or use default
  const solventCostPerKg = estimate.solventCostPerKgUsd || 2.0;
  const solventRatio = estimate.solventRatio || 0.5;

  // PRD §7.3: cost_m2_solvent = (sum_gsm / gsm_ratio_denominator) × (cost_per_kg / 1000)
  // solventRatio is the gsm_ratio_denominator (ink-to-solvent ratio)
  const costPerM2 = (solventBasedGsm / solventRatio) * (solventCostPerKg / 1000);

  return { costPerM2, ratio: solventRatio };
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
        const pieces = orderQuantityKg * (productMetrics.piecesPerKg || 0) / 1000;
        runHours = pieces / (process.speedValue * 60);
        break;
    }

    const setupCost = process.costPerHour * process.setupHours;
    const runCost = process.costPerHour * runHours;
    const totalCost = Math.round(setupCost + runCost);
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