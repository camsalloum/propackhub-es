import { createHash, randomBytes } from 'node:crypto';

const KEY_PREFIX = 'es_sk_';

export function hashServiceKey(plainKey: string, pepper: string): string {
  return createHash('sha256').update(`${pepper}:${plainKey}`).digest('hex');
}

export function generateServiceKeyPlain(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString('hex')}`;
}

export function parseServiceKeyScopes(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === 'string' && s.length > 0);
  }
  return ['master_data:read'];
}

export function serviceKeyHasScope(scopes: string[], required: string): boolean {
  return scopes.includes(required) || scopes.includes('*');
}
