import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  scaffoldLayerDescriptors,
  countLayersByType,
  reconcileTierToSubstrateCount,
  tierToStructureType,
  structureTypeToDefaultTier,
  TIER_SUBSTRATE_COUNT,
  TIER_ADHESIVE_COUNT,
  type StructureTier,
  type PrintMode,
} from './template-scaffolding';

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('scaffoldLayerDescriptors — cardinality', () => {
  it('Mono Plain → 1 substrate, 0 adhesives, 0 inks', () => {
    const layers = scaffoldLayerDescriptors('Mono', 'Plain');
    const counts = countLayersByType(layers);
    expect(counts.substrates).toBe(1);
    expect(counts.adhesives).toBe(0);
    expect(counts.inks).toBe(0);
  });

  it('Mono Printed → 1 substrate, 0 adhesives, 1 ink', () => {
    const layers = scaffoldLayerDescriptors('Mono', 'Printed');
    const counts = countLayersByType(layers);
    expect(counts.substrates).toBe(1);
    expect(counts.adhesives).toBe(0);
    expect(counts.inks).toBe(1);
  });

  it('Duplex Plain → 2 substrates, 1 adhesive, 0 inks', () => {
    const layers = scaffoldLayerDescriptors('Duplex', 'Plain');
    const counts = countLayersByType(layers);
    expect(counts.substrates).toBe(2);
    expect(counts.adhesives).toBe(1);
    expect(counts.inks).toBe(0);
  });

  it('Duplex Printed → 2 substrates, 1 adhesive, 1 ink', () => {
    const layers = scaffoldLayerDescriptors('Duplex', 'Printed');
    const counts = countLayersByType(layers);
    expect(counts.substrates).toBe(2);
    expect(counts.adhesives).toBe(1);
    expect(counts.inks).toBe(1);
  });

  it('Triplex Plain → 3 substrates, 2 adhesives, 0 inks', () => {
    const layers = scaffoldLayerDescriptors('Triplex', 'Plain');
    const counts = countLayersByType(layers);
    expect(counts.substrates).toBe(3);
    expect(counts.adhesives).toBe(2);
    expect(counts.inks).toBe(0);
  });

  it('Triplex Printed → 3 substrates, 2 adhesives, 1 ink', () => {
    const layers = scaffoldLayerDescriptors('Triplex', 'Printed');
    const counts = countLayersByType(layers);
    expect(counts.substrates).toBe(3);
    expect(counts.adhesives).toBe(2);
    expect(counts.inks).toBe(1);
  });

  it('Quadriplex Plain → 4 substrates, 3 adhesives, 0 inks', () => {
    const layers = scaffoldLayerDescriptors('Quadriplex', 'Plain');
    const counts = countLayersByType(layers);
    expect(counts.substrates).toBe(4);
    expect(counts.adhesives).toBe(3);
    expect(counts.inks).toBe(0);
  });

  it('Quadriplex Printed → 4 substrates, 3 adhesives, 1 ink', () => {
    const layers = scaffoldLayerDescriptors('Quadriplex', 'Printed');
    const counts = countLayersByType(layers);
    expect(counts.substrates).toBe(4);
    expect(counts.adhesives).toBe(3);
    expect(counts.inks).toBe(1);
  });
});

describe('scaffoldLayerDescriptors — positions', () => {
  it('positions are sequential 1-based', () => {
    const layers = scaffoldLayerDescriptors('Triplex', 'Printed');
    layers.forEach((l, i) => expect(l.position).toBe(i + 1));
  });
});

describe('reconcileTierToSubstrateCount', () => {
  it('1 substrate → Mono', () => expect(reconcileTierToSubstrateCount(1)).toBe('Mono'));
  it('2 substrates → Duplex', () => expect(reconcileTierToSubstrateCount(2)).toBe('Duplex'));
  it('3 substrates → Triplex', () => expect(reconcileTierToSubstrateCount(3)).toBe('Triplex'));
  it('4 substrates → Quadriplex', () => expect(reconcileTierToSubstrateCount(4)).toBe('Quadriplex'));
  it('5 substrates → Quadriplex (clamp)', () => expect(reconcileTierToSubstrateCount(5)).toBe('Quadriplex'));
});

describe('tierToStructureType', () => {
  it('Mono → Mono', () => expect(tierToStructureType('Mono')).toBe('Mono'));
  it('Duplex → Multilayer', () => expect(tierToStructureType('Duplex')).toBe('Multilayer'));
  it('Triplex → Multilayer', () => expect(tierToStructureType('Triplex')).toBe('Multilayer'));
  it('Quadriplex → Multilayer', () => expect(tierToStructureType('Quadriplex')).toBe('Multilayer'));
});

describe('structureTypeToDefaultTier', () => {
  it('Multilayer → Duplex', () => expect(structureTypeToDefaultTier('Multilayer')).toBe('Duplex'));
  it('Mono → Mono', () => expect(structureTypeToDefaultTier('Mono')).toBe('Mono'));
  it('null → Mono', () => expect(structureTypeToDefaultTier(null)).toBe('Mono'));
});

// ─── PE family enforcement unit tests (extended — Task 1.2) ──────────────────

import { substrateFamilyAllowed } from './template-classification';

