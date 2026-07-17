import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DENSITY,
  resolveDensity,
  resolveEffectiveDensity,
} from './densityStore';

describe('resolveDensity', () => {
  it('defaults null to auto', () => {
    expect(resolveDensity(null)).toEqual({ preference: 'auto', overwrite: false });
  });

  it('accepts valid preferences', () => {
    expect(resolveDensity('compact').preference).toBe('compact');
    expect(resolveDensity('auto').preference).toBe('auto');
  });

  it('overwrites unknown values to auto', () => {
    expect(resolveDensity('huge')).toEqual({ preference: DEFAULT_DENSITY, overwrite: true });
  });
});

describe('resolveEffectiveDensity', () => {
  it('passes through fixed preferences', () => {
    expect(resolveEffectiveDensity('spacious')).toBe('spacious');
    expect(resolveEffectiveDensity('compact', false)).toBe('compact');
  });

  it('maps auto to compact when narrow', () => {
    expect(resolveEffectiveDensity('auto', true)).toBe('compact');
    expect(resolveEffectiveDensity('auto', false)).toBe('comfortable');
  });
});
