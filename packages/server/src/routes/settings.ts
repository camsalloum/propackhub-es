import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest } from '../utils/auth';
import { eq } from 'drizzle-orm';
import { fetchExchangeRate } from '../utils/fx-rates';
import { filterSupportedCurrencies } from '../utils/supported-currencies';
import { ensureSlabTemplatesForTenant } from '../db/seed-slab-templates';

// Get tenant settings
async function getTenantSettingsRoute(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    return reply.send(tenant);
  } catch (error: any) {
    console.error('Get tenant settings error:', error);
    return reply.status(500).send({ error: 'Failed to get settings' });
  }
}

// Update tenant settings
async function updateTenantSettingsRoute(
  request: FastifyRequest<{
    Body: {
      displayCurrency?: string;
      useAutoFx?: boolean;
      exchangeRateUsdToDisplay?: number;
      logo?: string;
      primaryColor?: string;
      termsAndConditions?: string;
      footerText?: string;
      defaultMarkupPercent?: number;
      operatingCostMethod?: 'process_per_kg' | 'markup_over_rm';
      quotationValidDays?: number;
      defaultSlabTemplate?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    const updates: any = { updatedAt: new Date() };

    if (request.body.displayCurrency !== undefined) {
      updates.displayCurrency = request.body.displayCurrency;
    }
    if (request.body.useAutoFx !== undefined) {
      updates.useAutoFx = request.body.useAutoFx;
    }
    if (request.body.exchangeRateUsdToDisplay !== undefined) {
      updates.exchangeRateUsdToDisplay = request.body.exchangeRateUsdToDisplay.toString();
    }
    if (request.body.logo !== undefined) {
      updates.logo = request.body.logo;
    }
    if (request.body.primaryColor !== undefined) {
      updates.primaryColor = request.body.primaryColor;
    }
    if (request.body.termsAndConditions !== undefined) {
      updates.termsAndConditions = request.body.termsAndConditions;
    }
    if (request.body.footerText !== undefined) {
      updates.footerText = request.body.footerText;
    }
    if (request.body.defaultMarkupPercent !== undefined) {
      updates.defaultMarkupPercent = request.body.defaultMarkupPercent.toString();
    }
    if (request.body.operatingCostMethod !== undefined) {
      updates.operatingCostMethod = request.body.operatingCostMethod;
    }
    if (request.body.quotationValidDays !== undefined) {
      updates.quotationValidDays = request.body.quotationValidDays;
    }
    if (request.body.defaultSlabTemplate !== undefined) {
      updates.defaultSlabTemplate = request.body.defaultSlabTemplate;
    }

    const [updated] = await db
      .update(schema.tenants)
      .set(updates)
      .where(eq(schema.tenants.id, tenantId))
      .returning();

    return reply.send(updated);
  } catch (error: any) {
    console.error('Update tenant settings error:', error);
    return reply.status(500).send({ error: 'Failed to update settings' });
  }
}

// Refresh exchange rate from FX API
async function refreshExchangeRateRoute(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    // Get current tenant settings
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    // Fetch fresh rate
    const rate = await fetchExchangeRate(tenant.displayCurrency);

    // Update tenant
    await db
      .update(schema.tenants)
      .set({
        exchangeRateUsdToDisplay: rate.toString(),
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenantId));

    return reply.send({
      exchangeRateUsdToDisplay: rate,
      displayCurrency: tenant.displayCurrency,
      message: 'Exchange rate refreshed successfully',
    });
  } catch (error: any) {
    console.error('Refresh exchange rate error:', error);
    return reply.status(500).send({ error: 'Failed to refresh exchange rate' });
  }
}

async function getSupportedCurrenciesRoute(
  request: FastifyRequest<{ Querystring: { q?: string } }>,
  reply: FastifyReply
) {
  const q = request.query.q;
  return reply.send(filterSupportedCurrencies(q));
}

async function getSlabTemplatesRoute(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    await ensureSlabTemplatesForTenant(tenantId);
    const rows = await db
      .select()
      .from(schema.slabTemplates)
      .where(eq(schema.slabTemplates.tenantId, tenantId));
    return reply.send(rows);
  } catch (error: any) {
    console.error('Get slab templates error:', error);
    return reply.status(500).send({ error: 'Failed to get slab templates' });
  }
}

export async function registerSettingsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/settings/currency/supported', getSupportedCurrenciesRoute);
  fastify.get('/api/v1/settings/slab-templates', getSlabTemplatesRoute);
  fastify.get('/api/v1/settings', getTenantSettingsRoute);
  fastify.patch('/api/v1/settings', updateTenantSettingsRoute);
  fastify.post('/api/v1/settings/refresh-fx', refreshExchangeRateRoute);
}
