import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, ilike, isNull, count as drizzleCount } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../db/schema';
import { getDatabase } from '../db';
import { extractTenantFromRequest } from '../utils/auth';
import { errorBody, isFkViolation } from '../utils/errors';
import { parsePagination, paginate } from '../utils/pagination';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createCustomerSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape Postgres LIKE wildcards in user-supplied search strings. BUG-13. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
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
    console.error('Get customers error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Failed to fetch customers'));
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
          ilike(schema.customers.companyName, `%${q}%`)
        )
      )
      .limit(20);

    return reply.send(customers);
  } catch (error: unknown) {
    console.error('Autocomplete customers error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Failed to search customers'));
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

    const [customer] = await db
      .insert(schema.customers)
      .values({
        tenantId,
        companyName: validated.companyName,
        contactName: validated.contactName,
        email: validated.email || null,
        phone: validated.phone,
        notes: validated.notes,
      })
      .returning();

    return reply.status(201).send(customer);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send(errorBody('VALIDATION', 'Validation failed', error.errors));
    }
    console.error('Create customer error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Failed to create customer'));
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
    console.error('Get customer error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Failed to fetch customer'));
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
    console.error('Update customer error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Failed to update customer'));
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
    console.error('Delete customer error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Failed to delete customer'));
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
      .where(
        // Drizzle inList for the set of estimate IDs
        estimateIds.length === 1
          ? eq(schema.layers.estimateId, estimateIds[0])
          : estimateIds.reduce(
              (acc: ReturnType<typeof eq> | null, eid: string) => {
                const cond = eq(schema.layers.estimateId, eid);
                return acc ? and(acc, cond) as unknown as ReturnType<typeof eq> : cond;
              },
              null
            ) ?? eq(schema.layers.estimateId, estimateIds[0])
      )
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
    console.error('Get customer estimates error:', error);
    return reply.status(500).send(errorBody('INTERNAL', 'Failed to fetch customer estimates'));
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
  fastify.patch('/api/v1/customers/:id', updateCustomerRoute);
  fastify.delete('/api/v1/customers/:id', deleteCustomerRoute);
}
