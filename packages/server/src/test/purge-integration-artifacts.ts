import { or, ilike, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

const PLATFORM_TEMPLATE_NAME_PATTERNS = ['APT %'] as const;

const STRUCTURE_TEMPLATE_NAME_PATTERNS = [
  'APT %',
  'Test PE %',
  'Test NonPE %',
  'Bad Tier %',
  'Bad Plain %',
  'Private to %',
  'Prune Safety %',
  'Parity Test %',
] as const;

const TENANT_NAME_PATTERNS = [
  'APT %',
  'TB Tenant %',
  'Test Co %',
  'Other Co %',
] as const;

const USER_EMAIL_PATTERNS = [
  'apt-%@example.com',
  'tb-%@example.com',
  'integration-%@example.com',
  'other-%@example.com',
] as const;

export type PurgeIntegrationArtifactsResult = {
  platformTemplates: number;
  structureTemplates: number;
  tenants: number;
};

type PurgeOptions = {
  /** When set, only rows tied to these run ids are removed (per-suite afterAll). */
  runIds?: (string | number)[];
  /** When true, remove all rows matching known integration-test name/email patterns. */
  allKnownPatterns?: boolean;
};

function patternOr<T extends { name: unknown }>(column: T, patterns: readonly string[]) {
  return or(...patterns.map((p) => ilike(column.name as never, p)));
}

function runIdNameOr<T extends { name: unknown }>(column: T, runIds: string[]) {
  return or(...runIds.map((rid) => ilike(column.name as never, `%${rid}%`)));
}

function runIdEmailOr(runIds: string[]) {
  return or(...runIds.map((rid) => ilike(schema.users.email, `%-${rid}@example.com`)));
}

/**
 * Remove integration-test artifacts from Postgres.
 * - `allKnownPatterns: true` — one-time cleanup of historical pollution (dev DB).
 * - `runIds: [...]` — per-suite teardown after a test file finishes.
 */
export async function purgeIntegrationArtifacts(
  db: NodePgDatabase<typeof schema>,
  opts: PurgeOptions = {},
): Promise<PurgeIntegrationArtifactsResult> {
  const runIds = (opts.runIds ?? []).map(String);
  const allKnown = opts.allKnownPatterns === true || runIds.length === 0;

  const platformWhere = allKnown
    ? patternOr(schema.platformStandardTemplates, PLATFORM_TEMPLATE_NAME_PATTERNS)
    : runIdNameOr(schema.platformStandardTemplates, runIds);

  const structureWhere = allKnown
    ? patternOr(schema.structureTemplates, STRUCTURE_TEMPLATE_NAME_PATTERNS)
    : runIdNameOr(schema.structureTemplates, runIds);

  const platformDeleted = await db
    .delete(schema.platformStandardTemplates)
    .where(platformWhere!)
    .returning({ id: schema.platformStandardTemplates.id });

  const structureDeleted = await db
    .delete(schema.structureTemplates)
    .where(structureWhere!)
    .returning({ id: schema.structureTemplates.id });

  const tenantWhere = allKnown
    ? patternOr(schema.tenants, TENANT_NAME_PATTERNS)
    : runIdNameOr(schema.tenants, runIds);

  const tenantRows = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(tenantWhere!);

  let tenantsDeleted = 0;
  if (tenantRows.length > 0) {
    const tenantIds = tenantRows.map((r) => r.id);

    // layers.material_id has no ON DELETE CASCADE — remove estimates before tenants/materials.
    await db.delete(schema.estimates).where(inArray(schema.estimates.tenantId, tenantIds));
    await db.delete(schema.quotes).where(inArray(schema.quotes.tenantId, tenantIds));
    await db.delete(schema.customers).where(inArray(schema.customers.tenantId, tenantIds));

    const deleted = await db
      .delete(schema.tenants)
      .where(inArray(schema.tenants.id, tenantIds))
      .returning({ id: schema.tenants.id });
    tenantsDeleted = deleted.length;
  }

  const userWhere = allKnown
    ? or(...USER_EMAIL_PATTERNS.map((p) => ilike(schema.users.email, p)))
    : runIdEmailOr(runIds);

  await db.delete(schema.users).where(userWhere!);

  return {
    platformTemplates: platformDeleted.length,
    structureTemplates: structureDeleted.length,
    tenants: tenantsDeleted,
  };
}
