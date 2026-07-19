import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, asc, eq, isNull } from 'drizzle-orm';
import {
  DEFAULT_CORM_SCALE_WITH_WASTE,
  plainCormFromPrinted,
  parseQuotationFormat,
  wasteBandsForPrintMode,
  type CommercialRoundingPrefs,
  type VisibilityProfile,
} from '@es/engine';
import { schema } from '../db';
import {
  getPlatformCormScaleWithWaste,
  getPlatformWasteBandsByPrintMode,
} from '../db/platform-master-data';
import { usdToDisplay, slabsUsdToDisplay } from '../utils/currency';
import { getEffectiveProfile } from '../utils/visibility';
import { renderBrandedPdfKitProposal } from '../utils/pdf-proposal-kit';
import { renderCommercialQuotationPdf } from '../utils/commercial-quotation-pdf';
import {
  quotationColumnHeaders,
  quotationPricesForRow,
  type QuotationMatrixInput,
  type QuotationPriceUnit,
} from '../utils/quotation-matrix';
import { buildStructureSummary, resolveBillableColorCount } from './quote-helpers';
import { calculateEstimateFromDatabase } from './estimate-calculation';
import { formatCustomerAddress } from '../utils/customer-address';
import { collectQuotationExtraCharges } from '../utils/quotation-extra-charges';

type Db = ReturnType<typeof import('../db').getDatabase>;

const UNIT_LABELS: Record<QuotationPriceUnit, string> = {
  kg: 'kg',
  m2: 'm²',
  lm: 'LM',
  roll: 'roll',
  pc: 'pc',
  kpcs: 'Kpcs',
};

type StoredPrefs = {
  v?: number;
  unit?: QuotationPriceUnit;
  currency?: string;
  slabMode?: 'predefined' | 'custom';
  selectedBandKeys?: string[];
  customSlabs?: number[];
  rounding?: CommercialRoundingPrefs;
};

async function getUserVisibilityProfile(db: Db, userId: string): Promise<VisibilityProfile> {
  const [userRecord] = await db
    .select({ visibilityProfile: schema.users.visibilityProfile, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return getEffectiveProfile(userRecord?.role, userRecord?.visibilityProfile);
}

function proposalsDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../uploads/proposals');
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h;
}

function laminateSvgFromLayers(
  layers: Array<{ materialId: string; micron: string | number }>
): string {
  const total =
    layers.reduce((s, l) => s + (parseFloat(String(l.micron)) || 0), 0) || 1;
  const rects = layers
    .map((l, i) => {
      const h = Math.max(4, (parseFloat(String(l.micron)) / total) * 200);
      const y = layers
        .slice(0, i)
        .reduce(
          (s, p) => s + Math.max(4, (parseFloat(String(p.micron)) / total) * 200),
          0
        );
      return `<rect x="0" y="${y}" width="200" height="${h}" fill="#${(Math.abs(hashCode(l.materialId)) % 0xffffff).toString(16).padStart(6, '0')}" />`;
    })
    .join('\n');
  return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

/** Build proposal PDF bytes for an estimate (pdfkit fallback path). */
export async function buildProposalPdfBuffer(
  db: Db,
  estimateId: string,
  tenantId: string,
  userId: string
): Promise<Buffer> {
  const profile = await getUserVisibilityProfile(db, userId);
  if (!profile.proposalPdf) {
    throw new Error('Proposal PDF is not available for this user');
  }

  const { result, estimate, layers } = await calculateEstimateFromDatabase(
    db,
    estimateId,
    tenantId
  );

  const fxRate = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;
  const saleRaw = usdToDisplay(
    result.estimate.salePricePerKg || parseFloat(estimate.salePricePerKg || '0'),
    fxRate
  );
  const saleDisplay = Number.isFinite(saleRaw) ? saleRaw : 0;
  const slabDisplay = slabsUsdToDisplay(result.slabs, fxRate);

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));

  const customerName = estimate.customerId
    ? (
        await db
          .select({ companyName: schema.customers.companyName })
          .from(schema.customers)
          .where(eq(schema.customers.id, estimate.customerId))
      )[0]?.companyName || 'Customer'
    : 'Customer';

  return renderBrandedPdfKitProposal({
    tenantName: tenant?.name || 'Proposal',
    primaryColor: tenant?.primaryColor || '#1a2744',
    customerName,
    jobName: estimate.jobName,
    refNumber: estimate.refNumber || '',
    productType: estimate.productType,
    displayCurrency: estimate.displayCurrency,
    saleDisplay,
    materialCostDisplay: profile.materialCostPerKg
      ? usdToDisplay(result.estimate.materialCostPerKg || 0, fxRate)
      : undefined,
    markupPercent: profile.markupPercent ? parseFloat(estimate.markupPercent) : undefined,
    showMaterialCost: !!profile.materialCostPerKg,
    showMarkup: !!profile.markupPercent,
    slabs: slabDisplay,
    laminateSvg: laminateSvgFromLayers(layers),
    termsAndConditions: tenant?.termsAndConditions || undefined,
    footerText: tenant?.footerText || undefined,
  });
}

