/**
 * Pack / consumables price health — flags $0 or missing unit prices that
 * surface as orange needsReview in the estimate editor.
 */
import { and, eq, or, sql } from 'drizzle-orm';
import { getDatabase, schema } from '../db';

export type SyncHealthUnpricedRow = {
  id: string;
  name: string;
  platformMasterKey: string | null;
  substrateFamily: string | null;
  type: string;
  unitPriceUsd: number | null;
  priceSource: string | null;
  platformSyncedAt: string | null;
};

export type TenantSyncHealth = {
  tenantId: string;
  tenantName: string;
  platformCompanyCode: string | null;
  packagingTotal: number;
  packagingUnpriced: number;
  consumablesTotal: number;
  consumablesUnpriced: number;
  unpriced: SyncHealthUnpricedRow[];
  healthy: boolean;
};

function isPackagingFamily(family: string | null | undefined): boolean {
  const f = String(family || '').toUpperCase();
  return f === 'PACKAGING' || f === 'PACKING';
}

function isConsumablesFamily(family: string | null | undefined): boolean {
  return String(family || '').toUpperCase() === 'CONSUMABLES';
}

function isUnitPriceCatalogRow(row: {
  type: string;
  substrateFamily: string | null;
  platformMasterKey: string | null;
}): boolean {
  const family = String(row.substrateFamily || '').toUpperCase();
  if (family === 'PACKAGING' || family === 'PACKING' || family === 'CONSUMABLES') return true;
  if (row.type === 'packaging') return true;
  const key = String(row.platformMasterKey || '');
  return key.startsWith('packaging-') || key.startsWith('consumables-');
}

function unitPriceOf(row: { unitPriceUsd: string | null }): number | null {
  if (row.unitPriceUsd == null || row.unitPriceUsd === '') return null;
  const n = Number(row.unitPriceUsd);
  return Number.isFinite(n) ? n : null;
}

export function isUnpricedUnitPriceMaterial(row: {
  type: string;
  substrateFamily: string | null;
  platformMasterKey: string | null;
  unitPriceUsd: string | null;
}): boolean {
  if (!isUnitPriceCatalogRow(row)) return false;
  const price = unitPriceOf(row);
  return price == null || price <= 0;
}

export async function getTenantSyncHealth(tenantId: string): Promise<TenantSyncHealth | null> {
  const db = getDatabase();
  const [tenant] = await db
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      platformCompanyCode: schema.tenants.platformCompanyCode,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!tenant) return null;

  const rows = await db
    .select({
      id: schema.materials.id,
      name: schema.materials.name,
      type: schema.materials.type,
      substrateFamily: schema.materials.substrateFamily,
      platformMasterKey: schema.materials.platformMasterKey,
      unitPriceUsd: schema.materials.unitPriceUsd,
      priceSource: schema.materials.priceSource,
      platformSyncedAt: schema.materials.platformSyncedAt,
    })
    .from(schema.materials)
    .where(
      and(
        eq(schema.materials.tenantId, tenantId),
        or(
          eq(schema.materials.type, 'packaging'),
          sql`upper(coalesce(${schema.materials.substrateFamily}, '')) in ('PACKAGING', 'PACKING', 'CONSUMABLES')`,
          sql`coalesce(${schema.materials.platformMasterKey}, '') like 'packaging-%'`,
          sql`coalesce(${schema.materials.platformMasterKey}, '') like 'consumables-%'`
        )
      )
    );

  let packagingTotal = 0;
  let packagingUnpriced = 0;
  let consumablesTotal = 0;
  let consumablesUnpriced = 0;
  const unpriced: SyncHealthUnpricedRow[] = [];

  for (const row of rows) {
    const family = row.substrateFamily;
    const isCons =
      isConsumablesFamily(family) ||
      String(row.platformMasterKey || '').startsWith('consumables-');
    const isPack =
      !isCons &&
      (row.type === 'packaging' ||
        isPackagingFamily(family) ||
        String(row.platformMasterKey || '').startsWith('packaging-'));

    if (isPack) packagingTotal += 1;
    if (isCons) consumablesTotal += 1;

    if (!isUnpricedUnitPriceMaterial(row)) continue;

    const entry: SyncHealthUnpricedRow = {
      id: row.id,
      name: row.name,
      platformMasterKey: row.platformMasterKey,
      substrateFamily: row.substrateFamily,
      type: row.type,
      unitPriceUsd: unitPriceOf(row),
      priceSource: row.priceSource,
      platformSyncedAt: row.platformSyncedAt?.toISOString() ?? null,
    };
    unpriced.push(entry);
    if (isCons) consumablesUnpriced += 1;
    else if (isPack) packagingUnpriced += 1;
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    platformCompanyCode: tenant.platformCompanyCode,
    packagingTotal,
    packagingUnpriced,
    consumablesTotal,
    consumablesUnpriced,
    unpriced,
    healthy: unpriced.length === 0,
  };
}

export async function listCompanyTenantsSyncHealth(): Promise<TenantSyncHealth[]> {
  const db = getDatabase();
  const tenants = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.type, 'company'));

  const out: TenantSyncHealth[] = [];
  for (const t of tenants) {
    const health = await getTenantSyncHealth(t.id);
    if (health) out.push(health);
  }
  return out;
}
