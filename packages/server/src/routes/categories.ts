import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest } from '../utils/auth';
import { ensureCategoriesForTenant } from '../db/seed-categories';

async function getCategoriesRoute(request: FastifyRequest, reply: FastifyReply) {
  await request.jwtVerify();
  const tenantId = extractTenantFromRequest(request);
  const db = getDatabase();

  await ensureCategoriesForTenant(tenantId);

  const categories = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.tenantId, tenantId));

  const subcategories = await db
    .select()
    .from(schema.subcategories)
    .where(eq(schema.subcategories.tenantId, tenantId));

  const result = categories.map((cat: (typeof categories)[number]) => ({
    ...cat,
    subcategories: subcategories.filter((s: (typeof subcategories)[number]) => s.categoryId === cat.id),
  }));

  return reply.send(result);
}

async function getSubcategoriesRoute(
  request: FastifyRequest<{ Querystring: { category_id?: string } }>,
  reply: FastifyReply
) {
  await request.jwtVerify();
  const tenantId = extractTenantFromRequest(request);
  const db = getDatabase();
  const { category_id } = request.query;

  const conditions = [eq(schema.subcategories.tenantId, tenantId)];
  if (category_id) {
    conditions.push(eq(schema.subcategories.categoryId, category_id));
  }

  const rows = await db
    .select()
    .from(schema.subcategories)
    .where(and(...conditions));

  return reply.send(rows);
}

export async function registerCategoryRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/categories', getCategoriesRoute);
  fastify.get('/api/v1/subcategories', getSubcategoriesRoute);
}
