export interface PdfProposalInput {
  tenantName: string;
  primaryColor: string;
  customerName: string;
  jobName: string;
  refNumber: string;
  productType: string;
  displayCurrency: string;
  saleDisplay: number;
  materialCostDisplay?: number;
  markupPercent?: number;
  showMaterialCost: boolean;
  showMarkup: boolean;
  slabs: { quantityKg: number; pricePerKg: number }[];
  laminateSvg: string;
  termsAndConditions?: string;
  footerText?: string;
}

export async function renderBrandedPdfKitProposal(
  input: PdfProposalInput
): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const SVGtoPDF = (await import('svg-to-pdfkit')).default;

  const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const primary = input.primaryColor || '#1a2744';
  const pageWidth = doc.page.width;
  const margin = 36;

  // Brand header bar
  doc.rect(0, 0, pageWidth, 72).fill(primary);
  doc.fillColor('#ffffff').fontSize(18).text(input.tenantName || 'Proposal', margin, 22, { width: pageWidth - margin * 2 });
  doc.fontSize(10).text(`Proposal for ${input.customerName}`, margin, 46);

  doc.fillColor('#111111');
  let y = 88;

  doc.fontSize(22).text(input.jobName, margin, y, { width: pageWidth - margin * 2 });
  y = doc.y + 6;
  doc.fontSize(10).fillColor('#666666')
    .text(`${input.productType} · Ref ${input.refNumber} · ${new Date().toLocaleDateString()}`, margin, y);
  y = doc.y + 16;

  doc.fillColor('#111111').fontSize(12).text('Selling price / kg', margin, y);
  doc.fontSize(16).fillColor(primary).text(
    `${input.displayCurrency} ${input.saleDisplay.toFixed(2)}`,
    margin,
    y + 16
  );
  y = y + 44;

  if (input.showMaterialCost && input.materialCostDisplay != null) {
    doc.fillColor('#111111').fontSize(10).text(
      `Material cost / kg: ${input.displayCurrency} ${input.materialCostDisplay.toFixed(2)}`,
      margin,
      y
    );
    y += 16;
  }
  if (input.showMarkup && input.markupPercent != null) {
    doc.text(`Markup: ${input.markupPercent}%`, margin, y);
    y += 16;
  }

  // Laminate stack SVG
  doc.fontSize(12).fillColor('#111111').text('Laminate Stack', margin, y, { underline: true });
  y = doc.y + 8;
  try {
    SVGtoPDF(doc as any, input.laminateSvg, margin, y, { assumePt: true, width: 200 });
    y += 120;
  } catch {
    y += 8;
    doc.fontSize(9).fillColor('#666666').text('(Structure diagram unavailable in fallback renderer)', margin, y);
    y += 20;
  }

  // Slab table
  doc.fontSize(12).fillColor('#111111').text('Slab Pricing', margin, y, { underline: true });
  y = doc.y + 10;
  const colQty = margin;
  const colPrice = margin + 120;
  const colTotal = margin + 220;

  doc.fontSize(9).fillColor('#ffffff');
  doc.rect(margin, y, pageWidth - margin * 2, 18).fill(primary);
  doc.text('Qty (kg)', colQty + 4, y + 4);
  doc.text(`Price/kg (${input.displayCurrency})`, colPrice, y + 4);
  doc.text('Total', colTotal, y + 4);
  y += 22;

  doc.fillColor('#111111').fontSize(10);
  for (const s of input.slabs) {
    const qty = s.quantityKg;
    const price = s.pricePerKg || input.saleDisplay;
    const total = qty * price;
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = margin;
    }
    doc.text(String(qty), colQty, y);
    doc.text(price.toFixed(2), colPrice, y);
    doc.text(total.toFixed(2), colTotal, y);
    y += 16;
  }

  // Terms footer
  if (y > doc.page.height - 120) {
    doc.addPage();
    y = margin;
  }
  y += 12;
  doc.fontSize(11).fillColor('#111111').text('Terms & Conditions', margin, y, { underline: true });
  y = doc.y + 6;
  doc.fontSize(9).fillColor('#444444').text(
    input.termsAndConditions || 'Standard terms apply.',
    margin,
    y,
    { width: pageWidth - margin * 2 }
  );
  if (input.footerText) {
    doc.moveDown(0.5).fontSize(8).fillColor('#888888').text(input.footerText, { width: pageWidth - margin * 2 });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

/** One estimate section in a multi-SKU quote proposal (visibility already applied). */
export type MultiSkuEstimateSection = {
  skuLabel: string;
  specsCode?: string | null;
  brand?: string | null;
  structureSummary?: string;
  productType: string;
  displayCurrency: string;
  saleDisplay: number;
  printColorCount?: number | null;
  developmentTotal?: number | null;
  toolingBillingMode?: string | null;
  materialCostDisplay?: number;
  markupPercent?: number;
  slabs: { quantityKg: number; pricePerKg: number }[];
};

export type MultiSkuProposalInput = {
  tenantName: string;
  primaryColor: string;
  customerName: string;
  quoteName: string;
  quoteRef: string;
  quoteStatus: string;
  displayCurrency: string;
  validUntil?: string | null;
  deliveryTerm?: string | null;
  paymentTerms?: string | null;
  remarks?: string | null;
  showMaterialCost: boolean;
  showMarkup: boolean;
  showDevelopment: boolean;
  showSelling: boolean;
  showSlabs: boolean;
  separateCharges: Array<{
    skuLabel: string;
    printColorCount: number;
    costPerColor: number;
    developmentTotal: number;
    displayCurrency: string;
  }>;
  estimates: MultiSkuEstimateSection[];
  termsAndConditions?: string;
  footerText?: string;
};

function billingModeLabel(mode?: string | null): string {
  switch (mode) {
    case 'amortized':
      return 'Amortized in /kg';
    case 'not_billed':
      return 'Not billed';
    case 'separate':
      return 'Billed separately';
    default:
      return '—';
  }
}

/** Structured multi-SKU quote PDF (cover → summary → terms → dev charges → per-SKU → signature). */
export async function renderMultiSkuProposalPdf(
  input: MultiSkuProposalInput
): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;

  const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const primary = input.primaryColor || '#1a2744';
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const dateStr = new Date().toLocaleDateString();

  const ensureSpace = (needed: number) => {
    if (doc.y + needed > pageHeight - margin) {
      doc.addPage();
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(36);
    doc.moveDown(0.4);
    doc.fontSize(13).fillColor(primary).text(title, { underline: true });
    doc.moveDown(0.3);
    doc.fillColor('#111111');
  };

  const kv = (label: string, value: string | null | undefined) => {
    if (value == null || value === '') return;
    ensureSpace(16);
    doc.fontSize(10).fillColor('#666666').text(`${label}: `, { continued: true });
    doc.fillColor('#111111').text(value);
  };

  // —— Cover ——
  doc.rect(0, 0, pageWidth, 120).fill(primary);
  doc.fillColor('#ffffff').fontSize(22).text(input.tenantName || 'Proposal', margin, 36, {
    width: contentWidth,
  });
  doc.fontSize(11).text('Commercial proposal', margin, 68);
  doc.fontSize(10).text(dateStr, margin, 88);

  doc.fillColor('#111111');
  doc.fontSize(20).text(input.quoteName, margin, 148, { width: contentWidth });
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor('#444444').text(`Ref ${input.quoteRef} · ${input.quoteStatus}`);
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor('#111111').text(`Prepared for ${input.customerName}`);
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#666666').text(
    `${input.estimates.length} estimate${input.estimates.length === 1 ? '' : 's'} · ${input.displayCurrency}`
  );

  // —— Quote summary ——
  sectionTitle('Quote summary');
  kv('Customer', input.customerName);
  kv('Quote', input.quoteName);
  kv('Reference', input.quoteRef);
  kv('Status', input.quoteStatus);
  kv('Currency', input.displayCurrency);
  if (input.validUntil) kv('Valid until', input.validUntil);

  // —— Commercial terms ——
  sectionTitle('Commercial terms');
  kv('Delivery / incoterm', input.deliveryTerm);
  kv('Payment terms', input.paymentTerms);
  if (input.remarks) {
    ensureSpace(40);
    doc.fontSize(10).fillColor('#666666').text('Remarks:');
    doc.fontSize(10).fillColor('#111111').text(input.remarks, { width: contentWidth });
  }
  if (!input.deliveryTerm && !input.paymentTerms && !input.remarks) {
    doc.fontSize(10).fillColor('#666666').text('No commercial terms specified.');
  }

  // —— Development charges ——
  if (input.showDevelopment && input.separateCharges.length > 0) {
    sectionTitle('Development / cylinder charges');
    doc.fontSize(9).fillColor('#666666').text('Billed separately (not included in film /kg).');
    doc.moveDown(0.3);
    for (const c of input.separateCharges) {
      ensureSpace(18);
      doc
        .fontSize(10)
        .fillColor('#111111')
        .text(
          `${c.skuLabel}: ${c.printColorCount} colors × ${c.displayCurrency} ${c.costPerColor.toFixed(0)} = ${c.displayCurrency} ${c.developmentTotal.toFixed(0)}`
        );
    }
  }

  // —— Per-estimate sections ——
  for (let i = 0; i < input.estimates.length; i++) {
    const est = input.estimates[i];
    doc.addPage();

    doc.rect(0, 0, pageWidth, 48).fill(primary);
    doc
      .fillColor('#ffffff')
      .fontSize(14)
      .text(est.skuLabel, margin, 16, { width: contentWidth });

    let y = 64;
    doc.fillColor('#111111').fontSize(10);
    const meta: string[] = [];
    if (est.specsCode) meta.push(`Specs ${est.specsCode}`);
    if (est.brand) meta.push(est.brand);
    if (est.structureSummary) meta.push(est.structureSummary);
    meta.push(est.productType);
    doc.text(meta.join(' · '), margin, y, { width: contentWidth });
    y = doc.y + 10;

    if (input.showDevelopment && est.printColorCount != null) {
      const devParts = [`${est.printColorCount} colors`];
      if (est.developmentTotal != null) {
        devParts.push(`${est.displayCurrency} ${est.developmentTotal.toFixed(0)} total`);
      }
      devParts.push(billingModeLabel(est.toolingBillingMode));
      doc.fontSize(9).fillColor('#444444').text(devParts.join(' · '), margin, y);
      y = doc.y + 10;
    }

    if (input.showSelling) {
      doc.fontSize(11).fillColor('#111111').text('Selling price / kg', margin, y);
      doc
        .fontSize(16)
        .fillColor(primary)
        .text(`${est.displayCurrency} ${est.saleDisplay.toFixed(2)}`, margin, y + 14);
      y = y + 42;
    }

    if (input.showMaterialCost && est.materialCostDisplay != null) {
      doc
        .fontSize(10)
        .fillColor('#111111')
        .text(
          `Material cost / kg: ${est.displayCurrency} ${est.materialCostDisplay.toFixed(2)}`,
          margin,
          y
        );
      y += 14;
    }
    if (input.showMarkup && est.markupPercent != null) {
      doc.fontSize(10).fillColor('#111111').text(`Markup: ${est.markupPercent}%`, margin, y);
      y += 14;
    }

    y += 6;
    if (input.showSlabs && input.showSelling) {
      doc.fontSize(11).fillColor('#111111').text('Price list', margin, y, { underline: true });
      y = doc.y + 8;

      const colQty = margin;
      const colPrice = margin + 120;
      const colTotal = margin + 220;

      doc.fontSize(9).fillColor('#ffffff');
      doc.rect(margin, y, contentWidth, 18).fill(primary);
      doc.text('Qty (kg)', colQty + 4, y + 4);
      doc.text(`Price/kg (${est.displayCurrency})`, colPrice, y + 4);
      doc.text('Total', colTotal, y + 4);
      y += 22;

      doc.fillColor('#111111').fontSize(10);
      const slabs =
        est.slabs.length > 0 ? est.slabs : [{ quantityKg: 0, pricePerKg: est.saleDisplay }];
      for (const s of slabs) {
        if (y > pageHeight - 80) {
          doc.addPage();
          y = margin;
        }
        const qty = s.quantityKg;
        const price = s.pricePerKg || est.saleDisplay;
        const total = qty * price;
        doc.text(qty > 0 ? String(qty) : '—', colQty, y);
        doc.text(price.toFixed(2), colPrice, y);
        doc.text(qty > 0 ? total.toFixed(2) : '—', colTotal, y);
        y += 16;
      }
    }
  }

  // —— Final terms / signature ——
  doc.addPage();
  doc.rect(0, 0, pageWidth, 48).fill(primary);
  doc.fillColor('#ffffff').fontSize(14).text('Terms & acceptance', margin, 16);

  doc.fillColor('#111111');
  doc.fontSize(10).text(input.termsAndConditions || 'Standard terms apply.', margin, 64, {
    width: contentWidth,
  });

  if (input.footerText) {
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#888888').text(input.footerText, { width: contentWidth });
  }

  doc.moveDown(2);
  doc.fontSize(10).fillColor('#111111').text('Accepted by: ________________________');
  doc.moveDown(0.8);
  doc.text('Date: ________________________');
  doc.moveDown(0.8);
  doc.text('Signature: ________________________');

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}