describe('substrateFamilyAllowed — PE extended to all tiers', () => {
  it('PE Mono → only PE allowed', () => {
    const ctx = { materialClass: 'PE', structureType: 'Mono', productType: 'pouch' as const };
    expect(substrateFamilyAllowed('PE', ctx)).toBe(true);
    expect(substrateFamilyAllowed('BOPP', ctx)).toBe(false);
    expect(substrateFamilyAllowed('PET', ctx)).toBe(false);
  });

  it('PE Multilayer → only PE allowed (new: was true for all before)', () => {
    const ctx = { materialClass: 'PE', structureType: 'Multilayer', productType: 'roll' as const };
    expect(substrateFamilyAllowed('PE', ctx)).toBe(true);
    expect(substrateFamilyAllowed('BOPP', ctx)).toBe(false);
    expect(substrateFamilyAllowed('PET', ctx)).toBe(false);
  });

  it('Non PE Mono non-sleeve → PE excluded', () => {
    const ctx = { materialClass: 'Non PE', structureType: 'Mono', productType: 'roll' as const };
    expect(substrateFamilyAllowed('BOPP', ctx)).toBe(true);
    expect(substrateFamilyAllowed('PE', ctx)).toBe(false);
  });

  it('Non PE Multilayer → mixed families allowed', () => {
    const ctx = { materialClass: 'Non PE', structureType: 'Multilayer', productType: 'roll' as const };
    expect(substrateFamilyAllowed('PET', ctx)).toBe(true);
    expect(substrateFamilyAllowed('PE', ctx)).toBe(true);
    expect(substrateFamilyAllowed('BOPP', ctx)).toBe(true);
  });

  it('Non PE Mono sleeve → SLEEVE and PET only', () => {
    const ctx = { materialClass: 'Non PE', structureType: 'Mono', productType: 'sleeve' as const };
    expect(substrateFamilyAllowed('SLEEVE', ctx)).toBe(true);
    expect(substrateFamilyAllowed('PET', ctx)).toBe(true);
    expect(substrateFamilyAllowed('BOPP', ctx)).toBe(false);
    expect(substrateFamilyAllowed('PE', ctx)).toBe(false);
  });
});

// ─── Property-based tests (fast-check — Task 1.4 / design invariants) ─────────

const tierArb = fc.constantFrom<StructureTier>('Mono', 'Duplex', 'Triplex', 'Quadriplex');
const printModeArb = fc.constantFrom<PrintMode>('Plain', 'Printed');

describe('Property 1: Scaffold cardinality', () => {
  it('scaffold(tier, mode) produces exactly tier substrates and max(tier-1,0) adhesives', () => {
    fc.assert(
      fc.property(tierArb, printModeArb, (tier, printMode) => {
        const layers = scaffoldLayerDescriptors(tier, printMode);
        const { substrates, adhesives } = countLayersByType(layers);
        expect(substrates).toBe(TIER_SUBSTRATE_COUNT[tier]);
        expect(adhesives).toBe(TIER_ADHESIVE_COUNT[tier]);
      })
    );
  });
});

describe('Property 2: Mono single substrate', () => {
  it('Mono scaffold always has exactly 1 substrate regardless of print mode', () => {
    fc.assert(
      fc.property(printModeArb, (printMode) => {
        const layers = scaffoldLayerDescriptors('Mono', printMode);
        const { substrates } = countLayersByType(layers);
        expect(substrates).toBe(1);
      })
    );
  });
});

describe('Property 4: Plain excludes ink', () => {
  it('Any Plain scaffold contains zero ink layers', () => {
    fc.assert(
      fc.property(tierArb, (tier) => {
        const layers = scaffoldLayerDescriptors(tier, 'Plain');
        const { inks } = countLayersByType(layers);
        expect(inks).toBe(0);
      })
    );
  });

  it('Any Printed scaffold contains exactly one ink layer', () => {
    fc.assert(
      fc.property(tierArb, (tier) => {
        const layers = scaffoldLayerDescriptors(tier, 'Printed');
        const { inks } = countLayersByType(layers);
        expect(inks).toBe(1);
      })
    );
  });
});

describe('Property 3: PE family closure (all tiers)', () => {
  const nonPeFamilies = fc.constantFrom('BOPP', 'PET', 'CPP', 'PA', 'ALU', 'PAPER');
  const allStructureTypes = fc.constantFrom('Mono', 'Multilayer');
  const productTypes = fc.constantFrom<'roll' | 'sleeve' | 'pouch'>('roll', 'sleeve', 'pouch');

  it('PE materialClass never allows non-PE substrate families across any structureType', () => {
    fc.assert(
      fc.property(nonPeFamilies, allStructureTypes, productTypes, (family, structureType, productType) => {
        expect(
          substrateFamilyAllowed(family, { materialClass: 'PE', structureType, productType })
        ).toBe(false);
      })
    );
  });
});

describe('Property 5: Tier ↔ structureType consistency', () => {
  it('tierToStructureType is Mono iff tier is Mono', () => {
    fc.assert(
      fc.property(tierArb, (tier) => {
        const st = tierToStructureType(tier);
        expect(st === 'Mono').toBe(tier === 'Mono');
        expect(st === 'Multilayer').toBe(tier !== 'Mono');
      })
    );
  });

  it('reconcileTierToSubstrateCount(TIER_SUBSTRATE_COUNT[tier]) === tier for all tiers', () => {
    fc.assert(
      fc.property(tierArb, (tier) => {
        const count = TIER_SUBSTRATE_COUNT[tier];
        expect(reconcileTierToSubstrateCount(count)).toBe(tier);
      })
    );
  });
});
