import axios from 'axios';
import { and, eq, isNull } from 'drizzle-orm';
import { getDatabase, schema } from '../db/index.js';

export type MesIntakeResult = {
  accepted: boolean;
  quoteId: string;
  quoteRef: string;
  mesOrderId: string | null;
  mesOrderNumber: string | null;
  message: string;
};

export async function pushQuoteToPebiMes(tenantId: string, quoteId: string): Promise<MesIntakeResult> {
  const apiUrl = process.env.PEBI_API_URL?.trim();
  const secret = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();
  if (!apiUrl || !secret) {
    throw new Error('Set PEBI_API_URL and PEBI_ES_INTEGRATION_SECRET to push quotes to MES');
  }

  const db = getDatabase();
  const [tenant] = await db
    .select({ platformCompanyCode: schema.tenants.platformCompanyCode })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!tenant?.platformCompanyCode) {
    throw new Error('Tenant is not linked to PEBI');
  }

  const [quote] = await db
    .select()
    .from(schema.quotes)
    .where(
      and(eq(schema.quotes.id, quoteId), eq(schema.quotes.tenantId, tenantId), isNull(schema.quotes.deletedAt))
    )
    .limit(1);

  if (!quote) {
    throw new Error('Quote not found');
  }

  const estimates = await db
    .select({ refNumber: schema.estimates.refNumber })
    .from(schema.estimates)
    .where(
      and(
        eq(schema.estimates.quoteId, quoteId),
        eq(schema.estimates.tenantId, tenantId),
        isNull(schema.estimates.deletedAt)
      )
    );

  let customerExternalId: string | null = null;
  if (quote.customerId) {
    const [customer] = await db
      .select({ externalId: schema.customers.externalId })
      .from(schema.customers)
      .where(eq(schema.customers.id, quote.customerId))
      .limit(1);
    customerExternalId = customer?.externalId ?? null;
  }

  const base = apiUrl.replace(/\/$/, '');
  const { data } = await axios.post(
    `${base}/api/integration/es/mes-intake`,
    {
      quoteRef: quote.refNumber,
      estimateRefs: estimates.map((e) => e.refNumber),
      customerExternalId,
      displayCurrency: quote.displayCurrency,
      notes: quote.notes,
    },
    {
      headers: {
        'X-PPH-Integration-Key': secret,
        'X-PPH-Company-Code': tenant.platformCompanyCode,
      },
      timeout: 60_000,
    }
  );

  const mesOrderId = data?.mesOrderId != null ? String(data.mesOrderId) : null;
  const mesOrderNumber = data?.mesOrderNumber != null ? String(data.mesOrderNumber) : null;

  if (mesOrderId) {
    await db
      .update(schema.quotes)
      .set({
        externalId: mesOrderId,
        externalSource: 'pebi_mes',
        updatedAt: new Date(),
      })
      .where(eq(schema.quotes.id, quoteId));
  }

  return {
    accepted: Boolean(data?.success),
    quoteId,
    quoteRef: quote.refNumber,
    mesOrderId,
    mesOrderNumber,
    message: String(data?.message ?? 'MES intake submitted'),
  };
}
