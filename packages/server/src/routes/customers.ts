import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike, inArray, isNull, asc, desc, count as drizzleCount, or } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../db/schema';
import { getDatabase } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { errorBody, isFkViolation, sendCaughtError } from '../utils/errors';
import { parsePagination, paginate } from '../utils/pagination';
import { getEffectiveProfile, stripEstimateRow } from '../utils/visibility';
import {
  buildStructureSummaries,
  developmentTotalDisplay,
} from '../services/quote-helpers';
import {
  buildTenantCustomerAccess,
  CUSTOMER_READ_ONLY_MESSAGE,
} from '../services/tenant-customer-access';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createCustomerSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().max(255).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(128).optional().nullable(),
  state: z.string().max(128).optional().nullable(),
  country: z.string().max(128).optional().nullable(),
  postalCode: z.string().max(32).optional().nullable(),
});

const updateCustomerSchema = createCustomerSchema.partial();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape Postgres LIKE wildcards in user-supplied search strings. BUG-13. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function loadTenantCustomerAccess(tenantId: string) {
  const db = getDatabase();
  const [tenant] = await db
    .select({
      type: schema.tenants.type,
      platformCompanyCode: schema.tenants.platformCompanyCode,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  return buildTenantCustomerAccess(tenant);
}

// ---------------------------------------------------------------------------
// Route handlers — all wrapped in try/catch (BUG-10)
// ---------------------------------------------------------------------------

async function getCustomersRoute(request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const { limit, offset } = parsePagination(request.query);

    const whereClause = eq(schema.customers.tenantId, tenantId);

    const [{ total }] = await db
      .select({ total: drizzleCount() })
      .from(schema.customers)
      .where(whereClause);

    const customers = await db
      .select()
      .from(schema.customers)
      .where(whereClause)
      .orderBy(schema.customers.companyName)
      .limit(limit)
      .offset(offset);

    return reply.send(paginate(customers, Number(total), limit, offset));
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to fetch customers', 'Get customers error:');
  }
}

async function autocompleteCustomersRoute(
  request: FastifyRequest<{ Querystring: { q?: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const raw = (request.query.q || '').trim();
    if (raw.length < 2) return reply.send([]);

    const db = getDatabase();
    // BUG-13: escape LIKE wildcards to prevent injection/unexpected matches
    const q = escapeLike(raw);

    const customers = await db
      .select({
        id: schema.customers.id,
        companyName: schema.customers.companyName,
        contactName: schema.customers.contactName,
      })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.tenantId, tenantId),
          or(
            ilike(schema.customers.companyName, `%${q}%`),
            ilike(schema.customers.contactName, `%${q}%`),
            ilike(schema.customers.email, `%${q}%`)
          )
        )
      )
      .orderBy(schema.customers.companyName)
      .limit(50);

    return reply.send(customers);
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to search customers', 'Autocomplete customers error:');
  }
}

async function createCustomerRoute(
  request: FastifyRequest<{ Body: z.infer<typeof createCustomerSchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    const validated = createCustomerSchema.parse(request.body);
    const access = await loadTenantCustomerAccess(tenantId);
    if (!access.canCreate) {
      return reply.status(403).send(
        errorBody('FORBIDDEN', CUSTOMER_READ_ONLY_MESSAGE, { customerAccess: access })
      );
    }

    const [customer] = await db
      .insert(schema.customers)
      .values({
        tenantId,
        companyName: validated.companyName,
        contactName: validated.contactName,
        email: validated.email || null,
        phone: validated.phone,
        notes: validated.notes,
        paymentTerms: validated.paymentTerms ?? null,
        addressLine1: validated.addressLine1 ?? null,
        addressLine2: validated.addressLine2 ?? null,
        city: validated.city ?? null,
        state: validated.state ?? null,
        country: validated.country ?? null,
        postalCode: validated.postalCode ?? null,
      })
      .returning();

    return reply.status(201).send(customer);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(errorBody('VALIDATION', 'Validation failed', error.errors));
    }
    return sendCaughtError(reply, error, 'Failed to create customer', 'Create customer error:');
  }
}

async function getCustomerRoute(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.id, id), eq(schema.customers.tenantId, tenantId)));

    if (!customer) {
      return reply.status(404).send(errorBody('NOT_FOUND', 'Customer not found'));
    }

    return reply.send(customer);
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to fetch customer', 'Get customer error:');
  }
}

