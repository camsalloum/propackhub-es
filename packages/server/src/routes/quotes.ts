import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { getEffectiveProfile, stripEstimateRow } from '../utils/visibility';
import type { VisibilityProfile } from '@es/engine';
import { sendCaughtError } from '../utils/errors';
import { cloneEstimate } from '../services/clone-estimate';
import {
  buildStructureSummary,
  buildStructureSummaries,
  createQuote,
  developmentTotalDisplay,
  isQuoteLocked,
  nextEstimateSortOrder,
  type QuoteStatus,
  type ToolingBillingMode,
} from '../services/quote-helpers';
import { logQuoteStatusTransition } from '../utils/quote-audit';

const QuoteStatusSchema = z.enum(['draft', 'saved', 'sent', 'archived']);
const ToolingBillingModeSchema = z.enum(['amortized', 'separate', 'not_billed']);

const PriceListDisplayPrefsSchema = z
  .object({
    v: z.literal(1),
    unit: z.enum(['kg', 'm2', 'lm', 'roll', 'pc', 'kpcs']).optional(),
    currency: z.string().length(3).optional(),
    slabMode: z.enum(['predefined', 'custom']).optional(),
    selectedBandKeys: z.array(z.string().min(1)).optional(),
    customSlabs: z.array(z.coerce.number().positive()).optional(),
  })
  .nullable();

const QuoteCreateSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  displayCurrency: z.string().length(3).optional(),
  exchangeRateUsdToDisplay: z.coerce.number().positive().optional(),
  status: QuoteStatusSchema.optional(),
  deliveryTerm: z.string().max(32).optional().nullable(),
  paymentTerms: z.string().max(255).optional().nullable(),
  remarks: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  rfqNumber: z.string().max(128).optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  defaultBrand: z.string().max(255).optional().nullable(),
  salespersonUserId: z.string().uuid().optional().nullable(),
  defaultPrintColorCount: z.coerce.number().int().nonnegative().optional().nullable(),
  defaultCostPerColor: z.coerce.number().nonnegative().optional().nullable(),
  defaultToolingBillingMode: ToolingBillingModeSchema.optional().nullable(),
  isPriceCheck: z.boolean().optional(),
});

const QuoteUpdateSchema = QuoteCreateSchema.partial().extend({
  name: z.string().min(1).optional(),
  priceListDisplayPrefs: PriceListDisplayPrefsSchema.optional(),
});

const DuplicateEstimateSchema = z.object({
  skuLabel: z.string().max(255).optional().nullable(),
  brand: z.string().max(255).optional().nullable(),
  specsCode: z.string().max(64).optional().nullable(),
  printColorCount: z.coerce.number().int().nonnegative().optional().nullable(),
  costPerColor: z.coerce.number().nonnegative().optional().nullable(),
  toolingBillingMode: ToolingBillingModeSchema.optional().nullable(),
  jobName: z.string().min(1).optional(),
});

const AddEstimateSchema = z.object({
  mode: z.enum(['blank', 'duplicate']).default('duplicate'),
  sourceEstimateId: z.string().uuid().optional(),
  skuLabel: z.string().max(255).optional().nullable(),
  brand: z.string().max(255).optional().nullable(),
  specsCode: z.string().max(64).optional().nullable(),
  printColorCount: z.coerce.number().int().nonnegative().optional().nullable(),
  costPerColor: z.coerce.number().nonnegative().optional().nullable(),
  toolingBillingMode: ToolingBillingModeSchema.optional().nullable(),
  jobName: z.string().min(1).optional(),
});

async function getUserVisibilityProfile(
  db: ReturnType<typeof getDatabase>,
  userId: string
): Promise<VisibilityProfile> {
  const [userRecord] = await db
    .select({ visibilityProfile: schema.users.visibilityProfile, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return getEffectiveProfile(userRecord?.role, userRecord?.visibilityProfile);
}

async function loadQuoteOr404(
  db: ReturnType<typeof getDatabase>,
  tenantId: string,
  quoteId: string
) {
  const [quote] = await db
    .select()
    .from(schema.quotes)
    .where(
      and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.tenantId, tenantId),
        isNull(schema.quotes.deletedAt)
      )
    );
  return quote ?? null;
}

