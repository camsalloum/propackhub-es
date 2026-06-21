import { describe, it, expect } from 'vitest';
import {
  materialAllowedForTemplateLayer,
  substrateFamilyAllowed,
} from './template-classification';

describe('substrateFamilyAllowed', () => {
  it('PE Mono allows PE only', () => {
    const ctx = { materialClass: 'PE', structureType: 'Mono', productType: 'pouch' as const };
    expect(substrateFamilyAllowed('PE', ctx)).toBe(true);
    expect(substrateFamilyAllowed('BOPP', ctx)).toBe(false);
    expect(substrateFamilyAllowed('PET', ctx)).toBe(false);
  });

  it('Non PE Mono excludes PE', () => {
    const ctx = { materialClass: 'Non PE', structureType: 'Mono', productType: 'roll' as const };
    expect(substrateFamilyAllowed('BOPP', ctx)).toBe(true);
    expect(substrateFamilyAllowed('PE', ctx)).toBe(false);
  });

  it('Non PE Mono sleeve allows SLEEVE and PET', () => {
    const ctx = { materialClass: 'Non PE', structureType: 'Mono', productType: 'sleeve' as const };
    expect(substrateFamilyAllowed('SLEEVE', ctx)).toBe(true);
    expect(substrateFamilyAllowed('PET', ctx)).toBe(true);
    expect(substrateFamilyAllowed('BOPP', ctx)).toBe(false);
  });

  it('Multilayer allows mixed families', () => {
    const ctx = { materialClass: 'Non PE', structureType: 'Multilayer', productType: 'roll' as const };
    expect(substrateFamilyAllowed('PET', ctx)).toBe(true);
    expect(substrateFamilyAllowed('PE', ctx)).toBe(true);
  });
});

describe('materialAllowedForTemplateLayer', () => {
  const peCtx = { materialClass: 'PE', structureType: 'Mono', productType: 'pouch' as const };

  it('filters substrates by classification', () => {
    expect(
      materialAllowedForTemplateLayer({ type: 'substrate', substrateFamily: 'PE' }, 'substrate', peCtx)
    ).toBe(true);
    expect(
      materialAllowedForTemplateLayer({ type: 'substrate', substrateFamily: 'PET' }, 'substrate', peCtx)
    ).toBe(false);
  });

  it('does not filter ink by substrate family', () => {
    expect(materialAllowedForTemplateLayer({ type: 'ink', substrateFamily: 'Solvent Based' }, 'ink', peCtx)).toBe(
      true
    );
  });
});
