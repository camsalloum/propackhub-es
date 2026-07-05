import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db';
import { schema } from '../db';
import { displayToUsd } from '../utils/currency';

export type QuoteStatus = 'draft' | 'saved' | 'sent' | 'archived';
export type ToolingBillingMode = 'amortized' | 'separate' | 'not_billed';
export type ToolingScenario = 'new' | 'existing' | 'modification';

export function normalizeToolingScenario(
  value: string | null | undefined
): ToolingScenario {
  if (value === 'existing' || value === 'modification') return value;
  return 'new';
}

/** Colors charged for plates/cylinders — separate from total print colors. */
export function resolveBillableColorCount(input: {
  toolingScenario?: ToolingScenario | string | null;
  printColorCount?: number | null;
  billableColorCount?: number | null;
}): number | null {
  const scenario = normalizeToolingScenario(input.toolingScenario);
  const printColors =
    input.printColorCount != null && Number.isFinite(Number(input.printColorCount))
      ? Math.max(0, Number(input.printColorCount))
      : null;

  if (scenario === 'existing') return 0;
  if (scenario === 'modification') {
    const raw =
      input.billableColorCount != null && Number.isFinite(Number(input.billableColorCount))
        ? Math.max(0, Number(input.billableColorCount))
        : printColors;
    if (raw == null) return null;
    return printColors != null ? Math.min(raw, printColors) : raw;
  }
  return printColors;
}

export type QuoteRow = typeof schema.quotes.$inferSelect;

/** Map estimate lifecycle status onto quote commercial status for backfill / auto-create. */
export function mapEstimateStatusToQuoteStatus(
  status: string | null | undefined
): QuoteStatus {
  switch (status) {
    case 'sent':
      return 'sent';
    case 'won':
      return 'saved';
    case 'lost':
      return 'archived';
    default:
      return 'draft';
  }
}

/**
 * BUG-11-style quote ref: PKG-YYYY-NNNNN with collision retry.
 */
export async function generateQuoteRefNumber(
  db: Database,
  tenantId: string
): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await db
      .select({ count: sql`COUNT(*)` })
      .from(schema.quotes)
      .where(
        and(
          eq(schema.quotes.tenantId, tenantId),
          isNull(schema.quotes.deletedAt),
          sql`EXTRACT(YEAR FROM ${schema.quotes.createdAt}) = ${year}`
        )
      );

    const count = Number(result[0]?.count ?? 0);
    const candidate = `PKG-${year}-${String(count + 1 + attempt).padStart(5, '0')}`;

    const clash = await db
      .select({ id: schema.quotes.id })
      .from(schema.quotes)
      .where(
        and(eq(schema.quotes.tenantId, tenantId), eq(schema.quotes.refNumber, candidate))
      )
      .limit(1);

    if (clash.length === 0) return candidate;
  }
  return `PKG-${year}-${Date.now().toString().slice(-5)}`;
}

export type CreateQuoteInput = {
  tenantId: string;
  customerId?: string | null;
  name: string;
  displayCurrency: string;
  exchangeRateUsdToDisplay: string | number;
  status?: QuoteStatus;
  deliveryTerm?: string | null;
  paymentTerms?: string | null;
  remarks?: string | null;
  notes?: string | null;
  rfqNumber?: string | null;
  validUntil?: Date | null;
  defaultBrand?: string | null;
  salespersonUserId?: string | null;
  defaultPrintColorCount?: number | null;
  defaultCostPerColor?: number | string | null;
  defaultToolingBillingMode?: ToolingBillingMode | null;
  supersedesQuoteId?: string | null;
  isPriceCheck?: boolean;
};

export async function createQuote(
  db: Database,
  input: CreateQuoteInput
): Promise<QuoteRow> {
  const refNumber = await generateQuoteRefNumber(db, input.tenantId);
  const inserted = (await db
    .insert(schema.quotes)
    .values({
      tenantId: input.tenantId,
      customerId: input.customerId ?? null,
      name: input.name,
      refNumber,
      status: input.status ?? 'draft',
      displayCurrency: input.displayCurrency,
      exchangeRateUsdToDisplay: String(input.exchangeRateUsdToDisplay),
      deliveryTerm: input.deliveryTerm ?? null,
      paymentTerms: input.paymentTerms ?? null,
      remarks: input.remarks ?? null,
      notes: input.notes ?? null,
      rfqNumber: input.rfqNumber?.trim() || null,
      validUntil: input.validUntil ?? null,
      defaultBrand: input.defaultBrand ?? null,
      salespersonUserId: input.salespersonUserId ?? null,
      defaultPrintColorCount: input.defaultPrintColorCount ?? null,
      defaultCostPerColor:
        input.defaultCostPerColor != null ? String(input.defaultCostPerColor) : null,
      defaultToolingBillingMode: input.defaultToolingBillingMode ?? null,
      supersedesQuoteId: input.supersedesQuoteId ?? null,
      isPriceCheck: input.isPriceCheck ?? false,
    })
    .returning()) as QuoteRow[];
  return inserted[0];
}

