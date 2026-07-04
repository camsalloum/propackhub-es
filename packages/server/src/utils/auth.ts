import bcryptjs from 'bcryptjs';
import { FastifyRequest } from 'fastify';
import { AppError } from './errors';

/** OWASP-recommended minimum for new systems (was 10). Existing hashes keep working. */
const BCRYPT_ROUNDS = 12;

/**
 * Precomputed bcrypt hash (cost 12) of a fixed dummy password.
 * Used on the "user not found" login path so timing matches a real compare.
 */
export const LOGIN_TIMING_DUMMY_HASH =
  '$2a$12$wtSww6zqJ4zlZdbLnOBsve504FXYYwBWZ4q3vVPWwlxlbN.TIDc/C';

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: 'user' | 'tenant_admin' | 'platform_admin';
}

export function extractTenantFromRequest(request: FastifyRequest): string {
  const user = request.user as TokenPayload | undefined;
  if (!user) {
    throw new AppError('AUTH_REQUIRED', 401, 'Authentication required');
  }
  return user.tenantId;
}

export function extractUserFromRequest(request: FastifyRequest): TokenPayload {
  const user = request.user as TokenPayload | undefined;
  if (!user) {
    throw new AppError('AUTH_REQUIRED', 401, 'Authentication required');
  }
  return user;
}

export function isTenantAdmin(role: TokenPayload['role']): boolean {
  return role === 'tenant_admin' || role === 'platform_admin';
}

export function isPlatformAdmin(role: TokenPayload['role']): boolean {
  return role === 'platform_admin';
}