function enrichEstimateSummary(
  est: typeof schema.estimates.$inferSelect,
  structureSummary: string,
  profile: VisibilityProfile
) {
  const base = stripEstimateRow(est, profile);
  const developmentTotal = developmentTotalDisplay(est.printColorCount, est.costPerColor);
  return {
    ...base,
    quoteId: est.quoteId,
    sortOrder: est.sortOrder,
    skuLabel: est.skuLabel,
    brand: est.brand,
    specsCode: est.specsCode,
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
}

async function listQuotesRoute(
  request: FastifyRequest<{
    Querystring: { customerId?: string; status?: string; limit?: string };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const limit = Math.min(Number(request.query.limit) || 50, 200);

    const conditions = [
      eq(schema.quotes.tenantId, tenantId),
      isNull(schema.quotes.deletedAt),
    ];
    if (request.query.customerId) {
      conditions.push(eq(schema.quotes.customerId, request.query.customerId));
    }
    if (request.query.status) {
      conditions.push(eq(schema.quotes.status, request.query.status));
    }

    const quotes = await db
      .select()
      .from(schema.quotes)
      .where(and(...conditions))
      .orderBy(desc(schema.quotes.updatedAt))
      .limit(limit);

    const quoteIds = quotes.map((q) => q.id);
    const counts = new Map<string, number>();
    if (quoteIds.length > 0) {
      const rows = await db
        .select({
          quoteId: schema.estimates.quoteId,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.estimates)
        .where(
          and(
            eq(schema.estimates.tenantId, tenantId),
            isNull(schema.estimates.deletedAt),
            sql`${schema.estimates.quoteId} IN (${sql.join(
              quoteIds.map((id) => sql`${id}`),
              sql`, `
            )})`
          )
        )
        .groupBy(schema.estimates.quoteId);
      for (const row of rows) {
        if (row.quoteId) counts.set(row.quoteId, Number(row.count));
      }
    }

    return reply.send(
      quotes.map((q) => ({
        ...q,
        estimateCount: counts.get(q.id) ?? 0,
      }))
    );
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to list quotes', 'List quotes error:');
  }
}

async function getQuoteRoute(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const db = getDatabase();
    const quote = await loadQuoteOr404(db, tenantId, request.params.id);
    if (!quote) return reply.status(404).send({ error: 'Quote not found' });

    const profile = await getUserVisibilityProfile(db, user.userId);
    const estimates = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.quoteId, quote.id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      )
      .orderBy(asc(schema.estimates.sortOrder), asc(schema.estimates.createdAt));

    const structureSummaries = await buildStructureSummaries(db, estimates.map((est) => est.id));
    const summaries = estimates.map((est) =>
      enrichEstimateSummary(est, structureSummaries.get(est.id) ?? '', profile)
    );

    return reply.send({
      ...quote,
      locked: isQuoteLocked(quote),
      estimates: summaries,
    });
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to get quote', 'Get quote error:');
  }
}

async function createQuoteRoute(
  request: FastifyRequest<{ Body: z.infer<typeof QuoteCreateSchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const data = QuoteCreateSchema.parse(request.body);
    const db = getDatabase();

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

    if (data.customerId) {
      const [customer] = await db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(eq(schema.customers.id, data.customerId), eq(schema.customers.tenantId, tenantId))
        );
      if (!customer) return reply.status(404).send({ error: 'Customer not found' });
    }

    if (data.isPriceCheck && data.customerId) {
      return reply.status(400).send({ error: 'Price check quotes cannot have a customer' });
    }

    const quote = await createQuote(db, {
      tenantId,
      customerId: data.customerId ?? null,
      name: data.name,
      displayCurrency: data.displayCurrency ?? tenant.displayCurrency,
      exchangeRateUsdToDisplay:
        data.exchangeRateUsdToDisplay ?? tenant.exchangeRateUsdToDisplay,
      status: data.status,
      deliveryTerm: data.deliveryTerm,
      paymentTerms: data.paymentTerms,
      remarks: data.remarks,
      notes: data.notes,
      rfqNumber: data.rfqNumber?.trim() || null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      defaultBrand: data.defaultBrand,
      salespersonUserId: data.salespersonUserId,
      defaultPrintColorCount: data.defaultPrintColorCount,
      defaultCostPerColor: data.defaultCostPerColor,
      defaultToolingBillingMode: data.defaultToolingBillingMode as ToolingBillingMode | null,
      isPriceCheck: data.isPriceCheck ?? false,
    });

    return reply.status(201).send({ ...quote, estimates: [] });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    return sendCaughtError(reply, error, 'Failed to create quote', 'Create quote error:');
  }
}