async function updateCustomerRoute(
  request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof updateCustomerSchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    const validated = updateCustomerSchema.parse(request.body);
    const access = await loadTenantCustomerAccess(tenantId);
    if (!access.canEdit) {
      return reply.status(403).send(
        errorBody('FORBIDDEN', CUSTOMER_READ_ONLY_MESSAGE, { customerAccess: access })
      );
    }

    const [customer] = await db
      .update(schema.customers)
      .set({ ...validated, updatedAt: new Date() })
      .where(and(eq(schema.customers.id, id), eq(schema.customers.tenantId, tenantId)))
      .returning();

    if (!customer) {
      return reply.status(404).send(errorBody('NOT_FOUND', 'Customer not found'));
    }

    return reply.send(customer);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(errorBody('VALIDATION', 'Validation failed', error.errors));
    }
    return sendCaughtError(reply, error, 'Failed to update customer', 'Update customer error:');
  }
}

async function deleteCustomerRoute(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();
    const access = await loadTenantCustomerAccess(tenantId);
    if (!access.canDelete) {
      return reply.status(403).send(
        errorBody('FORBIDDEN', CUSTOMER_READ_ONLY_MESSAGE, { customerAccess: access })
      );
    }

    // BUG-10: check FK (estimates.customer_id) before attempting delete
    const usage = await db
      .select({ id: schema.estimates.id })
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.customerId, id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      )
      .limit(1);

    if (usage.length > 0) {
      return reply.status(409).send(
        errorBody('FK_IN_USE', 'Customer has estimates and cannot be deleted', { hasEstimates: true })
      );
    }

    const [deleted] = await db
      .delete(schema.customers)
      .where(and(eq(schema.customers.id, id), eq(schema.customers.tenantId, tenantId)))
      .returning();

    if (!deleted) {
      return reply.status(404).send(errorBody('NOT_FOUND', 'Customer not found'));
    }

    return reply.status(204).send();
  } catch (error: unknown) {
    // BUG-10: FK violation catch (in case the usage check above misses an edge case)
    if (isFkViolation(error)) {
      return reply.status(409).send(
        errorBody('FK_IN_USE', 'Customer is referenced and cannot be deleted')
      );
    }
    return sendCaughtError(reply, error, 'Failed to delete customer', 'Delete customer error:');
  }
}

/**
 * GET /customers/:id/estimates — BUG-13: replace N+1 with a single join query.
 */
async function getCustomerEstimatesRoute(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    // Verify customer belongs to tenant
    const [customer] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(and(eq(schema.customers.id, id), eq(schema.customers.tenantId, tenantId)));

    if (!customer) {
      return reply.status(404).send(errorBody('NOT_FOUND', 'Customer not found'));
    }

    // Fetch estimates
    const estimates = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.customerId, id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      )
      .orderBy(schema.estimates.createdAt);

    if (estimates.length === 0) return reply.send([]);

    // BUG-13: single JOIN query for all layers instead of N+1 loop
    const estimateIds = estimates.map((e: (typeof estimates)[number]) => e.id);
    const allLayers = await db
      .select({
        estimateId: schema.layers.estimateId,
        materialName: schema.layers.materialName,
        micron: schema.layers.micron,
        position: schema.layers.position,
        materialId: schema.layers.materialId,
      })
      .from(schema.layers)
      .where(inArray(schema.layers.estimateId, estimateIds))
      .orderBy(schema.layers.position);

    const layersByEstimate = new Map<string, typeof allLayers>();
    for (const layer of allLayers) {
      const list = layersByEstimate.get(layer.estimateId) ?? [];
      list.push(layer);
      layersByEstimate.set(layer.estimateId, list);
    }

    const enriched = estimates.map((est: (typeof estimates)[number]) => ({
      ...est,
      layers: layersByEstimate.get(est.id) ?? [],
    }));

    return reply.send(enriched);
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to fetch customer estimates', 'Get customer estimates error:');
  }
}

/**
 * GET /customers/:id/explorer — quotes + estimates for customer explorer UI.
 * Special ids: `none` (null customer, non–price-check), `price-check` (internal price checks).
 */
