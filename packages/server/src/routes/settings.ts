import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest } from '../utils/auth';
import { eq } from 'drizzle-orm';
import { fetchExchangeRate } from '../utils/fx-rates';

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
      logoUrl?: string;
      brandPrimaryColor?: string;
      brandSecondaryColor?: string;
      termsAndConditions?: string;
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
    if (request.body.logoUrl !== undefined) {
      updates.logoUrl = request.body.logoUrl;
    }
    if (request.body.brandPrimaryColor !== undefined) {
      updates.brandPrimaryColor = request.body.brandPrimaryColor;
    }
    if (request.body.brandSecondaryColor !== undefined) {
      updates.brandSecondaryColor = request.body.brandSecondaryColor;
    }
    if (request.body.termsAndConditions !== undefined) {
      updates.termsAndConditions = request.body.termsAndConditions;
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
    const [updated] = await db
      .update(schema.tenants)
      .set({
        exchangeRateUsdToDisplay: rate.toString(),
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenantId))
      .returning();

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

export async function registerSettingsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/settings', getTenantSettingsRoute);
  fastify.patch('/api/v1/settings', updateTenantSettingsRoute);
  fastify.post('/api/v1/settings/refresh-fx', refreshExchangeRateRoute);
}
