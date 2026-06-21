import { describe, it, expect } from 'vitest';
import {
  hashServiceKey,
  generateServiceKeyPlain,
  serviceKeyHasScope,
  parseServiceKeyScopes,
} from './service-key';
import { referenceEntityKey } from '../db/platform-master-audit';
import { checkRateLimit } from './rate-limit';

describe('service key helpers', () => {
  it('hashes deterministically with pepper', () => {
    const a = hashServiceKey('es_sk_test', 'pepper');
    const b = hashServiceKey('es_sk_test', 'pepper');
    const c = hashServiceKey('es_sk_test', 'other');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('generates prefixed keys', () => {
    expect(generateServiceKeyPlain()).toMatch(/^es_sk_[a-f0-9]{48}$/);
  });

  it('checks scopes', () => {
    expect(serviceKeyHasScope(['master_data:read'], 'master_data:read')).toBe(true);
    expect(serviceKeyHasScope(['*'], 'master_data:read')).toBe(true);
    expect(serviceKeyHasScope(['other:scope'], 'master_data:read')).toBe(false);
  });

  it('parses scope arrays', () => {
    expect(parseServiceKeyScopes(['master_data:read'])).toEqual(['master_data:read']);
    expect(parseServiceKeyScopes(null)).toEqual(['master_data:read']);
  });
});

describe('referenceEntityKey', () => {
  it('uses code when present', () => {
    expect(referenceEntityKey('rm_type', 'Substrate', 'substrate')).toBe('rm_type:substrate');
  });

  it('falls back to label slug', () => {
    expect(referenceEntityKey('unit', 'Square Meter', null)).toBe('unit:square meter');
  });
});

describe('checkRateLimit', () => {
  it('blocks after max requests in window', () => {
    const key = `test-${Date.now()}`;
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(false);
  });
});