export async function loadQuoteForEstimate(
  db: Database,
  tenantId: string,
  quoteId: string | null | undefined
): Promise<QuoteRow | null> {
  if (!quoteId) return null;
  const [row] = await db
    .select()
    .from(schema.quotes)
    .where(
      and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.tenantId, tenantId),
        isNull(schema.quotes.deletedAt)
      )
    );
  return row ?? null;
}

/** Carry parent quote commercial/price-check flags when cloning into a new quote row. */
export function inheritedQuoteFieldsFromParent(
  parent: QuoteRow | null,
  sourceEstimate: { customerId?: string | null; deliveryTerm?: string | null }
): Pick<
  CreateQuoteInput,
  'isPriceCheck' | 'customerId' | 'rfqNumber' | 'paymentTerms' | 'remarks' | 'deliveryTerm'
> {
  if (parent?.isPriceCheck) {
    return {
      isPriceCheck: true,
      customerId: null,
      rfqNumber: null,
      paymentTerms: null,
      remarks: null,
      deliveryTerm: null,
    };
  }
  if (parent) {
    return {
      isPriceCheck: false,
      customerId: parent.customerId ?? sourceEstimate.customerId ?? null,
      rfqNumber: parent.rfqNumber ?? null,
      paymentTerms: parent.paymentTerms ?? null,
      remarks: parent.remarks ?? null,
      deliveryTerm: parent.deliveryTerm ?? null,
    };
  }
  return {
    isPriceCheck: false,
    customerId: sourceEstimate.customerId ?? null,
    rfqNumber: null,
    paymentTerms: null,
    remarks: null,
    deliveryTerm: sourceEstimate.deliveryTerm ?? null,
  };
}

/**
 * Derive engine tooling fields from print colors × cost per color.
 * costPerColor is display currency; toolingChargeUsd is USD at the estimate's frozen rate.
 */
export function deriveToolingFromColors(input: {
  printColorCount: number | null | undefined;
  costPerColor: number | string | null | undefined;
  toolingBillingMode: ToolingBillingMode | string | null | undefined;
  toolingScenario?: ToolingScenario | string | null | undefined;
  billableColorCount?: number | null | undefined;
  exchangeRateUsdToDisplay: number | string;
}): {
  developmentTotalDisplay: number;
  toolingChargeUsd: string;
  toolingBilledToCustomer: boolean;
  toolingBillingMode: ToolingBillingMode;
  billableColorCount: number;
} | null {
  const costPer =
    input.costPerColor != null && input.costPerColor !== ''
      ? Number(input.costPerColor)
      : null;

  const billable = resolveBillableColorCount({
    toolingScenario: input.toolingScenario,
    printColorCount: input.printColorCount,
    billableColorCount: input.billableColorCount,
  });

  if (billable == null || costPer == null || billable < 0 || costPer < 0) {
    return null;
  }

  const mode = (input.toolingBillingMode ?? 'separate') as ToolingBillingMode;
  const developmentTotalDisplay = billable * costPer;
  const rate = Number(input.exchangeRateUsdToDisplay);
  const toolingChargeUsd = displayToUsd(developmentTotalDisplay, rate);

  return {
    developmentTotalDisplay,
    toolingChargeUsd: toolingChargeUsd.toFixed(2),
    toolingBilledToCustomer: mode === 'amortized' && developmentTotalDisplay > 0,
    toolingBillingMode: mode,
    billableColorCount: billable,
  };
}

export function developmentTotalDisplay(
  printColorCount: number | null | undefined,
  costPerColor: number | string | null | undefined,
  options?: {
    toolingScenario?: ToolingScenario | string | null;
    billableColorCount?: number | null;
  }
): string | null {
  if (costPerColor == null || costPerColor === '') return null;
  const cost = Number(costPerColor);
  if (!Number.isFinite(cost)) return null;
  const billable = resolveBillableColorCount({
    toolingScenario: options?.toolingScenario,
    printColorCount,
    billableColorCount: options?.billableColorCount,
  });
  if (billable == null) return null;
  return (billable * cost).toFixed(4);
}

