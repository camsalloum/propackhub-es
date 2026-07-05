import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { schema } from '../db';
import { usdToDisplay, slabsUsdToDisplay } from '../utils/currency';
import { getEffectiveProfile } from '../utils/visibility';
import type { VisibilityProfile } from '@es/engine';
import {
  renderBrandedPdfKitProposal,
  renderMultiSkuProposalPdf,
  type MultiSkuEstimateSection,
} from '../utils/pdf-proposal-kit';
import { structureIsPrinted, wasteBandsForPrintMode, plainCormFromPrinted } from '@es/engine';
import {
  getPlatformWasteBandsByPrintMode,
  getPlatformCormScaleWithWaste,
} from '../db/platform-master-data';
import { calculateEstimateFromRows } from '../utils/estimate-engine-input';
import { cormDisplayPerKgToEngineUsd } from '../utils/currency';
import {
  buildStructureSummary,
  developmentTotalDisplay,
} from './quote-helpers';

type Db = ReturnType<typeof import('../db').getDatabase>;

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
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i) | 0;
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
  const [estimate] = await db
    .select()
    .from(schema.estimates)
    .where(and(eq(schema.estimates.id, estimateId), eq(schema.estimates.tenantId, tenantId)));

  if (!estimate) {
    throw new Error('Estimate not found');
  }

  const profile = await getUserVisibilityProfile(db, userId);
  if (!profile.proposalPdf) {
    throw new Error('Proposal PDF is not available for this user');
  }

  const layers = await db
    .select()
    .from(schema.layers)
    .where(eq(schema.layers.estimateId, estimateId))
    .orderBy(schema.layers.position);

  const materials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  const processes = await db
    .select()
    .from(schema.processes)
    .where(eq(schema.processes.estimateId, estimateId));

  const slabs = await db
    .select()
    .from(schema.slabs)
    .where(eq(schema.slabs.estimateId, estimateId))
    .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

  const materialTypeById = new Map(materials.map((m) => [m.id, m.type]));
  const printMode = structureIsPrinted(
    layers.map((l) => ({ type: materialTypeById.get(l.materialId) ?? null }))
  )
    ? 'printed'
    : 'plain';
  const [wasteBandsByMode, cormScaleWithWaste, tenantRow] = await Promise.all([
    getPlatformWasteBandsByPrintMode(),
    getPlatformCormScaleWithWaste(),
    db
      .select({ operatingCostMethod: schema.tenants.operatingCostMethod })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .then((rows) => rows[0]),
  ]);
  const wasteBands = wasteBandsForPrintMode(wasteBandsByMode, printMode);
  const fx = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;
  const cormPrinted = estimate.cormPerKgUsd != null ? parseFloat(estimate.cormPerKgUsd) : 0;
  const cormPlain =
    estimate.cormPerKgPlain != null
      ? parseFloat(estimate.cormPerKgPlain)
      : plainCormFromPrinted(cormPrinted);
  const cormDisplay = printMode === 'printed' ? cormPrinted : cormPlain;

  const result = calculateEstimateFromRows({
    estimate,
    tenantId,
    layers,
    materials,
    processes,
    slabs,
    wasteBands,
    cormScaleWithWaste,
    operatingCostMethod: tenantRow?.operatingCostMethod ?? 'markup_over_rm',
    cormPerKgUsd: cormDisplayPerKgToEngineUsd(cormDisplay, fx),
  });

  const fxRate = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;
  const saleDisplay = usdToDisplay(
    result.estimate.salePricePerKg || parseFloat(estimate.salePricePerKg || '0'),
    fxRate
  );
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

