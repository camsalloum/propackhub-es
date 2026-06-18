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
