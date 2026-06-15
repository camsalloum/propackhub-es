import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import * as schema from '../db/schema';
import { getDatabase } from '../db';
import { extractTenantFromRequest } from '../utils/auth';

// Validation schemas
const createCustomerSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

// Get all customers for tenant
async function getCustomersRoute(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const tenantId = extractTenantFromRequest(request);
  const db = getDatabase();

  const customers = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenantId))
    .orderBy(schema.customers.companyName);

  return reply.send(customers);
}

// Create customer
async function createCustomerRoute(
  request: FastifyRequest<{
    Body: z.infer<typeof createCustomerSchema>;
  }>,
  reply: FastifyReply
) {
  const tenantId = extractTenantFromRequest(request);
  const db = getDatabase();

  const validated = createCustomerSchema.parse(request.body);

  const [customer] = await db
    .insert(schema.customers)
    .values({
      tenantId,
      companyName: validated.companyName,
      contactName: validated.contactName,
      email: validated.email,
      phone: validated.phone,
      address: validated.address,
      notes: validated.notes,
    })
    .returning();

  return reply.status(201).send(customer);
}

// Get single customer
async function getCustomerRoute(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  const tenantId = extractTenantFromRequest(request);
  const { id } = request.params;
  const db = getDatabase();

  const [customer] = await db
    .select()
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.id, id),
        eq(schema.customers.tenantId, tenantId)
      )
    );

  if (!customer) {
    return reply.status(404).send({ error: 'Customer not found' });
  }

  return reply.send(customer);
}

// Update customer
async function updateCustomerRoute(
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof updateCustomerSchema>;
  }>,
  reply: FastifyReply
) {
  const tenantId = extractTenantFromRequest(request);
  const { id } = request.params;
  const db = getDatabase();

  const validated = updateCustomerSchema.parse(request.body);

  const [customer] = await db
    .update(schema.customers)
    .set({
      ...validated,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.customers.id, id),
        eq(schema.customers.tenantId, tenantId)
      )
    )
    .returning();

  if (!customer) {
    return reply.status(404).send({ error: 'Customer not found' });
  }

  return reply.send(customer);
}

// Delete customer
async function deleteCustomerRoute(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  const tenantId = extractTenantFromRequest(request);
  const { id } = request.params;
  const db = getDatabase();

  const [deleted] = await db
    .delete(schema.customers)
    .where(
      and(
        eq(schema.customers.id, id),
        eq(schema.customers.tenantId, tenantId)
      )
    )
    .returning();

  if (!deleted) {
    return reply.status(404).send({ error: 'Customer not found' });
  }

  return reply.status(204).send();
}

// Register routes
export async function registerCustomerRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('onRequest', async (request) => {
    await request.jwtVerify();
  });

  fastify.get('/api/v1/customers', getCustomersRoute);
  fastify.post('/api/v1/customers', createCustomerRoute);
  fastify.get('/api/v1/customers/:id', getCustomerRoute);
  fastify.patch('/api/v1/customers/:id', updateCustomerRoute);
  fastify.delete('/api/v1/customers/:id', deleteCustomerRoute);
}
