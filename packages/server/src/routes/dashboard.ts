import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, desc } from 'drizzle-orm';
import { getEffectiveProfile, stripEstimateRow } from '../utils/visibility';
import { usdToDisplay } from '../utils/currency';

async function getUserVisibilityProfile(db: ReturnType<typeof getDatabase>, userId: string) {
  const [userRecord] = await db
    .select({ visibilityProfile: schema.users.visibilityProfile, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return getEffectiveProfile(userRecord?.role ?? 'user', userRecord?.visibilityProfile);
}

function estimateTotalDisplay(est: {
  salePricePerKg: string | null;
  exchangeRateUsdToDisplay: string;
  displayCurrency: string;
}, firstSlabQty: number | null) {
  const saleUsd = parseFloat(est.salePricePerKg || '0') || 0;
  const fx = parseFloat(est.exchangeRateUsdToDisplay) || 1;
  const qty = firstSlabQty ?? 0;
  const lineTotal = usdToDisplay(saleUsd, fx) * qty;
  return { totalPrice: lineTotal, displayCurrency: est.displayCurrency };
}

export async function getDashboardSummaryRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const db = getDatabase();
    const profile = await getUserVisibilityProfile(db, user.userId);

    const [tenant] = await db
      .select({ quotationValidDays: schema.tenants.quotationValidDays })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    const validDays = tenant?.quotationValidDays ?? 30;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expiringEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const allEstimates = await db
      .select()
      .from(schema.estimates)
      .where(eq(schema.estimates.tenantId, tenantId))
      .orderBy(desc(schema.estimates.createdAt));

    const customers = await db
      .select({ id: schema.customers.id, companyName: schema.customers.companyName })
      .from(schema.customers)
      .where(eq(schema.customers.tenantId, tenantId));
    const customerMap = new Map(customers.map((c) => [c.id, c.companyName]));

    const slabs = await db
      .select({
        estimateId: schema.slabs.estimateId,
        quantityKg: schema.slabs.quantityKg,
      })
      .from(schema.slabs)
      .innerJoin(schema.estimates, eq(schema.slabs.estimateId, schema.estimates.id))
      .where(eq(schema.estimates.tenantId, tenantId))
      .orderBy(schema.slabs.quantityKg);

    const firstSlabByEstimate = new Map<string, number>();
    for (const slab of slabs) {
      if (!firstSlabByEstimate.has(slab.estimateId)) {
        firstSlabByEstimate.set(slab.estimateId, parseFloat(slab.quantityKg));
      }
    }

    const estimatesThisMonth = allEstimates.filter(
      (e) => e.createdAt && new Date(e.createdAt) >= monthStart
    ).length;

    const drafts = allEstimates.filter((e) => e.status === 'draft').length;
    const sent = allEstimates.filter((e) => e.status === 'sent').length;
    const won = allEstimates.filter((e) => e.status === 'won').length;

    const toSummaryRow = (est: (typeof allEstimates)[0]) => {
      const pricing = estimateTotalDisplay(est, firstSlabByEstimate.get(est.id) ?? null);
      const row = stripEstimateRow(est, profile);
      return {
        ...row,
        customerName: est.customerId ? customerMap.get(est.customerId) ?? null : null,
        totalPrice: pricing.totalPrice,
        displayCurrency: pricing.displayCurrency,
        sentAt: est.sentAt,
        validUntil: est.validUntil,
      };
    };

    const recent = allEstimates.slice(0, 5).map(toSummaryRow);

    const expiringProposals = allEstimates
      .filter((e) => {
        if (e.status !== 'sent') return false;
        let validUntil = e.validUntil ? new Date(e.validUntil) : null;
        if (!validUntil && e.sentAt) {
          validUntil = new Date(new Date(e.sentAt).getTime() + validDays * 86400000);
        }
        if (!validUntil) return false;
        return validUntil >= now && validUntil <= expiringEnd;
      })
      .map((e) => {
        const row = toSummaryRow(e);
        const validUntil = e.validUntil
          ? new Date(e.validUntil)
          : e.sentAt
            ? new Date(new Date(e.sentAt).getTime() + validDays * 86400000)
            : null;
        const daysLeft = validUntil
          ? Math.max(0, Math.ceil((validUntil.getTime() - now.getTime()) / 86400000))
          : null;
        return { ...row, daysLeft, validUntil: validUntil?.toISOString() ?? null };
      })
      .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));

    return reply.send({
      estimatesThisMonth,
      drafts,
      sent,
      won,
      recent,
      expiringProposals,
      quotationValidDays: validDays,
    });
  } catch (error: unknown) {
    console.error('Dashboard summary error:', error);
    return reply.status(500).send({ error: 'Failed to load dashboard summary' });
  }
}

export function registerDashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/v1/dashboard/summary',
    async (request, reply) => getDashboardSummaryRoute(fastify, request, reply)
  );
}
