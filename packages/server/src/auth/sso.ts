import { createRequire } from 'node:module';
import { consumeSsoJti } from './sso-token-uses';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');

export interface EsSsoPayload {
  aud: string;
  jti: string;
  state: string;
  sub: string;
  email?: string;
  companyId?: number | null;
  accountId?: number | null;
  tenantSlug: string;
}

export async function verifyEsSsoToken(token: string, stateFromQuery: string): Promise<EsSsoPayload> {
  const secret = process.env.ES_SSO_SECRET;
  if (!secret) {
    throw new Error('ES_SSO_SECRET is not configured');
  }

  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    audience: 'es',
    maxAge: '120s',
  }) as EsSsoPayload & { exp?: number };

  if (!decoded.jti || !decoded.state || !decoded.tenantSlug) {
    throw new Error('invalid token claims');
  }

  if (decoded.state !== stateFromQuery) {
    throw new Error('state mismatch');
  }

  const expMs = typeof decoded.exp === 'number' ? decoded.exp * 1000 : Date.now() + 120_000;
  await consumeSsoJti(decoded.jti, expMs);

  return decoded;
}

export function parsePlatformUserId(sub: string): number {
  const id = Number(sub);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('SSO token missing valid platform user id');
  }
  return id;
}
