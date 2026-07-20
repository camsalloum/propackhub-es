import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull, gt, or } from 'drizzle-orm';
import { getDatabase, schema } from '../db';

/** Refresh tokens live 60 days; access tokens stay short-lived (JWT expiresIn). */
const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;

/** Platform SSO sessions cap at 8 hours regardless of refresh TTL. */
const SSO_ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;

export type CreateSessionOpts = {
  userId: string;
  tenantId: string;
  deviceLabel?: string | null;
  authSource?: 'local' | 'platform_sso';
  platformAccountId?: number | null;
  entitlementVersion?: number | null;
  absoluteExpiresAt?: Date | null;
};

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Create a session row and return the plaintext refresh token (shown once). */
export async function createSession(opts: CreateSessionOpts): Promise<string> {
  const db = getDatabase();
  const refreshToken = generateRefreshToken();
  const now = Date.now();
  const absoluteExpiresAt =
    opts.absoluteExpiresAt ??
    (opts.authSource === 'platform_sso' ? new Date(now + SSO_ABSOLUTE_TTL_MS) : null);
  const refreshExpiresAt = new Date(now + REFRESH_TTL_MS);
  const expiresAt =
    absoluteExpiresAt && absoluteExpiresAt < refreshExpiresAt
      ? absoluteExpiresAt
      : refreshExpiresAt;

  await db.insert(schema.sessions).values({
    userId: opts.userId,
    tenantId: opts.tenantId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    deviceLabel: opts.deviceLabel ?? null,
    authSource: opts.authSource ?? 'local',
    platformAccountId: opts.platformAccountId ?? null,
    entitlementVersion: opts.entitlementVersion ?? null,
    absoluteExpiresAt,
    expiresAt,
  });

  return refreshToken;
}

export type SessionRow = typeof schema.sessions.$inferSelect;

/** Look up a non-revoked, non-expired session by plaintext refresh token. */
export async function findActiveSession(refreshToken: string): Promise<SessionRow | null> {
  const db = getDatabase();
  const now = new Date();
  const [row] = await db
    .select()
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.refreshTokenHash, hashRefreshToken(refreshToken)),
        isNull(schema.sessions.revokedAt),
        gt(schema.sessions.expiresAt, now),
        or(
          isNull(schema.sessions.absoluteExpiresAt),
          gt(schema.sessions.absoluteExpiresAt, now)
        )
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Mark session as used. We intentionally do **not** rotate the refresh token on
 * every /auth/refresh — concurrent refresh calls (React Strict Mode, parallel
 * 401 retries) would revoke the token the other caller still holds and force logout.
 * Revoke only on logout.
 */
export async function touchSession(session: SessionRow): Promise<void> {
  const db = getDatabase();
  await db
    .update(schema.sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.sessions.id, session.id));
}

/** Revoke a session by plaintext refresh token (logout). No-op if unknown. */
export async function revokeSession(refreshToken: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(eq(schema.sessions.refreshTokenHash, hashRefreshToken(refreshToken)));
}
