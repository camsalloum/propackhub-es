import bcryptjs from 'bcryptjs';
import { FastifyRequest } from 'fastify';

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
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
    throw new Error('Unauthorized');
  }
  return user.tenantId;
}

export function extractUserFromRequest(request: FastifyRequest): TokenPayload {
  const user = request.user as TokenPayload | undefined;
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
