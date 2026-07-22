import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, desc, and, isNull, inArray } from 'drizzle-orm';
import { getEffectiveProfile, stripEstimateRow } from '../utils/visibility';
import { usdToDisplay } from '../utils/currency';
import { sendCaughtError } from '../utils/errors';

type EstimateRow = typeof schema.estimates.$inferSelect;
type QuoteRow = typeof schema.quotes.$inferSelect;

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

function packageKey(est: EstimateRow): string {
  return est.quoteId ? `q:${est.quoteId}` : `e:${est.id}`;
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
      .where(and(eq(schema.estimates.tenantId, tenantId), isNull(schema.estimates.deletedAt)))
      .orderBy(desc(schema.estimates.createdAt));

    const customers = await db
      .select({ id: schema.customers.id, companyName: schema.customers.companyName })
      .from(schema.customers)
      .where(eq(schema.customers.tenantId, tenantId));
    const customerMap = new Map(customers.map((c: (typeof customers)[number]) => [c.id, c.companyName]));

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
      (e: EstimateRow) => e.createdAt && new Date(e.createdAt) >= monthStart
    ).length;

    const drafts = allEstimates.filter((e: EstimateRow) => e.status === 'draft').length;
    const sent = allEstimates.filter((e: EstimateRow) => e.status === 'sent').length;
    const won = allEstimates.filter((e: EstimateRow) => e.status === 'won').length;

    const toSummaryRow = (est: EstimateRow) => {
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

    // Group by quote (PKG): top packages by newest estimate activity, include all SKUs on each.
    const grouped = new Map<string, EstimateRow[]>();
    for (const est of allEstimates) {
      const key = packageKey(est);
      const list = grouped.get(key);
      if (list) list.push(est);
      else grouped.set(key, [est]);
    }

    const sortedGroups = [...grouped.entries()].sort(([, a], [, b]) => {
      const ta = a[0]?.createdAt ? new Date(a[0].createdAt).getTime() : 0;
      const tb = b[0]?.createdAt ? new Date(b[0].createdAt).getTime() : 0;
      return tb - ta;
    });

    const topGroups = sortedGroups.slice(0, 5);
    const quoteIds = topGroups
      .map(([, ests]) => ests[0]?.quoteId)
      .filter((id): id is string => Boolean(id));

    const quoteMap = new Map<string, QuoteRow>();
    if (quoteIds.length > 0) {
      const quoteRows = await db
        .select()
        .from(schema.quotes)
        .where(
          and(
            eq(schema.quotes.tenantId, tenantId),
            isNull(schema.quotes.deletedAt),
            inArray(schema.quotes.id, quoteIds)
          )
        );
      for (const q of quoteRows) quoteMap.set(q.id, q);
    }

    const recentPackages = topGroups.map(([, ests]) => {
      const ordered = [...ests].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const children = ordered.map(toSummaryRow);
      const quoteId = ordered[0]?.quoteId ?? null;
      const quote = quoteId ? quoteMap.get(quoteId) : undefined;
      const totalPrice = children.reduce((sum, c) => sum + (c.totalPrice || 0), 0);
      const displayCurrency =
        quote?.displayCurrency || children[0]?.displayCurrency || 'USD';
      const customerId = quote?.customerId ?? ordered[0]?.customerId ?? null;
      const newest = ordered.reduce((best, e) => {
        const t = e.createdAt ? new Date(e.createdAt).getTime() : 0;
        const bt = best?.createdAt ? new Date(best.createdAt).getTime() : 0;
        return t >= bt ? e : best;
      }, ordered[0]);

      return {
        quoteId,
        refNumber: quote?.refNumber ?? children[0]?.refNumber ?? '—',
        name: quote?.name ?? children[0]?.jobName ?? null,
        customerName: customerId ? customerMap.get(customerId) ?? null : null,
        status: quote?.status ?? children[0]?.status ?? 'draft',
        createdAt: newest?.createdAt
          ? new Date(newest.createdAt).toISOString()
          : new Date().toISOString(),
        totalPrice,
        displayCurrency,
        estimateCount: children.length,
        estimates: children,
      };
    });

    const expiringProposals = allEstimates
      .filter((e: EstimateRow) => {
        if (e.status !== 'sent') return false;
        let validUntil = e.validUntil ? new Date(e.validUntil) : null;
        if (!validUntil && e.sentAt) {
          validUntil = new Date(new Date(e.sentAt).getTime() + validDays * 86400000);
        }
        if (!validUntil) return false;
        return validUntil >= now && validUntil <= expiringEnd;
      })
      .map((e: EstimateRow) => {
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
      .sort((a: ReturnType<typeof toSummaryRow> & { daysLeft?: number | null }, b: ReturnType<typeof toSummaryRow> & { daysLeft?: number | null }) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));

    return reply.send({
      estimatesThisMonth,
      drafts,
      sent,
      won,
      recent,
      recentPackages,
      expiringProposals,
      quotationValidDays: validDays,
    });
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to load dashboard summary', 'Dashboard summary error:');
  }
}

export function registerDashboardRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/v1/dashboard/summary',
    async (request, reply) => getDashboardSummaryRoute(fastify, request, reply)
  );
}
