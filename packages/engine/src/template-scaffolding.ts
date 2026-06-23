/**
 * Structure-tier scaffolding helper (Smart Template Builder — Task 1.1).
 *
 * Maps a declared StructureTier to a layer skeleton (substrates + adhesives +
 * optional ink).  No materialIds are hard-coded here — callers must resolve
 * defaults from the library by type / family.
 */

export type StructureTier = 'Mono' | 'Duplex' | 'Triplex' | 'Quadriplex';
export type PrintMode = 'Plain' | 'Printed';

export interface ScaffoldLayerDescriptor {
  /** 1-based position in the suggested stack order */
  position: number;
  layer_type: 'substrate' | 'ink' | 'adhesive';
}

/** Count of substrate layers for each declared tier. */
export const TIER_SUBSTRATE_COUNT: Record<StructureTier, number> = {
  Mono: 1,
  Duplex: 2,
  Triplex: 3,
  Quadriplex: 4,
};

/** Count of adhesive layers for each declared tier (= substrates - 1). */
export const TIER_ADHESIVE_COUNT: Record<StructureTier, number> = {
  Mono: 0,
  Duplex: 1,
  Triplex: 2,
  Quadriplex: 3,
};

/**
 * Build a layer skeleton for the given declared tier and print mode.
 *
 * Scaffold convention (reverse-print default):
 *   substrate … [ink] … adhesive … substrate … adhesive … substrate …
 *
 * For Mono:
 *   Plain:   [substrate]
 *   Printed: [substrate, ink]
 *
 * For Duplex:
 *   Plain:   [substrate, adhesive, substrate]
 *   Printed: [substrate, ink, adhesive, substrate]
 *
 * For Triplex:
 *   Plain:   [substrate, adhesive, substrate, adhesive, substrate]
 *   Printed: [substrate, ink, adhesive, substrate, adhesive, substrate]
 *
 * For Quadriplex:
 *   Plain:   [substrate, adhesive, substrate, adhesive, substrate, adhesive, substrate]
 *   Printed: [substrate, ink, adhesive, substrate, adhesive, substrate, adhesive, substrate]
 *
 * The order is a *default* — callers may freely reorder layers after scaffolding.
 */
export function scaffoldLayerDescriptors(
  tier: StructureTier,
  printMode: PrintMode
): ScaffoldLayerDescriptor[] {
  const subCount = TIER_SUBSTRATE_COUNT[tier];
  const layers: ScaffoldLayerDescriptor[] = [];

  // Layer 1: first substrate
  layers.push({ position: layers.length + 1, layer_type: 'substrate' });

  // Optional ink (reverse-print position — after first substrate)
  if (printMode === 'Printed') {
    layers.push({ position: layers.length + 1, layer_type: 'ink' });
  }

  // Interleave remaining substrates with adhesives between them
  for (let i = 1; i < subCount; i++) {
    layers.push({ position: layers.length + 1, layer_type: 'adhesive' });
    layers.push({ position: layers.length + 1, layer_type: 'substrate' });
  }

  // Re-number positions sequentially (just in case)
  return layers.map((l, idx) => ({ ...l, position: idx + 1 }));
}

/**
 * Count substrates and adhesives in a scaffold to validate cardinality.
 */
export function countLayersByType(
  layers: Array<{ layer_type: string }>
): { substrates: number; adhesives: number; inks: number } {
  let substrates = 0;
  let adhesives = 0;
  let inks = 0;
  for (const l of layers) {
    if (l.layer_type === 'substrate') substrates++;
    else if (l.layer_type === 'adhesive') adhesives++;
    else if (l.layer_type === 'ink') inks++;
  }
  return { substrates, adhesives, inks };
}

/**
 * Reconcile a declared tier to the actual substrate count when the user has
 * manually edited layers.  Returns the tier that best matches the substrate
 * count (substrate count is authoritative after manual edits).
 */
export function reconcileTierToSubstrateCount(substrateCount: number): StructureTier {
  if (substrateCount >= 4) return 'Quadriplex';
  if (substrateCount === 3) return 'Triplex';
  if (substrateCount >= 2) return 'Duplex';
  return 'Mono';
}

/**
 * Convert a StructureTier to the stored `structureType` value ('Mono' | 'Multilayer').
 * Validates Requirement 2.4 / Property 5.
 */
export function tierToStructureType(tier: StructureTier): 'Mono' | 'Multilayer' {
  return tier === 'Mono' ? 'Mono' : 'Multilayer';
}

/**
 * Convert a stored `structureType` back to the closest StructureTier for display
 * purposes (without a declared tier only Mono vs Multilayer is known).
 */
export function structureTypeToDefaultTier(
  structureType: string | null | undefined
): StructureTier {
  return structureType === 'Multilayer' ? 'Duplex' : 'Mono';
}
