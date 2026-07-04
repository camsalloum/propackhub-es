import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, asc, eq } from 'drizzle-orm';
import { schema } from '../db';
import { usdToDisplay, slabsUsdToDisplay } from '../utils/currency';
import { getEffectiveProfile } from '../utils/visibility';
import type { VisibilityProfile } from '@es/engine';
import { renderBrandedPdfKitProposal } from '../utils/pdf-proposal-kit';
import { calculateEstimateFromRows } from '../utils/estimate-engine-input';

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

  const result = calculateEstimateFromRows({
    estimate,
    tenantId,
    layers,
    materials,
    processes,
    slabs,
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
