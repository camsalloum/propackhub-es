/**
 * Sync Interplast customers from PEBI fp_customer_unified into ES.
 * Uses PEBI HTTP integration API when configured, else direct PEBI_DATABASE_URL.
 */
import { Pool } from 'pg';
import axios from 'axios';
import { and, eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db/index.js';

export const PEBI_CUSTOMER_SOURCE = 'pebi';

export type PebiCustomerRow = {
  customerId: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type CustomerSyncResult = {
  tenantId: string;
  platformCompanyCode: string;
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  source: 'pebi_api' | 'pebi_db';
};

function buildNotes(row: {
  city?: string | null;
  country?: string | null;
  salesRep?: string | null;
  customerCode?: string | null;
}): string | null {
  const parts = [
    row.customerCode ? `PEBI ${row.customerCode}` : null,
    row.city,
    row.country,
    row.salesRep ? `Rep: ${row.salesRep}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export async function fetchPebiCustomersFromDb(
  databaseUrl: string,
  companyCode: string
): Promise<PebiCustomerRow[]> {
  const pool = new Pool({ connectionString: databaseUrl, max: 2 });
  try {
    const { rows } = await pool.query<{
      customer_id: number;
      customer_code: string | null;
      display_name: string;
      primary_contact: string | null;
      email: string | null;
      phone: string | null;
      mobile: string | null;
      city: string | null;
      primary_country: string | null;
      primary_sales_rep_name: string | null;
    }>(
      `SELECT customer_id, customer_code, display_name, primary_contact,
              email, phone, mobile, city, primary_country, primary_sales_rep_name
         FROM fp_customer_unified
        WHERE COALESCE(is_merged, false) = false
          AND COALESCE(is_active, true) = true
        ORDER BY display_name`
    );

    if (rows.length === 0 && companyCode !== 'interplast') {
      // Reserved for future per-company DB routing.
    }

    return rows.map((r) => ({
      customerId: String(r.customer_id),
      companyName: r.display_name,
      contactName: r.primary_contact,
      email: r.email,
      phone: r.phone || r.mobile,
      notes: buildNotes({
        customerCode: r.customer_code,
        city: r.city,
        country: r.primary_country,
        salesRep: r.primary_sales_rep_name,
      }),
    }));
  } finally {
    await pool.end();
  }
}

export async function fetchPebiCustomersFromApi(
  apiBaseUrl: string,
  integrationSecret: string,
  companyCode: string
): Promise<PebiCustomerRow[]> {
  const base = apiBaseUrl.replace(/\/$/, '');
  const { data } = await axios.get<{ success: boolean; data: Array<Record<string, unknown>> }>(
    `${base}/api/integration/es/customers`,
    {
      headers: {
        'X-PPH-Integration-Key': integrationSecret,
        'X-PPH-Company-Code': companyCode,
      },
      timeout: 60_000,
    }
  );

  if (!data?.success || !Array.isArray(data.data)) {
    throw new Error('PEBI integration API returned an unexpected payload');
  }

  return data.data.map((row) => ({
    customerId: String(row.customerId ?? row.id ?? ''),
    companyName: String(row.companyName ?? row.display_name ?? row.customer_name ?? ''),
    contactName: (row.contactName as string) ?? (row.primary_contact as string) ?? null,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? (row.mobile as string) ?? null,
    notes: (row.notes as string) ?? null,
  }));
}

async function loadPebiCustomers(companyCode: string): Promise<{
  rows: PebiCustomerRow[];
  source: 'pebi_api' | 'pebi_db';
}> {
  const dbUrl = process.env.PEBI_DATABASE_URL?.trim();
  const apiUrl = process.env.PEBI_API_URL?.trim();
  const secret = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();

  if (dbUrl) {
    const rows = await fetchPebiCustomersFromDb(dbUrl, companyCode);
    return { rows, source: 'pebi_db' };
  }

  if (apiUrl && secret) {
    const rows = await fetchPebiCustomersFromApi(apiUrl, secret, companyCode);
    return { rows, source: 'pebi_api' };
  }

  throw new Error(
    'Set PEBI_DATABASE_URL (dev) or PEBI_API_URL + PEBI_ES_INTEGRATION_SECRET for customer sync'
  );
}

export async function syncCustomersFromPebiForTenant(tenantId: string): Promise<CustomerSyncResult> {
  const db = getDatabase();

  const [tenant] = await db
    .select({
      id: schema.tenants.id,
      platformCompanyCode: schema.tenants.platformCompanyCode,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!tenant?.platformCompanyCode) {
    throw new Error('Tenant has no platform_company_code — link to PEBI before syncing customers');
  }

  const { rows, source } = await loadPebiCustomers(tenant.platformCompanyCode);
  const now = new Date();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.customerId || !row.companyName) {
      skipped++;
      continue;
    }

    const [existing] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.tenantId, tenantId),
          eq(schema.customers.externalSource, PEBI_CUSTOMER_SOURCE),
          eq(schema.customers.externalId, row.customerId)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.customers)
        .set({
          companyName: row.companyName,
          contactName: row.contactName,
          email: row.email,
          phone: row.phone,
          notes: row.notes,
          syncedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.customers.id, existing.id));
      updated++;
    } else {
      await db.insert(schema.customers).values({
        tenantId,
        companyName: row.companyName,
        contactName: row.contactName,
        email: row.email,
        phone: row.phone,
        notes: row.notes,
        externalId: row.customerId,
        externalSource: PEBI_CUSTOMER_SOURCE,
        syncedAt: now,
      });
      inserted++;
    }
  }

  return {
    tenantId,
    platformCompanyCode: tenant.platformCompanyCode,
    inserted,
    updated,
    skipped,
    total: rows.length,
    source,
  };
}

export async function syncCustomersForPlatformCompany(
  platformCompanyCode: string
): Promise<CustomerSyncResult> {
  const db = getDatabase();
  const [tenant] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, platformCompanyCode))
    .limit(1);

  if (!tenant) {
    throw new Error(`No ES tenant linked to platform_company_code=${platformCompanyCode}`);
  }

  return syncCustomersFromPebiForTenant(tenant.id);
}