async function getCustomerExplorerRoute(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { q?: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const { id } = request.params;
    const q = (request.query.q || '').trim().toLowerCase();
    const db = getDatabase();

    let customer: { id: string | null; companyName: string };
    let priceCheckOnly = false;
    if (id === 'price-check') {
      customer = { id: 'price-check', companyName: 'Price checks' };
      priceCheckOnly = true;
    } else if (id === 'none') {
      customer = { id: null, companyName: '(No customer)' };
    } else {
      const [row] = await db
        .select({ id: schema.customers.id, companyName: schema.customers.companyName })
        .from(schema.customers)
        .where(and(eq(schema.customers.id, id), eq(schema.customers.tenantId, tenantId)));
      if (!row) {
        return reply.status(404).send(errorBody('NOT_FOUND', 'Customer not found'));
      }
      customer = row;
    }

    const [userRecord] = await db
      .select({ visibilityProfile: schema.users.visibilityProfile, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, user.userId));
    const profile = getEffectiveProfile(userRecord?.role, userRecord?.visibilityProfile);

    const quoteConditions = [
      eq(schema.quotes.tenantId, tenantId),
      isNull(schema.quotes.deletedAt),
      priceCheckOnly
        ? and(isNull(schema.quotes.customerId), eq(schema.quotes.isPriceCheck, true))
        : customer.id == null
          ? and(isNull(schema.quotes.customerId), eq(schema.quotes.isPriceCheck, false))
          : eq(schema.quotes.customerId, customer.id),
    ];

    const quotes = await db
      .select()
      .from(schema.quotes)
      .where(and(...quoteConditions))
      .orderBy(desc(schema.quotes.updatedAt));

    const quoteIds = quotes.map((quote) => quote.id);
    const allEstimates =
      quoteIds.length > 0
        ? await db
            .select()
            .from(schema.estimates)
            .where(
              and(
                inArray(schema.estimates.quoteId, quoteIds),
                eq(schema.estimates.tenantId, tenantId),
                isNull(schema.estimates.deletedAt)
              )
            )
            .orderBy(asc(schema.estimates.sortOrder), asc(schema.estimates.createdAt))
        : [];
    const estimatesByQuote = new Map<string, typeof allEstimates>();
    for (const est of allEstimates) {
      const list = estimatesByQuote.get(est.quoteId) ?? [];
      list.push(est);
      estimatesByQuote.set(est.quoteId, list);
    }
    const structureSummaries = await buildStructureSummaries(
      db,
      allEstimates.map((est) => est.id)
    );

    const resultQuotes = [];
    for (const quote of quotes) {
      const estimates = estimatesByQuote.get(quote.id) ?? [];

      const estimateSummaries = [];
      for (const est of estimates) {
        const structureSummary = structureSummaries.get(est.id) ?? '';
        const base = stripEstimateRow(est, profile);
        const developmentTotal = developmentTotalDisplay(est.printColorCount, est.costPerColor);
        const summary = {
          ...base,
          structureSummary,
          orderQuantityKg: est.orderQuantityKg,
          productType: est.productType,
          ...(profile.platesPerKg
            ? {
                printColorCount: est.printColorCount,
                costPerColor: est.costPerColor,
                developmentTotal,
                toolingBillingMode: est.toolingBillingMode,
              }
            : {}),
        };

        if (q) {
          const hay = [
            quote.name,
            quote.refNumber,
            quote.rfqNumber,
            quote.notes,
            est.refNumber,
            est.skuLabel,
            est.brand,
            est.jobName,
            est.specsCode,
            structureSummary,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) continue;
        }
        estimateSummaries.push({
          ...summary,
          variantDescription: quote.notes,
        });
      }

      if (q && estimateSummaries.length === 0) {
        const quoteHay = `${quote.name} ${quote.refNumber}`.toLowerCase();
        if (!quoteHay.includes(q)) continue;
      }

      resultQuotes.push({
        id: quote.id,
        name: quote.name,
        refNumber: quote.refNumber,
        rfqNumber: quote.rfqNumber,
        status: quote.status,
        validUntil: quote.validUntil,
        updatedAt: quote.updatedAt,
        notes: quote.notes,
        estimates: estimateSummaries,
      });
    }

    return reply.send({ customer, quotes: resultQuotes });
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to load explorer', 'Customer explorer error:');
  }
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function registerCustomerRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/customers/autocomplete', autocompleteCustomersRoute);
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/api/v1/customers', getCustomersRoute);
  fastify.post('/api/v1/customers', createCustomerRoute);
  fastify.get('/api/v1/customers/:id', getCustomerRoute);
  fastify.get('/api/v1/customers/:id/estimates', getCustomerEstimatesRoute);
  fastify.get('/api/v1/customers/:id/explorer', getCustomerExplorerRoute);
  fastify.patch('/api/v1/customers/:id', updateCustomerRoute);
  fastify.delete('/api/v1/customers/:id', deleteCustomerRoute);
}
