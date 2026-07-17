import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  quoteProposalDownloadFilename,
  renderCommercialQuotationPdf,
} from '../src/utils/commercial-quotation-pdf';

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, '../uploads');
  mkdirSync(outDir, { recursive: true });

  const portrait = await renderCommercialQuotationPdf({
    tenantName: 'Interplast',
    primaryColor: '#1a2744',
    customerName: 'B.I. (Europe) Limited',
    contactName: 'Saji George',
    contactEmail: 'test@example.com',
    contactPhone: '+971 52 859 5889',
    quoteRef: 'PKG-2026-00001',
    quoteName: 'Sample quote',
    displayCurrency: 'USD',
    dateStr: '17 July 2026',
    validUntil: '10 Days',
    deliveryTerm: 'Sea',
    paymentTerms: '50% advance',
    columnHeaders: ['500–1,000', '1,000–3,000', '3,000+'],
    unitLabel: 'kg',
    rows: [
      {
        description: '2gr Instant coffee\nPET Transparent NF NB ChemTr. / Plain Aluminium / LDPE',
        unit: 'kg',
        prices: ['3.5', '3.5', '3'],
      },
    ],
    termsAndConditions: '1. Printing Plates: USD 200 per color.\n2. Payment: 50% advance.',
  });
  const name = quoteProposalDownloadFilename({
    refNumber: 'PKG-2026-00001',
    versionNumber: 2,
  });
  writeFileSync(resolve(outDir, name), portrait);
  console.log('wrote', name, portrait.length);

  const landscape = await renderCommercialQuotationPdf({
    tenantName: 'Interplast',
    primaryColor: '#1a2744',
    customerName: 'Test Co',
    quoteRef: 'Q-WIDE',
    quoteName: 'Wide slabs',
    displayCurrency: 'USD',
    dateStr: '17 July 2026',
    columnHeaders: [
      '0–80',
      '81–150',
      '151–300',
      '301–600',
      '601–1,500',
      '1,501–3,000',
      '3,001–5,000',
      '5,001–10,000',
      '10,001–20,000',
      '20,001–50,000',
      '50,001–100,000',
    ],
    unitLabel: 'kg',
    rows: [
      {
        description: '2gr — long structure wraps\nPET / Alu / LDPE',
        unit: 'kg',
        prices: ['5.39', '5.04', '4.82', '4.61', '4.41', '4.22', '4.12', '4.03', '3.94', '3.87', '3.81'],
      },
    ],
  });
  writeFileSync(resolve(outDir, 'smoke-quotation-landscape.pdf'), landscape);
  console.log('landscape bytes', landscape.length);
  // —— Extra charges demo ——
  const withExtras = await renderCommercialQuotationPdf({
    tenantName: 'Interplast',
    primaryColor: '#1a2744',
    customerName: 'B.I. (Europe) Limited',
    quoteRef: 'PKG-2026-00001',
    quoteName: 'Sample quote',
    displayCurrency: 'USD',
    dateStr: '17 July 2026',
    deliveryTerm: 'CIF',
    paymentTerms: 'Net 30',
    columnHeaders: ['500–1,000', '1,000–3,000', '3,000+'],
    unitLabel: 'kg',
    rows: [
      {
        description: '2gr\nPET Transparent NF NB ChemTr.\nPlain Aluminium Foil — 9 µm\nPE Plain Film — Commercial',
        unit: 'kg',
        prices: ['3.5', '3.5', '3'],
      },
    ],
    extraCharges: [
      {
        kind: 'development',
        skuLabel: '2gr',
        description: 'Printing plates / cylinders — 2gr',
        detail: '4 colors × USD 200',
        amount: 800,
        currency: 'USD',
      },
      {
        kind: 'freight',
        skuLabel: '2gr',
        description: 'Freight (CIF) — 2gr',
        detail: 'Invoiced separately — not included in film prices above',
        amount: 150,
        currency: 'USD',
      },
    ],
  });
  writeFileSync(resolve(outDir, 'smoke-quotation-extras.pdf'), withExtras);
  console.log('extras bytes', withExtras.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
