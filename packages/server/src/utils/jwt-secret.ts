/**
 * Single place for JWT / service-key pepper secret.
 * Production refuses the well-known development default.
 */
export const DEFAULT_DEV_JWT_SECRET = 'dev-secret-key-change-in-production';

export function resolveJwtSecret(override?: string): string {
  const secret = override ?? process.env.JWT_SECRET ?? DEFAULT_DEV_JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && secret === DEFAULT_DEV_JWT_SECRET) {
    throw new Error(
      'JWT_SECRET must be set to a strong, non-default value in production. Refusing to use the built-in development secret.'
    );
  }
  return secret;
}