async function updateQuoteRoute(
  request: FastifyRequest<{ Params: { id: string }; Body: z.infer<typeof QuoteUpdateSchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const data = QuoteUpdateSchema.parse(request.body);
    const db = getDatabase();
    const existing = await loadQuoteOr404(db, tenantId, request.params.id);
    if (!existing) return reply.status(404).send({ error: 'Quote not found' });

    // Sent quotes are locked: only status unlock (draft / saved / archived) is allowed.
    if (isQuoteLocked(existing)) {
      const keys = Object.keys(data);
      const isUnlock =
        data.status !== undefined &&
        data.status !== 'sent' &&
        keys.length === 1 &&
        keys[0] === 'status';
      const isDisplayPrefsOnly =
        keys.length === 1 && keys[0] === 'priceListDisplayPrefs';
      if (!isUnlock && !isDisplayPrefsOnly) {
        return reply.status(409).send({
          error: 'Quote is sent and locked. Unlock or re-quote to edit.',
        });
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.status !== undefined) {
      updates.status = data.status as QuoteStatus;
      if (data.status === 'sent') {
        const sentAt = existing.sentAt ? new Date(existing.sentAt) : new Date();
        if (!existing.sentAt) updates.sentAt = sentAt;
        if (data.validUntil === undefined && !existing.validUntil) {
          const [tenantRow] = await db
            .select({ quotationValidDays: schema.tenants.quotationValidDays })
            .from(schema.tenants)
            .where(eq(schema.tenants.id, tenantId));
          const validDays = tenantRow?.quotationValidDays ?? 30;
          updates.validUntil = new Date(sentAt.getTime() + validDays * 86400000);
        }
      } else if (existing.status === 'sent' || existing.sentAt) {
        // Unlock: clear sent_at so estimates become editable again.
        updates.sentAt = null;
      }
    }
    if (data.deliveryTerm !== undefined) updates.deliveryTerm = data.deliveryTerm;
    if (data.paymentTerms !== undefined) updates.paymentTerms = data.paymentTerms;
    if (data.remarks !== undefined) updates.remarks = data.remarks;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.rfqNumber !== undefined) updates.rfqNumber = data.rfqNumber?.trim() || null;
    if (data.validUntil !== undefined) {
      updates.validUntil = data.validUntil ? new Date(data.validUntil) : null;
    }
    if (data.defaultBrand !== undefined) updates.defaultBrand = data.defaultBrand;
    if (data.salespersonUserId !== undefined) {
      updates.salespersonUserId = data.salespersonUserId;
    }
    if (data.defaultPrintColorCount !== undefined) {
      updates.defaultPrintColorCount = data.defaultPrintColorCount;
    }
    if (data.defaultCostPerColor !== undefined) {
      updates.defaultCostPerColor =
        data.defaultCostPerColor != null ? String(data.defaultCostPerColor) : null;
    }
    if (data.defaultToolingBillingMode !== undefined) {
      updates.defaultToolingBillingMode = data.defaultToolingBillingMode;
    }
    // Currency on quote is commercial default for *new* estimates only — do not rewrite frozen snapshots.
    if (data.displayCurrency !== undefined) updates.displayCurrency = data.displayCurrency;
    if (data.exchangeRateUsdToDisplay !== undefined) {
      updates.exchangeRateUsdToDisplay = String(data.exchangeRateUsdToDisplay);
    }

    if (data.customerId !== undefined) {
      if (data.customerId) {
        const [customer] = await db
          .select({ id: schema.customers.id })
          .from(schema.customers)
          .where(
            and(eq(schema.customers.id, data.customerId), eq(schema.customers.tenantId, tenantId))
          );
        if (!customer) return reply.status(404).send({ error: 'Customer not found' });
      }
      updates.customerId = data.customerId;
    }

    if (data.priceListDisplayPrefs !== undefined) {
      updates.priceListDisplayPrefs = data.priceListDisplayPrefs;
    }

    const updatedRows = (await db
      .update(schema.quotes)
      .set(updates)
      .where(and(eq(schema.quotes.id, existing.id), eq(schema.quotes.tenantId, tenantId)))
      .returning()) as Array<typeof existing>;

    const updated = updatedRows[0];

    // Cascade customer_id to child estimates (quote is commercial source of truth).
    if (data.customerId !== undefined) {
      await db
        .update(schema.estimates)
        .set({ customerId: data.customerId, updatedAt: new Date() })
        .where(
          and(
            eq(schema.estimates.quoteId, existing.id),
            eq(schema.estimates.tenantId, tenantId),
            isNull(schema.estimates.deletedAt)
          )
        );
    }

    if (updated) {
      await logQuoteStatusTransition(db, {
        tenantId,
        userId: user.userId,
        quoteId: existing.id,
        before: {
          status: existing.status,
          sentAt: existing.sentAt,
          validUntil: existing.validUntil,
        },
        after: {
          status: updated.status,
          sentAt: updated.sentAt,
          validUntil: updated.validUntil,
        },
      });
    }

    return reply.send(updated);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    return sendCaughtError(reply, error, 'Failed to update quote', 'Update quote error:');
  }
}