function parseDims(raw: unknown): { reelWidthMm: number; rollLengthLm: number } {
  const d = (raw ?? {}) as Record<string, unknown>;
  return {
    reelWidthMm: parseFloat(String(d.reelWidthMm ?? d.RW ?? 0)) || 0,
    rollLengthLm: parseFloat(String(d.rollLengthLm ?? d.rollLength ?? 0)) || 0,
  };
}

/**
 * Commercial multi-SKU quotation PDF — price list prefs + rounding + letterhead chrome.
 */
export async function buildQuoteProposalPdfBuffer(
  db: Db,
  quoteId: string,
  tenantId: string,
  userId: string
): Promise<Buffer> {
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

  if (!quote) {
    throw new Error('Quote not found');
  }

  const profile = await getUserVisibilityProfile(db, userId);
  if (!profile.proposalPdf) {
    throw new Error('Proposal PDF is not available for this user');
  }

  const estimates = await db
    .select()
    .from(schema.estimates)
    .where(
      and(
        eq(schema.estimates.quoteId, quoteId),
        eq(schema.estimates.tenantId, tenantId),
        isNull(schema.estimates.deletedAt)
      )
    )
    .orderBy(asc(schema.estimates.sortOrder), asc(schema.estimates.createdAt));

  if (estimates.length === 0) {
    throw new Error('Quote has no estimates');
  }

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));

  const customer = quote.customerId
    ? (
        await db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.id, quote.customerId))
      )[0]
    : null;

  const prefs = (quote.priceListDisplayPrefs ?? {}) as StoredPrefs;
  const unit: QuotationPriceUnit = prefs.unit ?? 'kg';
  const currency = prefs.currency || quote.displayCurrency || 'USD';
  const slabMode = prefs.slabMode ?? 'predefined';
  let selectedBandKeys = [...(prefs.selectedBandKeys ?? [])];
  const customSlabs = prefs.customSlabs ?? [];
  const rounding: CommercialRoundingPrefs = prefs.rounding ?? {
    enabled: false,
    mode: 'step',
    step: 0.05,
  };

  const [wasteBandsByMode, cormScaleWithWaste] = await Promise.all([
    getPlatformWasteBandsByPrintMode(),
    getPlatformCormScaleWithWaste(),
  ]);

  const [tenantOp] = await db
    .select({ operatingCostMethod: schema.tenants.operatingCostMethod })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));

  const defaultBands = wasteBandsForPrintMode(wasteBandsByMode, 'printed');
  if (slabMode === 'predefined' && selectedBandKeys.length === 0) {
    selectedBandKeys = defaultBands.slice(0, 3).map((b) => `${b.minKg}:${b.maxKg ?? 'open'}`);
  }

  const effectiveMode =
    slabMode === 'custom' && customSlabs.length > 0 ? 'custom' : 'predefined';

  const columnHeaders = quotationColumnHeaders({
    slabMode: effectiveMode,
    selectedBandKeys,
    customSlabs,
    unit,
    wasteBands: defaultBands,
  });

  const rows: Array<{ description: string; unit: string; prices: string[] }> = [];

  for (const estimate of estimates) {
    const { result } = await calculateEstimateFromDatabase(db, estimate.id, tenantId);
    const structureSummary = await buildStructureSummary(db, estimate.id);
    const skuLabel =
      estimate.skuLabel?.trim() || estimate.jobName || estimate.refNumber || 'Estimate';
    const structureLines = structureSummary
      ? structureSummary
          .split(/\s*\/\s*/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const description =
      structureLines.length > 0 ? `${skuLabel}\n${structureLines.join('\n')}` : skuLabel;

    const wastePrintMode =
      (result.estimate.layers ?? []).length > 1 ? 'printed' : 'plain';
    const wasteBands = wasteBandsForPrintMode(wasteBandsByMode, wastePrintMode);

    const dims = parseDims(estimate.dimensions);
    const fx = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;
    const ce = result.estimate;
    const cormPrinted =
      estimate.cormPerKgUsd != null ? parseFloat(String(estimate.cormPerKgUsd)) || 0 : 0;
    const cormPlainRaw =
      estimate.cormPerKgPlain != null ? parseFloat(String(estimate.cormPerKgPlain)) || 0 : 0;
    const baseCormDisplay =
      wastePrintMode === 'printed'
        ? cormPrinted
        : cormPlainRaw > 0
          ? cormPlainRaw
          : plainCormFromPrinted(cormPrinted);

    const matrixInput: QuotationMatrixInput = {
      wasteBands,
      materialPerKgUsd: ce.materialCostPerKg ?? 0,
      logisticsPerKgUsd: ce.logisticsCostPerKg ?? 0,
      developmentPerKgUsd: ce.developmentCostPerKg ?? 0,
      accessoryPerKgUsd: ce.accessoryCostPerKg ?? 0,
      pricingMethod:
        (estimate.pricingMethod as 'markup' | 'margin_per_kg' | null) ?? 'markup',
      markupPercent: parseFloat(String(estimate.markupPercent)) || 15,
      marginValuePerKgDisplay: parseFloat(String(estimate.marginValuePerKgUsd)) || 0,
      estimateFxRate: fx,
      totalGsm: ce.totalGsm ?? (parseFloat(String(estimate.totalGsm ?? 0)) || 0),
      piecesPerKg: ce.piecesPerKg && ce.piecesPerKg > 0 ? ce.piecesPerKg : null,
      lmPerKgReel: ce.linearMPerKgReel && ce.linearMPerKgReel > 0 ? ce.linearMPerKgReel : null,
      reelWidthMm: dims.reelWidthMm,
      rollLengthLm: dims.rollLengthLm,
      operatingCostMethod: tenantOp?.operatingCostMethod as
        | 'process_per_kg'
        | 'markup_over_rm'
        | 'fixed_per_group'
        | undefined,
      baseCormDisplay,
      cormScaleWithWaste: cormScaleWithWaste ?? DEFAULT_CORM_SCALE_WITH_WASTE,
      moqKg: estimate.moqKg != null ? parseFloat(String(estimate.moqKg)) || null : null,
    };

    const prices = quotationPricesForRow({
      input: matrixInput,
      unit,
      currency,
      slabMode: effectiveMode,
      selectedBandKeys,
      customSlabs,
      rounding,
    });

    rows.push({
      description,
      unit: UNIT_LABELS[unit],
      prices,
    });
  }

  const extraCharges = collectQuotationExtraCharges(estimates, {
    quoteDeliveryTerm: quote.deliveryTerm,
    billableColorCount: (e) =>
      resolveBillableColorCount({
        toolingScenario: e.toolingScenario,
        printColorCount: e.printColorCount,
        billableColorCount: e.billableColorCount,
      }),
  });

  const validityLabel = quote.validUntil
    ? new Date(quote.validUntil).toLocaleDateString()
    : null;

  let salespersonName: string | null = null;
  if (quote.salespersonUserId) {
    const [sp] = await db
      .select({ displayName: schema.users.displayName })
      .from(schema.users)
      .where(eq(schema.users.id, quote.salespersonUserId));
    salespersonName = sp?.displayName ?? null;
  }

  const format = parseQuotationFormat(tenant?.quotationFormat);

  return renderCommercialQuotationPdf({
    tenantName: tenant?.name || 'Proposal',
    primaryColor: tenant?.primaryColor || '#1a2744',
    customerName: customer?.companyName || 'Customer',
    contactName: customer?.contactName,
    contactEmail: customer?.email,
    contactPhone: customer?.phone,
    address: formatCustomerAddress(customer ?? {}),
    quoteRef: quote.refNumber,
    quoteName: quote.name,
    displayCurrency: currency,
    dateStr: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    validUntil: validityLabel,
    deliveryTerm: quote.deliveryTerm,
    paymentTerms: quote.paymentTerms,
    rfqNumber: quote.rfqNumber,
    remarks: quote.remarks,
    salespersonName,
    columnHeaders,
    unitLabel: UNIT_LABELS[unit],
    rows,
    extraCharges,
    termsAndConditions: quote.termsAndConditions?.trim() || undefined,
    /** Tenant Settings → Quotation notice (optional); empty → default sentence */
    quotationNotice: tenant?.footerText?.trim() || null,
    format,
  });
}

export function saveProposalPdf(tenantId: string, proposalId: string, buffer: Buffer): string {
  const dir = resolve(proposalsDir(), tenantId);
  mkdirSync(dir, { recursive: true });
  const absolutePath = resolve(dir, `${proposalId}.pdf`);
  writeFileSync(absolutePath, buffer);
  return `proposals/${tenantId}/${proposalId}.pdf`;
}

export function readStoredProposalPdf(relativePath: string): Buffer | null {
  const here = dirname(fileURLToPath(import.meta.url));
  const absolute = resolve(here, '../../uploads', relativePath);
  if (!existsSync(absolute)) return null;
  return readFileSync(absolute);
}
