/** Production gates for local login and self-registration (Phase 5 SSO). */

export function isLocalLoginEnabled(): boolean {
  const flag = process.env.PRODUCT_LOCAL_LOGIN_ENABLED;
  if (flag !== undefined) return flag === 'true' || flag === '1';
  return process.env.NODE_ENV !== 'production';
}

export function isPublicRegistrationEnabled(): boolean {
  const flag = process.env.PRODUCT_PUBLIC_REGISTRATION_ENABLED;
  if (flag !== undefined) return flag === 'true' || flag === '1';
  return process.env.NODE_ENV !== 'production';
}

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.PRODUCT_LOCAL_LOGIN_ENABLED === undefined) {
    throw new Error('PRODUCT_LOCAL_LOGIN_ENABLED must be set in production');
  }
  if (process.env.PRODUCT_PUBLIC_REGISTRATION_ENABLED === undefined) {
    throw new Error('PRODUCT_PUBLIC_REGISTRATION_ENABLED must be set in production');
  }
  if (!process.env.ES_SSO_SECRET?.trim()) {
    throw new Error('ES_SSO_SECRET must be set in production (match PPH)');
  }
  if (!process.env.ES_PUBLIC_URL?.trim()) {
    throw new Error('ES_PUBLIC_URL must be set in production');
  }
}
