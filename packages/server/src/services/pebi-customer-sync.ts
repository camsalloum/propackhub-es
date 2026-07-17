/**
 * Sync Interplast customers from PEBI fp_customer_unified into ES.
 * Uses PEBI HTTP integration API when configured, else direct PEBI_DATABASE_URL.
 */
import { Pool } from 'pg';
import axios from 'axios';
import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { getDatabase, schema } from '../db/index.js';

export const PEBI_CUSTOMER_SOURCE = 'pebi';

export type PebiCustomerRow = {
  customerId: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  paymentTerms: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
};

export type CustomerSyncResult = {
  tenantId: string;
  platformCompanyCode: string;
  inserted: number;
  updated: number;
  skipped: number;
  pruned: number;
  total: number;
  source: 'pebi_api' | 'pebi_db';
};

function buildNotes(row: {
  city?: string | null;
  country?: string | null;
  salesRep?: string | null;
  customerCode?: string | null;
}): string | null {
  // Internal sync metadata only — never used as quotation address.
  const parts = [
    row.customerCode ? `Code ${row.customerCode}` : null,
    row.salesRep ? `Rep: ${row.salesRep}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

/** PEBI fp_customer_unified has legacy + budget-import dupes per display_name — pick one canonical row. */
export const PEBI_CUSTOMER_CANONICAL_SQL = `
  SELECT DISTINCT ON (lower(trim(display_name)))
         customer_id, customer_code, display_name, primary_contact,
         email, phone, mobile, city, state, primary_country, postal_code,
         address_line1, address_line2, payment_terms, primary_sales_rep_name
    FROM fp_customer_unified
   WHERE COALESCE(is_merged, false) = false
     AND COALESCE(is_active, true) = true
   ORDER BY lower(trim(display_name)),
            last_transaction_date DESC NULLS LAST,
            customer_id ASC`;

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
      state: string | null;
      primary_country: string | null;
      postal_code: string | null;
      address_line1: string | null;
      address_line2: string | null;
      payment_terms: string | null;
      primary_sales_rep_name: string | null;
    }>(PEBI_CUSTOMER_CANONICAL_SQL);

    if (rows.length === 0 && companyCode !== 'interplast') {
      // Reserved for future per-company DB routing.
    }

    return rows.map((r) => ({
      customerId: String(r.customer_id),
      companyName: r.display_name,
      contactName: r.primary_contact,
      email: r.email,
      phone: r.phone || r.mobile,
      paymentTerms: r.payment_terms,
      addressLine1: r.address_line1,
      addressLine2: r.address_line2,
      city: r.city,
      state: r.state,
      country: r.primary_country,
      postalCode: r.postal_code,
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

  return data.data.map((row) => {
    const city = strOrNull(row.city);
    const country = strOrNull(row.country) ?? strOrNull(row.primary_country);
    const customerCode = strOrNull(row.customerCode) ?? strOrNull(row.customer_code);
    const salesRep = strOrNull(row.salesRep) ?? strOrNull(row.primary_sales_rep_name);
    return {
      customerId: String(row.customerId ?? row.id ?? ''),
      companyName: String(row.companyName ?? row.display_name ?? row.customer_name ?? ''),
      contactName: strOrNull(row.contactName) ?? strOrNull(row.primary_contact),
      email: strOrNull(row.email),
      phone: strOrNull(row.phone) ?? strOrNull(row.mobile),
      paymentTerms: strOrNull(row.paymentTerms) ?? strOrNull(row.payment_terms),
      addressLine1: strOrNull(row.addressLine1) ?? strOrNull(row.address_line1),
      addressLine2: strOrNull(row.addressLine2) ?? strOrNull(row.address_line2),
      city,
      state: strOrNull(row.state),
      country,
      postalCode: strOrNull(row.postalCode) ?? strOrNull(row.postal_code),
      notes:
        strOrNull(row.notes) ??
        buildNotes({ customerCode, city, country, salesRep }),
    };
  });
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

function customerCommercialFields(row: PebiCustomerRow) {
  return {
    companyName: row.companyName,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    paymentTerms: row.paymentTerms,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    state: row.state,
    country: row.country,
    postalCode: row.postalCode,
  };
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

    const fields = customerCommercialFields(row);

    if (existing) {
      await db
        .update(schema.customers)
        .set({
          ...fields,
          syncedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.customers.id, existing.id));
      updated++;
    } else {
      await db.insert(schema.customers).values({
        tenantId,
        ...fields,
        externalId: row.customerId,
        externalSource: PEBI_CUSTOMER_SOURCE,
        syncedAt: now,
      });
      inserted++;
    }
  }

  const canonicalIds = rows.map((r) => r.customerId).filter(Boolean);
  const pruned = await pruneDuplicatePebiCustomers(tenantId, canonicalIds);

  return {
    tenantId,
    platformCompanyCode: tenant.platformCompanyCode,
    inserted,
    updated,
    skipped,
    pruned,
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

/** Remove ES rows synced from non-canonical PEBI customer_ids (duplicate display_name imports). */
export async function pruneDuplicatePebiCustomers(tenantId: string, canonicalIds: string[]): Promise<number> {
  if (canonicalIds.length === 0) return 0;
  const db = getDatabase();

  const dupes = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.tenantId, tenantId),
        eq(schema.customers.externalSource, PEBI_CUSTOMER_SOURCE),
        notInArray(schema.customers.externalId, canonicalIds)
      )
    );

  if (dupes.length === 0) return 0;

  const dupeIds = dupes.map((d) => d.id);
  const canonicalRows = await db
    .select({ id: schema.customers.id, companyName: schema.customers.companyName })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.tenantId, tenantId),
        eq(schema.customers.externalSource, PEBI_CUSTOMER_SOURCE),
        inArray(schema.customers.externalId, canonicalIds)
      )
    );

  const canonicalByName = new Map<string, string>();
  for (const row of canonicalRows) {
    canonicalByName.set(row.companyName.trim().toLowerCase(), row.id);
  }

  for (const dupeId of dupeIds) {
    const [dupe] = await db
      .select({ companyName: schema.customers.companyName })
      .from(schema.customers)
      .where(eq(schema.customers.id, dupeId))
      .limit(1);
    const keeperId = dupe ? canonicalByName.get(dupe.companyName.trim().toLowerCase()) : undefined;
    if (keeperId) {
      await db
        .update(schema.estimates)
        .set({ customerId: keeperId, updatedAt: new Date() })
        .where(eq(schema.estimates.customerId, dupeId));
      await db
        .update(schema.quotes)
        .set({ customerId: keeperId, updatedAt: new Date() })
        .where(eq(schema.quotes.customerId, dupeId));
    }
  }

  await db
    .delete(schema.customers)
    .where(
      and(
        eq(schema.customers.tenantId, tenantId),
        eq(schema.customers.externalSource, PEBI_CUSTOMER_SOURCE),
        inArray(schema.customers.id, dupeIds)
      )
    );

  return dupeIds.length;
}