/** Short structure label from substrate layer grades (e.g. "BOPP Transparent / PET Metalized HB / PE White"). */
export async function buildStructureSummary(
  db: Database,
  estimateId: string
): Promise<string> {
  const rows = await db
    .select({
      materialName: schema.layers.materialName,
      materialNameSnapshot: schema.layers.material_name_snapshot,
      type: schema.materials.type,
      grade: schema.materials.substrateGrade,
      family: schema.materials.substrateFamily,
    })
    .from(schema.layers)
    .leftJoin(schema.materials, eq(schema.layers.materialId, schema.materials.id))
    .where(eq(schema.layers.estimateId, estimateId))
    .orderBy(schema.layers.position);

  const parts: string[] = [];
  for (const row of rows) {
    if (row.type && row.type !== 'substrate') continue;
    const label =
      (row.grade && String(row.grade).trim()) ||
      (row.materialNameSnapshot && String(row.materialNameSnapshot).trim()) ||
      (row.materialName && String(row.materialName).trim()) ||
      (row.family && String(row.family).trim()) ||
      '';
    if (label && !parts.includes(label)) parts.push(label);
  }
  return parts.join(' / ');
}

const SAVE_REF_MISSING_MSG =
  'One or more materials are no longer in your library. Re-select layer materials and solvent, then save again.';

/** Ensure layer + solvent material IDs still exist for this tenant before save. */
export async function validateEstimateSaveRefs(
  db: Database,
  tenantId: string,
  data: { layers?: Array<{ materialId: string }>; solventMaterialId?: string | null }
): Promise<string | null> {
  const ids = new Set<string>();
  for (const layer of data.layers ?? []) {
    if (layer.materialId) ids.add(layer.materialId);
  }
  if (data.solventMaterialId) ids.add(data.solventMaterialId);
  if (ids.size === 0) return null;

  const rows = await db
    .select({ id: schema.materials.id })
    .from(schema.materials)
    .where(
      and(eq(schema.materials.tenantId, tenantId), inArray(schema.materials.id, [...ids]))
    );

  return rows.length === ids.size ? null : SAVE_REF_MISSING_MSG;
}

export async function nextEstimateSortOrder(
  db: Database,
  quoteId: string
): Promise<number> {
  const result = await db
    .select({ max: sql`COALESCE(MAX(${schema.estimates.sortOrder}), -1)` })
    .from(schema.estimates)
    .where(
      and(eq(schema.estimates.quoteId, quoteId), isNull(schema.estimates.deletedAt))
    );
  return Number(result[0]?.max ?? -1) + 1;
}

/** Sent quotes lock child estimates (read-only until unlock or re-quote). */
export function isQuoteLocked(
  quote: { status?: string | null; sentAt?: Date | string | null } | null | undefined
): boolean {
  if (!quote) return false;
  return quote.status === 'sent' || quote.sentAt != null;
}

/**
 * Promote draft → saved when every child estimate is non-draft.
 * Never auto-sets `sent` (explicit commercial action) or touches archived quotes.
 */
export async function syncQuoteStatusFromEstimates(
  db: Database,
  quoteId: string,
  tenantId: string
): Promise<QuoteRow | null> {
  const [quote] = (await db
    .select()
    .from(schema.quotes)
    .where(
      and(
        eq(schema.quotes.id, quoteId),
        eq(schema.quotes.tenantId, tenantId),
        isNull(schema.quotes.deletedAt)
      )
    )) as QuoteRow[];

  if (!quote || quote.status === 'sent' || quote.status === 'archived') {
    return quote ?? null;
  }

  const estimates = await db
    .select({ status: schema.estimates.status })
    .from(schema.estimates)
    .where(
      and(
        eq(schema.estimates.quoteId, quoteId),
        eq(schema.estimates.tenantId, tenantId),
        isNull(schema.estimates.deletedAt)
      )
    );

  if (estimates.length === 0) return quote;

  const hasDraft = estimates.some((e) => e.status === 'draft');
  const allSaved = estimates.every((e) => e.status !== 'draft');

  if (hasDraft && quote.status === 'saved') {
    const [updated] = (await db
      .update(schema.quotes)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(and(eq(schema.quotes.id, quoteId), eq(schema.quotes.tenantId, tenantId)))
      .returning()) as QuoteRow[];
    return updated ?? quote;
  }

  if (!allSaved || quote.status === 'saved') return quote;

  const [updated] = (await db
    .update(schema.quotes)
    .set({ status: 'saved', updatedAt: new Date() })
    .where(and(eq(schema.quotes.id, quoteId), eq(schema.quotes.tenantId, tenantId)))
    .returning()) as QuoteRow[];

  return updated ?? quote;
}
