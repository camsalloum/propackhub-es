import { randomBytes } from 'node:crypto';
import { and, count, eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db';
import { hashPassword } from '../utils/auth';
import { parsePlatformUserId } from './sso';
import type { EsSsoPayload } from './sso';

type DbUser = typeof schema.users.$inferSelect;
type DbTenant = typeof schema.tenants.$inferSelect;

const SSO_AUTH_SOURCE = 'platform_sso';
const PILOT_COMPANY_CODE = 'interplast';

export class EmptyTenantSsoError extends Error {
  readonly code = 'empty_tenant' as const;
  constructor(message: string) {
    super(message);
    this.name = 'EmptyTenantSsoError';
  }
}

async function countCustomers(tenantId: string): Promise<number> {
  const db = getDatabase();
  const [row] = await db
    .select({ value: count() })
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenantId));
  return Number(row?.value ?? 0);
}

async function findTenantByCompanyCode(code: string): Promise<DbTenant | null> {
  const db = getDatabase();
  const [row] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, code.toLowerCase()))
    .limit(1);
  return row ?? null;
}

/**
 * PEBI-linked company tenants must not hand off into an empty customer list
 * (silent blank New-quote picker). Pilot: prefer Interplast when the mapped
 * tenant is empty and Interplast has customers.
 */
export async function ensureNonEmptyTenantForSso(tenant: DbTenant): Promise<DbTenant> {
  if (tenant.type !== 'company') return tenant;

  let active = tenant;
  let customers = await countCustomers(active.id);
  if (customers > 0) return active;

  // Empty demo / wrong mapping → prefer Interplast for pilot when it has data
  const code = (active.platformCompanyCode || '').toLowerCase();
  if (code !== PILOT_COMPANY_CODE) {
    const interplast = await findTenantByCompanyCode(PILOT_COMPANY_CODE);
    if (interplast && interplast.id !== active.id) {
      const ipCount = await countCustomers(interplast.id);
      if (ipCount > 0) return interplast;
    }
  }

  // PEBI-linked company with still-empty customers → refuse silent empty handoff
  if (active.platformCompanyCode) {
    throw new EmptyTenantSsoError(
      `Estimation Studio tenant "${active.name}" has no customers. ` +
        `Run PEBI customer sync and ensure SSO maps to Interplast before opening ES.`
    );
  }

  return active;
}

export async function resolveTenantForSso(payload: EsSsoPayload): Promise<DbTenant | null> {
  const db = getDatabase();
  const accountId = payload.accountId ?? null;
  const slug = String(payload.tenantSlug).toLowerCase();

  if (accountId != null) {
    const [byAccount] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.platformAccountId, accountId))
      .limit(1);
    if (byAccount) return byAccount;
  }

  const [bySlug] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, slug))
    .limit(1);
  if (bySlug) {
    if (accountId != null && bySlug.platformAccountId == null) {
      await db
        .update(schema.tenants)
        .set({ platformAccountId: accountId, updatedAt: new Date() })
        .where(eq(schema.tenants.id, bySlug.id));
      return { ...bySlug, platformAccountId: accountId };
    }
    return bySlug;
  }

  return null;
}

/**
 * JIT find/create ES user after a valid platform SSO handoff.
 * Lookup is always by (platform_user_id, tenant_id) — never email alone.
 */
export async function ensureUserFromSso(
  payload: EsSsoPayload,
  tenant: DbTenant
): Promise<DbUser> {
  const email = payload.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('SSO token missing email');
  }

  const platformUserId = parsePlatformUserId(payload.sub);
  const db = getDatabase();

  const [byPlatform] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.platformUserId, platformUserId),
        eq(schema.users.tenantId, tenant.id)
      )
    )
    .limit(1);

  if (byPlatform) {
    return byPlatform;
  }

  const [byEmail] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.email, email), eq(schema.users.tenantId, tenant.id)))
    .limit(1);

  if (byEmail) {
    const [linked] = await db
      .update(schema.users)
      .set({
        platformUserId,
        authSource: SSO_AUTH_SOURCE,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, byEmail.id))
      .returning();
    if (!linked) {
      throw new Error('failed to link SSO user');
    }
    return linked;
  }

  const displayName =
    email.split('@')[0]?.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
    'User';
  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));

  const [created] = await db
    .insert(schema.users)
    .values({
      tenantId: tenant.id,
      email,
      passwordHash,
      displayName,
      role: 'user',
      platformUserId,
      authSource: SSO_AUTH_SOURCE,
    })
    .returning();

  if (!created) {
    throw new Error('failed to provision SSO user');
  }

  return created;
}

export function isSsoOnlyUser(user: Pick<DbUser, 'authSource'>): boolean {
  return user.authSource === SSO_AUTH_SOURCE;
}