/**
 * Structured multi-SKU quote PDF (§4.8).
 * Re-applies visibility gating for cost and development fields (does not rely on JSON strip alone).
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

  const materials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, tenantId));

  const [wasteBandsByMode, cormScaleWithWaste, tenant] = await Promise.all([
    getPlatformWasteBandsByPrintMode(),
    getPlatformCormScaleWithWaste(),
    db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .then((rows) => rows[0]),
  ]);

  const customerName = quote.customerId
    ? (
        await db
          .select({ companyName: schema.customers.companyName })
          .from(schema.customers)
          .where(eq(schema.customers.id, quote.customerId))
      )[0]?.companyName || 'Customer'
    : 'Customer';

  const showDev = !!profile.platesPerKg;
  const showMaterialCost = !!profile.materialCostPerKg;
  const showMarkup = !!profile.markupPercent;
  const showSlabs = !!profile.slabTable;
  const showSelling = profile.sellingPrice !== false;

  const sections: MultiSkuEstimateSection[] = [];
  const separateCharges: Array<{
    skuLabel: string;
    printColorCount: number;
    costPerColor: number;
    developmentTotal: number;
    displayCurrency: string;
  }> = [];

  for (const estimate of estimates) {
    const layers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, estimate.id))
      .orderBy(schema.layers.position);

    const processes = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, estimate.id));

    const slabs = await db
      .select()
      .from(schema.slabs)
      .where(eq(schema.slabs.estimateId, estimate.id))
      .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

    const materialTypeById = new Map(materials.map((m) => [m.id, m.type]));
    const printMode = structureIsPrinted(
      layers.map((l) => ({ type: materialTypeById.get(l.materialId) ?? null }))
    )
      ? 'printed'
      : 'plain';
    const wasteBands = wasteBandsForPrintMode(wasteBandsByMode, printMode);
    const fxRate = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;
    const cormPrinted = estimate.cormPerKgUsd != null ? parseFloat(estimate.cormPerKgUsd) : 0;
    const cormPlain =
      estimate.cormPerKgPlain != null
        ? parseFloat(estimate.cormPerKgPlain)
        : plainCormFromPrinted(cormPrinted);
    const cormDisplay = printMode === 'printed' ? cormPrinted : cormPlain;

    const result = calculateEstimateFromRows({
      estimate,
      tenantId,
      layers,
      materials,
      processes,
      slabs,
      wasteBands,
      cormScaleWithWaste,
      operatingCostMethod: tenant?.operatingCostMethod ?? 'markup_over_rm',
      cormPerKgUsd: cormDisplayPerKgToEngineUsd(cormDisplay, fxRate),
    });

    const saleDisplay = showSelling
      ? usdToDisplay(
          result.estimate.salePricePerKg || parseFloat(estimate.salePricePerKg || '0'),
          fxRate
        )
      : 0;
    const slabDisplay = showSlabs ? slabsUsdToDisplay(result.slabs, fxRate) : [];
    const structureSummary = await buildStructureSummary(db, estimate.id);
    const skuLabel =
      estimate.skuLabel?.trim() || estimate.jobName || estimate.refNumber || 'Estimate';

    const devTotalStr = developmentTotalDisplay(
      estimate.printColorCount,
      estimate.costPerColor
    );
    const devTotal = devTotalStr != null ? parseFloat(devTotalStr) : null;

    if (
      showDev &&
      estimate.toolingBillingMode === 'separate' &&
      estimate.printColorCount != null &&
      estimate.costPerColor != null &&
      devTotal != null
    ) {
      separateCharges.push({
        skuLabel,
        printColorCount: estimate.printColorCount,
        costPerColor: Number(estimate.costPerColor),
        developmentTotal: devTotal,
        displayCurrency: estimate.displayCurrency,
      });
    }

    sections.push({
      skuLabel,
      specsCode: estimate.specsCode,
      brand: estimate.brand,
      structureSummary,
      productType: estimate.productType,
      displayCurrency: estimate.displayCurrency,
      saleDisplay,
      printColorCount: showDev ? estimate.printColorCount : undefined,
      developmentTotal: showDev ? devTotal : undefined,
      toolingBillingMode: showDev ? estimate.toolingBillingMode : undefined,
      materialCostDisplay: showMaterialCost
        ? usdToDisplay(result.estimate.materialCostPerKg || 0, fxRate)
        : undefined,
      markupPercent: showMarkup ? parseFloat(estimate.markupPercent) : undefined,
      slabs: slabDisplay,
    });
  }

  const statusLabel =
    quote.status === 'sent'
      ? 'Sent'
      : quote.status === 'saved'
        ? 'Saved'
        : quote.status === 'archived'
          ? 'Archived'
          : 'Draft';

  return renderMultiSkuProposalPdf({
    tenantName: tenant?.name || 'Proposal',
    primaryColor: tenant?.primaryColor || '#1a2744',
    customerName,
    quoteName: quote.name,
    quoteRef: quote.refNumber,
    quoteStatus: statusLabel,
    displayCurrency: quote.displayCurrency,
    validUntil: quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : null,
    deliveryTerm: quote.deliveryTerm,
    paymentTerms: quote.paymentTerms,
    remarks: quote.remarks,
    showMaterialCost,
    showMarkup,
    showDevelopment: showDev,
    showSelling,
    showSlabs,
    separateCharges,
    estimates: sections,
    termsAndConditions: tenant?.termsAndConditions || undefined,
    footerText: tenant?.footerText || undefined,
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