async function deleteQuoteRoute(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const existing = await loadQuoteOr404(db, tenantId, request.params.id);
    if (!existing) return reply.status(404).send({ error: 'Quote not found' });

    const now = new Date();
    await db
      .update(schema.quotes)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(schema.quotes.id, existing.id));

    await db
      .update(schema.estimates)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(schema.estimates.quoteId, existing.id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      );

    return reply.status(204).send();
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to delete quote', 'Delete quote error:');
  }
}

async function getQuotePriceListRoute(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const db = getDatabase();
    const quote = await loadQuoteOr404(db, tenantId, request.params.id);
    if (!quote) return reply.status(404).send({ error: 'Quote not found' });

    const profile = await getUserVisibilityProfile(db, user.userId);
    const estimates = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.quoteId, quote.id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      )
      .orderBy(asc(schema.estimates.sortOrder), asc(schema.estimates.createdAt));

    const estimateIds = estimates.map((est) => est.id);
    const [structureSummaries, allSlabs] = await Promise.all([
      buildStructureSummaries(db, estimateIds),
      estimateIds.length > 0
        ? db
            .select()
            .from(schema.slabs)
            .where(inArray(schema.slabs.estimateId, estimateIds))
            .orderBy(asc(schema.slabs.estimateId), asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg))
        : Promise.resolve([]),
    ]);
    const slabsByEstimate = new Map<string, typeof allSlabs>();
    for (const slab of allSlabs) {
      const list = slabsByEstimate.get(slab.estimateId) ?? [];
      list.push(slab);
      slabsByEstimate.set(slab.estimateId, list);
    }

    const rows = estimates.map((est) => {
      const structureSummary = structureSummaries.get(est.id) ?? '';
      const slabs = slabsByEstimate.get(est.id) ?? [];
      const summary = enrichEstimateSummary(est, structureSummary, profile);
      return {
        ...summary,
        slabs: profile.slabTable
          ? slabs.map((s) => ({
              quantityKg: s.quantityKg,
              pricePerKg: s.pricePerKg,
              sortOrder: s.sortOrder,
            }))
          : undefined,
      };
    });

    const separateCharges = profile.platesPerKg
      ? rows
          .filter((r) => r.toolingBillingMode === 'separate' && r.developmentTotal != null)
          .map((r) => ({
            estimateId: r.id,
            skuLabel: r.skuLabel ?? r.jobName,
            printColorCount: r.printColorCount,
            costPerColor: r.costPerColor,
            developmentTotal: r.developmentTotal,
            displayCurrency: r.displayCurrency,
          }))
      : [];

    return reply.send({
      quoteId: quote.id,
      refNumber: quote.refNumber,
      name: quote.name,
      displayCurrency: quote.displayCurrency,
      rows,
      separateDevelopmentCharges: separateCharges,
    });
  } catch (error: unknown) {
    return sendCaughtError(reply, error, 'Failed to get price list', 'Quote price list error:');
  }
}

async function duplicateEstimateOnQuoteRoute(
  request: FastifyRequest<{
    Params: { id: string; estimateId: string };
    Body: z.infer<typeof DuplicateEstimateSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const data = DuplicateEstimateSchema.parse(request.body ?? {});
    const db = getDatabase();
    const quote = await loadQuoteOr404(db, tenantId, request.params.id);
    if (!quote) return reply.status(404).send({ error: 'Quote not found' });
    if (isQuoteLocked(quote)) {
      return reply.status(409).send({
        error: 'Quote is sent and locked. Unlock or re-quote to edit.',
      });
    }

    const [source] = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, request.params.estimateId),
          eq(schema.estimates.quoteId, quote.id),
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt)
        )
      );
    if (!source) return reply.status(404).send({ error: 'Estimate not found on this quote' });

    const sortOrder = await nextEstimateSortOrder(db, quote.id);
    const { estimate } = await cloneEstimate(db, source.id, {
      tenantId,
      quoteId: quote.id,
      customerId: quote.customerId,
      jobName: data.jobName ?? source.jobName,
      skuLabel: data.skuLabel ?? null,
      brand: data.brand !== undefined ? data.brand : source.brand,
      specsCode: data.specsCode !== undefined ? data.specsCode : source.specsCode,
      printColorCount:
        data.printColorCount !== undefined ? data.printColorCount : source.printColorCount,
      costPerColor: data.costPerColor !== undefined ? data.costPerColor : source.costPerColor,
      toolingBillingMode:
        data.toolingBillingMode !== undefined
          ? data.toolingBillingMode
          : source.toolingBillingMode,
      sortOrder,
      copiedFromEstimateId: source.id,
      refreshMaterialPrices: false,
      displayCurrency: quote.displayCurrency,
      exchangeRateUsdToDisplay: String(quote.exchangeRateUsdToDisplay),
      copyCalculatedTotals: true,
    });

    const profile = await getUserVisibilityProfile(db, user.userId);
    const structureSummary = await buildStructureSummary(db, estimate.id);
    return reply
      .status(201)
      .send(enrichEstimateSummary(estimate, structureSummary, profile));
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    if (error instanceof Error && error.message === 'Source estimate not found') {
      return reply.status(404).send({ error: 'Source estimate not found' });
    }
    return sendCaughtError(reply, error, 'Failed to duplicate estimate', 'Duplicate on quote error:');
  }
}

