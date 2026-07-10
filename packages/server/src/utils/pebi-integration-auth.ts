import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { isNotNull } from 'drizzle-orm';
import { getDatabase, schema } from '../db';

export type PebiIntegrationContext = {
  companyCode: string;
};

/** Constant-time string compare via SHA-256 digests (handles unequal lengths). */
export function secretsEqual(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

function parseEnvAllowlist(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Allowed PEBI company codes for integration push:
 * - `PEBI_ES_ALLOWED_COMPANY_CODES` (comma-separated) if set, else
 * - distinct `tenants.platform_company_code` values already linked in ES.
 */
export async function loadAllowedPebiCompanyCodes(): Promise<Set<string>> {
  const fromEnv = parseEnvAllowlist(process.env.PEBI_ES_ALLOWED_COMPANY_CODES);
  if (fromEnv.size > 0) return fromEnv;

  const db = getDatabase();
  const rows = await db
    .select({ code: schema.tenants.platformCompanyCode })
    .from(schema.tenants)
    .where(isNotNull(schema.tenants.platformCompanyCode));

  return new Set(
    rows
      .map((r) => r.code?.trim().toLowerCase())
      .filter((c): c is string => Boolean(c))
  );
}

/**
 * Authenticate PEBI → ES integration calls (shared secret + company allowlist).
 * Returns null on any failure (same 401 path — do not leak which check failed).
 */
export async function verifyPebiIntegrationRequest(
  request: FastifyRequest
): Promise<PebiIntegrationContext | null> {
  const expected = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();
  const provided = request.headers['x-pph-integration-key'];
  if (!expected || typeof provided !== 'string' || !secretsEqual(provided, expected)) {
    return null;
  }

  const companyCode = String(request.headers['x-pph-company-code'] || 'interplast')
    .trim()
    .toLowerCase();
  if (!companyCode) return null;

  const allowed = await loadAllowedPebiCompanyCodes();
  if (!allowed.has(companyCode)) {
    return null;
  }

  return { companyCode };
}
