/**
 * State Validation Utilities for Estimate Fork/Customize/Snap-back transitions
 * 
 * Enforces server-side rules:
 * - processesCustomized can only be true if structureForked is true
 * - Layer updates are blocked after processesCustomized=true (lock prevents modification)
 * - Snap-back (revert to template) requires original template to exist
 */

export type EstimateState = {
  id: string;
  structureForked: boolean | null;
  processesCustomized: boolean | null;
  sourceTemplateKey: string | null;
  structureSignature: string | null;
};

export type StateTransition =
  | 'fork' // First time layers diverge from template (structureForked=false → true)
  | 'customize' // User locks in processes (processesCustomized=false → true)
  | 'snap_back' // Revert entire structure to template (structureForked=true → false)
  | 'none';

/**
 * Validates processesCustomized transition.
 * Rule: Cannot set processesCustomized=true unless structureForked=true
 * 
 * @param existing Current estimate state
 * @param newProcessesCustomized Proposed value for processesCustomized
 * @returns { valid: boolean, error?: string }
 */
export function validateProcessesCustomizeTransition(
  existing: EstimateState,
  newProcessesCustomized: boolean
): { valid: boolean; error?: string } {
  // Can only customize if already forked
  if (newProcessesCustomized && !existing.structureForked) {
    return {
      valid: false,
      error: 'Cannot customize processes before structure is forked. Modify layers first.',
    };
  }
  return { valid: true };
}

/**
 * Validates layer updates after customization.
 * Rule: If processesCustomized=true (locked), prevent layer modifications
 * (soft enforcement — UI should disable, but server should reject for safety)
 * 
 * @param existing Current estimate state
 * @param isLayerUpdate Whether this request includes layer modifications
 * @returns { valid: boolean, error?: string }
 */
export function validateLayerUpdateAfterCustomize(
  existing: EstimateState,
  isLayerUpdate: boolean
): { valid: boolean; error?: string } {
  // If processes are locked and user tries to modify layers, warn/prevent
  if (isLayerUpdate && existing.processesCustomized) {
    return {
      valid: false,
      error: 'Cannot modify layers after processes are locked. Use "Snap back" to revert or start over.',
    };
  }
  return { valid: true };
}

/**
 * Validates snap-back (revert to template) transition.
 * Rule: Can only snap-back if original template exists and estimate is forked
 * 
 * @param existing Current estimate state
 * @returns { valid: boolean, error?: string }
 */
export function validateSnapBackTransition(existing: EstimateState): {
  valid: boolean;
  error?: string;
} {
  if (!existing.sourceTemplateKey) {
    return {
      valid: false,
      error: 'Cannot snap back: no source template available.',
    };
  }
  if (!existing.structureForked) {
    return {
      valid: false,
      error: 'Estimate is not forked. Nothing to revert.',
    };
  }
  return { valid: true };
}

/**
 * Detects which state transition occurred between two snapshots.
 * Used for audit logging.
 * 
 * @param before Previous state
 * @param after New state
 * @returns StateTransition type
 */
export function detectStateTransition(
  before: EstimateState,
  after: EstimateState
): StateTransition {
  // Check for customize transition first (most specific)
  if (
    !before.processesCustomized &&
    after.processesCustomized &&
    after.structureForked
  ) {
    return 'customize';
  }

  // Check for snap-back transition
  if (before.structureForked && !after.structureForked) {
    return 'snap_back';
  }

  // Check for fork transition
  if (!before.structureForked && after.structureForked) {
    return 'fork';
  }

  return 'none';
}

/**
 * Builds a state snapshot for audit logging.
 */
export function buildStateSnapshot(estimate: EstimateState) {
  return {
    structureForked: estimate.structureForked,
    processesCustomized: estimate.processesCustomized,
    structureSignature: estimate.structureSignature,
    sourceTemplateKey: estimate.sourceTemplateKey,
  };
}
