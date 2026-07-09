import { describe, expect, it } from 'vitest';
import { micronAfterMaterialChange, nominalMicronFromMaterial } from './materialNominalMicron';

describe('nominalMicronFromMaterial', () => {
  it('reads ALU gauge from platform master key', () => {
    expect(nominalMicronFromMaterial({ platformMasterKey: 'alu-foil-9' })).toBe(9);
    expect(nominalMicronFromMaterial({ platformMasterKey: 'alu-foil-12' })).toBe(12);
  });

  it('falls back to ALU display name', () => {
    expect(
      nominalMicronFromMaterial({
        substrateFamily: 'ALU',
        name: 'Aluminium Foil 8 µm',
      })
    ).toBe(8);
  });

  it('returns null for open-gauge grades', () => {
    expect(nominalMicronFromMaterial({ platformMasterKey: 'pet-transparent' })).toBeNull();
    expect(nominalMicronFromMaterial({ platformMasterKey: 'aluminium-foil', substrateFamily: 'ALU' })).toBeNull();
  });
});

describe('micronAfterMaterialChange', () => {
  it('replaces micron when grade encodes thickness', () => {
    expect(
      micronAfterMaterialChange({ platformMasterKey: 'alu-foil-8' }, 25)
    ).toBe(8);
  });

  it('keeps micron for PET grade changes', () => {
    expect(
      micronAfterMaterialChange({ platformMasterKey: 'pet-transparent' }, 12)
    ).toBe(12);
  });
});
