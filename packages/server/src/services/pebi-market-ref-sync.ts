import axios from 'axios';
import { and, eq } from 'drizzle-orm';
import { getDatabase, schema } from '../db/index.js';
import { requireTenantAedPerUsd } from '../utils/tenant-fx';

export async function syncMaterialMarketRefToPebi(
  tenantId: string,
  materialId: string,
  marketPriceUsd: number
): Promise<void> {
  const apiUrl = process.env.PEBI_API_URL?.trim();
  const secret = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();
  if (!apiUrl || !secret) {
    throw new Error('Set PEBI_API_URL and PEBI_ES_INTEGRATION_SECRET to sync market_ref');
  }

  const db = getDatabase();
  const [tenant] = await db
    .select({
      name: schema.tenants.name,
      platformCompanyCode: schema.tenants.platformCompanyCode,
      exchangeRateUsdToDisplay: schema.tenants.exchangeRateUsdToDisplay,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  if (!tenant?.platformCompanyCode) {
    throw new Error('Tenant is not linked to PEBI');
  }

  const [material] = await db
    .select({
      substrateGrade: schema.materials.substrateGrade,
      externalSource: schema.materials.externalSource,
      type: schema.materials.type,
    })
    .from(schema.materials)
    .where(and(eq(schema.materials.id, materialId), eq(schema.materials.tenantId, tenantId)))
    .limit(1);

  if (!material || material.type !== 'substrate' || material.externalSource !== 'pebi') {
    throw new Error('Only PEBI-linked substrate materials can sync market_ref');
  }
  if (!material.substrateGrade) {
    throw new Error('Material substrateGrade is required for market_ref sync');
  }

  const aedPerUsd = requireTenantAedPerUsd(tenant, 'market_ref sync');
  const marketPriceAed = Math.round(marketPriceUsd * aedPerUsd * 10000) / 10000;

  const base = apiUrl.replace(/\/$/, '');
  await axios.post(
    `${base}/api/integration/es/materials/market-ref`,
    {
      substrateGrade: material.substrateGrade,
      marketPriceAed,
      marketPriceUsd,
      aedPerUsd,
    },
    {
      headers: {
        'X-PPH-Integration-Key': secret,
        'X-PPH-Company-Code': tenant.platformCompanyCode,
      },
      timeout: 60_000,
    }
  );
}

