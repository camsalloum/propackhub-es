import { Estimate, Layer, Material, EstimateDimensions } from './types';
import { stackNeedsSolventMix } from './layer-stack';

/**
 * Validate an estimate structure
 */
export function validateEstimate(estimate: Partial<Estimate>): string[] {
  const errors: string[] = [];

  if (!estimate.tenantId) {
    errors.push('tenantId is required');
  }

  if (!estimate.jobName || estimate.jobName.trim().length === 0) {
    errors.push('jobName is required');
  }

  if (!estimate.dimensions) {
    errors.push('dimensions are required');
  } else {
    errors.push(...validateDimensions(estimate.dimensions));
  }

  if (estimate.layers) {
    errors.push(...validateLayers(estimate.layers));
  }

  if (estimate.markupPercent !== undefined && estimate.markupPercent < 0) {
    errors.push('markupPercent must be non-negative');
  }

  if (estimate.orderQuantityKg !== undefined && estimate.orderQuantityKg <= 0) {
    errors.push('orderQuantityKg must be positive');
  }

  return errors;
}

/**
 * Validate dimensions based on product type
 */
export function validateDimensions(dimensions: EstimateDimensions): string[] {
  const errors: string[] = [];

  if (!dimensions.productType) {
    errors.push('productType is required');
    return errors;
  }

  switch (dimensions.productType) {
    case 'roll':
    case 'sleeve':
      if (!dimensions.reelWidthMm || dimensions.reelWidthMm <= 0) {
        errors.push('reelWidthMm is required and must be positive for roll/sleeve');
      }
      if (!dimensions.cutoffMm || dimensions.cutoffMm <= 0) {
        errors.push('cutoffMm is required and must be positive for roll/sleeve');
      }
      if (dimensions.numberOfUps === undefined || dimensions.numberOfUps < 1) {
        errors.push('numberOfUps is required and must be at least 1');
      }
      if (dimensions.extraPrintingTrimMm === undefined) {
        errors.push('extraPrintingTrimMm is required');
      }
      if (dimensions.productType === 'roll' && (!dimensions.piecesPerCut || dimensions.piecesPerCut < 1)) {
        errors.push('piecesPerCut is required and must be at least 1 for roll');
      }
      break;

    case 'pouch':
      if (!dimensions.openWidthMm || dimensions.openWidthMm <= 0) {
        errors.push('openWidthMm is required and must be positive for pouch');
      }
      if (!dimensions.openHeightMm || dimensions.openHeightMm <= 0) {
        errors.push('openHeightMm is required and must be positive for pouch');
      }
      if (dimensions.numberOfUps === undefined || dimensions.numberOfUps < 1) {
        errors.push('numberOfUps is required and must be at least 1');
      }
      if (dimensions.extraPrintingTrimMm === undefined) {
        errors.push('extraPrintingTrimMm is required');
      }
      break;
  }

  // printingWebClass is auto-derived on save from ink layer materials — not user input.

  return errors;
}

/**
 * Validate layers structure
 */
export function validateLayers(layers: Layer[]): string[] {
  const errors: string[] = [];

  if (layers.length === 0) {
    errors.push('At least one layer is required');
  }

  layers.forEach((layer, index) => {
    if (!layer.materialId) {
      errors.push(`Layer ${index + 1}: materialId is required`);
    }
    if (!layer.micron || layer.micron <= 0) {
      errors.push(`Layer ${index + 1}: micron must be positive`);
    }
    if (layer.position === undefined || layer.position < 0) {
      errors.push(`Layer ${index + 1}: position must be non-negative`);
    }
  });

  // Check for duplicate positions
  const positions = layers.map(l => l.position);
  const uniquePositions = new Set(positions);
  if (positions.length !== uniquePositions.size) {
    errors.push('Layer positions must be unique');
  }

  return errors;
}

/**
 * Validate material properties
 */
export function validateMaterial(material: Material): string[] {
  const errors: string[] = [];

  if (!material.name || material.name.trim().length === 0) {
    errors.push('Material name is required');
  }

  if (!material.type || !['substrate', 'ink', 'adhesive'].includes(material.type)) {
    errors.push('Material type must be substrate, ink, or adhesive');
  }

  if (material.solidPercent === undefined || material.solidPercent < 0 || material.solidPercent > 100) {
    errors.push('solidPercent must be between 0 and 100');
  }

  if (material.density === undefined || material.density <= 0) {
    errors.push('density must be positive');
  }

  if (material.costPerKgUsd === undefined || material.costPerKgUsd < 0) {
    errors.push('costPerKgUsd must be non-negative');
  }

  if (material.wastePercent === undefined || material.wastePercent < 0) {
    errors.push('wastePercent must be non-negative');
  }

  return errors;
}

/**
 * @deprecated Use `stackNeedsSolventMix` from `layer-stack` — same rule (SB ink or SB adhesive only).
 */
export function hasSolventBasedLayers(layers: Layer[], materials: Map<string, Material>): boolean {
  return stackNeedsSolventMix(
    layers.map((l) => ({ materialId: l.materialId })),
    materials
  );
}