async function addEstimateToQuoteRoute(
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof AddEstimateSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const data = AddEstimateSchema.parse(request.body ?? {});
    const db = getDatabase();
    const quote = await loadQuoteOr404(db, tenantId, request.params.id);
    if (!quote) return reply.status(404).send({ error: 'Quote not found' });
    if (isQuoteLocked(quote)) {
      return reply.status(409).send({
        error: 'Quote is sent and locked. Unlock or re-quote to edit.',
      });
    }

    if (data.mode === 'blank') {
      return reply.status(400).send({
        error:
          'Blank estimates are created via POST /estimates with quoteId, or template instantiate with quoteId',
      });
    }

    if (!data.sourceEstimateId) {
      return reply.status(400).send({ error: 'sourceEstimateId is required for duplicate mode' });
    }

    // Reuse duplicate handler path
    return duplicateEstimateOnQuoteRoute(
      {
        ...request,
        params: { id: quote.id, estimateId: data.sourceEstimateId },
        body: {
          skuLabel: data.skuLabel,
          brand: data.brand,
          specsCode: data.specsCode,
          printColorCount: data.printColorCount,
          costPerColor: data.costPerColor,
          toolingBillingMode: data.toolingBillingMode,
          jobName: data.jobName,
        },
      } as FastifyRequest<{
        Params: { id: string; estimateId: string };
        Body: z.infer<typeof DuplicateEstimateSchema>;
      }>,
      reply
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    return sendCaughtError(reply, error, 'Failed to add estimate', 'Add estimate to quote error:');
  }
}

async function getQuoteProposalPdfRoute(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const db = getDatabase();
    const quote = await loadQuoteOr404(db, tenantId, request.params.id);
    if (!quote) return reply.status(404).send({ error: 'Quote not found' });

    const { buildQuoteProposalPdfBuffer } = await import('../services/proposal-pdf');
    const pdfBuffer = await buildQuoteProposalPdfBuffer(
      db,
      quote.id,
      tenantId,
      user.userId
    );
    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${quote.refNumber || 'quote'}-proposal.pdf"`
    );
    return reply.send(pdfBuffer);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not available')) {
      return reply.status(403).send({ error: error.message });
    }
    if (error instanceof Error && error.message === 'Quote has no estimates') {
      return reply.status(400).send({ error: error.message });
    }
    return sendCaughtError(
      reply,
      error,
      'Failed to generate quote proposal PDF',
      'Quote proposal PDF error:'
    );
  }
}

export async function registerQuoteRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/quotes', listQuotesRoute);
  fastify.post<{ Body: z.infer<typeof QuoteCreateSchema> }>('/api/v1/quotes', createQuoteRoute);
  fastify.get<{ Params: { id: string } }>('/api/v1/quotes/:id', getQuoteRoute);
  fastify.patch<{ Params: { id: string }; Body: z.infer<typeof QuoteUpdateSchema> }>(
    '/api/v1/quotes/:id',
    updateQuoteRoute
  );
  fastify.delete<{ Params: { id: string } }>('/api/v1/quotes/:id', deleteQuoteRoute);
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/quotes/:id/price-list',
    getQuotePriceListRoute
  );
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/quotes/:id/proposal.pdf',
    getQuoteProposalPdfRoute
  );
  fastify.post<{ Params: { id: string }; Body: z.infer<typeof AddEstimateSchema> }>(
    '/api/v1/quotes/:id/estimates',
    addEstimateToQuoteRoute
  );
  fastify.post<{
    Params: { id: string; estimateId: string };
    Body: z.infer<typeof DuplicateEstimateSchema>;
  }>('/api/v1/quotes/:id/estimates/:estimateId/duplicate', duplicateEstimateOnQuoteRoute);
}
