import { describe, expect, it } from 'vitest';
import { secretsEqual } from '../utils/pebi-integration-auth';

describe('secretsEqual', () => {
  it('matches equal secrets', () => {
    expect(secretsEqual('shared-secret', 'shared-secret')).toBe(true);
  });

  it('rejects unequal secrets of same length', () => {
    expect(secretsEqual('shared-secret', 'shared-secreX')).toBe(false);
  });

  it('rejects unequal lengths without throwing', () => {
    expect(secretsEqual('short', 'much-longer-secret')).toBe(false);
  });
});
