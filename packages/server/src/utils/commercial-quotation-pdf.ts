/**
 * Commercial quotation PDF — format-driven meta fields, aligned slab grid.
 */
import {
  fieldVisible,
  parseQuotationFormat,
  type QuotationFormatPrefs,
} from '@es/engine';
import { quotationPageOrientation } from '@es/engine';
import {
  formatExtraChargeAmount,
  type QuotationExtraCharge,
} from './quotation-extra-charges.js';

export type CommercialQuotationRow = {
  description: string;
  unit: string;
  prices: string[];
};

export type CommercialQuotationInput = {
  tenantName: string;
  primaryColor: string;
  customerName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** Customer address / notes line when format enables address */
  address?: string | null;
  quoteRef: string;
  quoteName: string;
  displayCurrency: string;
  dateStr: string;
  validUntil?: string | null;
  deliveryTerm?: string | null;
  paymentTerms?: string | null;
  rfqNumber?: string | null;
  remarks?: string | null;
  salespersonName?: string | null;
  columnHeaders: string[];
  unitLabel: string;
  rows: CommercialQuotationRow[];
  /** Dev (separate) + freight lumps — not in film $/kg */
  extraCharges?: QuotationExtraCharge[];
  termsAndConditions?: string;
  footerText?: string;
  format?: QuotationFormatPrefs | null;
};

const MARGIN = 36;
const HEADER_PLACEHOLDER_PT = 80;
const FOOTER_PLACEHOLDER_PT = 48;

function wrapLines(
  doc: { fontSize: (n: number) => unknown; widthOfString: (s: string) => number },
  text: string,
  width: number,
  fontSize: number
): string[] {
  doc.fontSize(fontSize);
  const paragraphs = String(text || '')
    .split(/\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return [''];
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(' ');
    let cur = '';
    for (const word of words) {
      const trial = cur ? `${cur} ${word}` : word;
      if (doc.widthOfString(trial) <= width) {
        cur = trial;
      } else {
        if (cur) lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines.length > 0 ? lines : [''];
}

type PdfTextDoc = {
  text: (
    text: string,
    x?: number,
    y?: number,
    options?: Record<string, unknown>
  ) => unknown;
  widthOfString: (text: string, options?: Record<string, unknown>) => number;
};

/**
 * Draw text at fixed x,y without PDFKit flow drift.
 * Align is applied manually — PDFKit's align is unreliable with lineBreak:false,
 * which was causing prices to sit left of their slab headers.
 */
function cellText(
  doc: PdfTextDoc,
  text: string,
  x: number,
  y: number,
  opts: { width: number; align?: 'left' | 'center' | 'right'; height?: number }
) {
  const align = opts.align ?? 'left';
  const tw = Math.min(doc.widthOfString(text), opts.width);
  let tx = x;
  if (align === 'right') tx = x + opts.width - tw;
  else if (align === 'center') tx = x + (opts.width - tw) / 2;
  doc.text(text, tx, y, {
    lineBreak: false,
    height: opts.height,
  });
}

export async function renderCommercialQuotationPdf(
  input: CommercialQuotationInput
): Promise<Buffer> {
  const PDFDocument = (await import('pdfkit')).default;
  const format = parseQuotationFormat(input.format);
  const show = (key: Parameters<typeof fieldVisible>[1]) => fieldVisible(format, key);

  const colCount = Math.max(1, input.columnHeaders.length);
  const orientation = quotationPageOrientation(colCount);
  const layout = orientation === 'landscape' ? 'landscape' : undefined;

  const doc = new PDFDocument({
    size: 'A4',
    layout,
    margin: MARGIN,
    autoFirstPage: true,
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));

  const pageWidth = () => doc.page.width;
  const pageHeight = () => doc.page.height;
  const contentWidth = () => pageWidth() - MARGIN * 2;

  const headerH = HEADER_PLACEHOLDER_PT;
  const footerH = FOOTER_PLACEHOLDER_PT;
  const bodyTop = () => MARGIN + headerH + 8;
  const bodyBottom = () => pageHeight() - MARGIN - footerH - 6;

  const drawChrome = () => {
    const w = contentWidth();
    doc
      .rect(MARGIN, MARGIN, w, headerH)
      .strokeColor('#94a3b8')
      .lineWidth(0.75)
      .dash(3, { space: 2 })
      .stroke()
      .undash();
    cellText(
      doc,
      `Header placeholder · ${Math.round(w)}×${headerH} pt  (uploads/branding/)`,
      MARGIN,
      MARGIN + headerH / 2 - 6,
      { width: w, align: 'center' }
    );

    const fy = pageHeight() - MARGIN - footerH;
    doc
      .rect(MARGIN, fy, w, footerH)
      .strokeColor('#94a3b8')
      .lineWidth(0.75)
      .dash(3, { space: 2 })
      .stroke()
      .undash();
    cellText(
      doc,
      `Footer placeholder · ${Math.round(w)}×${footerH} pt  (uploads/branding/)`,
      MARGIN,
      fy + footerH / 2 - 6,
      { width: w, align: 'center' }
    );
  };

  const addPageWithChrome = () => {
    doc.addPage({ size: 'A4', layout, margin: MARGIN });
    drawChrome();
  };

  drawChrome();

  const accent = input.primaryColor || '#1a2744';
  const tableHeaderColor = format.tableHeaderColor || '#3D6B9F';
  let y = bodyTop();
  const maxY = () => bodyBottom();

  const ensureSpace = (needed: number, redrawTableHeader?: () => void) => {
    if (y + needed > maxY()) {
      addPageWithChrome();
      y = bodyTop();
      redrawTableHeader?.();
    }
  };

  // —— Meta block ——
  const metaTop = y;
  const leftW = contentWidth() * 0.42;
  const rightW = contentWidth() * 0.32;
  const centerX = MARGIN + leftW;
  const rightX = pageWidth() - MARGIN - rightW;
  const lineH = 12;

  let ly = metaTop;
  doc.fontSize(9).fillColor('#111111');
  if (show('date')) {
    cellText(doc, `DATE: ${input.dateStr}`, MARGIN, ly, { width: leftW });
    ly += lineH;
  }
  if (show('customerName')) {
    cellText(doc, `M/S: ${input.customerName}`, MARGIN, ly, { width: leftW });
    ly += lineH;
  }
  if (show('attn') && input.contactName) {
    cellText(doc, `ATTN: ${input.contactName}`, MARGIN, ly, { width: leftW });
    ly += lineH;
  }
  if (show('address') && input.address) {
    const addrLines = wrapLines(doc, `ADDR: ${input.address}`, leftW, 8);
    doc.fontSize(8).fillColor('#444444');
    for (const line of addrLines) {
      cellText(doc, line, MARGIN, ly, { width: leftW });
      ly += 10;
    }
    doc.fontSize(9).fillColor('#111111');
  }
  if (show('tel') && input.contactPhone) {
    cellText(doc, `Tel: ${input.contactPhone}`, MARGIN, ly, { width: leftW });
    ly += lineH;
  }
  if (show('email') && input.contactEmail) {
    doc.fontSize(8).fillColor('#444444');
    cellText(doc, input.contactEmail, MARGIN, ly, { width: leftW });
    ly += 10;
    doc.fontSize(9).fillColor('#111111');
  }
  const leftBottom = ly;

  doc.fontSize(16).fillColor(accent);
  cellText(doc, 'QUOTATION', centerX, metaTop + 8, {
    width: contentWidth() - leftW - rightW,
    align: 'center',
  });

  let ry = metaTop;
  doc.fontSize(9).fillColor('#111111');
  if (show('quoteRef')) {
    cellText(doc, `Ref: ${input.quoteRef}`, rightX, ry, { width: rightW, align: 'right' });
    ry += lineH;
  }
  if (show('rfqNumber') && input.rfqNumber) {
    cellText(doc, `RFQ: ${input.rfqNumber}`, rightX, ry, { width: rightW, align: 'right' });
    ry += lineH;
  }
  if (show('currency')) {
    doc.fillColor('#c00');
    cellText(doc, `CURRENCY: ${input.displayCurrency}`, rightX, ry, {
      width: rightW,
      align: 'right',
    });
    ry += lineH;
    doc.fillColor('#111111');
  }
  if (show('deliveryTerm') && input.deliveryTerm) {
    cellText(doc, `Mode Of Shipment: ${input.deliveryTerm}`, rightX, ry, {
      width: rightW,
      align: 'right',
    });
    ry += lineH;
  }
  if (show('validity') && input.validUntil) {
    doc.fillColor('#c00');
    cellText(doc, `VALIDITY: ${input.validUntil}`, rightX, ry, {
      width: rightW,
      align: 'right',
    });
    ry += lineH;
    doc.fillColor('#111111');
  }
  if (show('paymentTerms') && input.paymentTerms) {
    cellText(doc, `Payment: ${input.paymentTerms}`, rightX, ry, {
      width: rightW,
      align: 'right',
    });
    ry += lineH;
  }
  if (show('salesperson') && input.salespersonName) {
    cellText(doc, `Sales: ${input.salespersonName}`, rightX, ry, {
      width: rightW,
      align: 'right',
    });
    ry += lineH;
  }

  y = Math.max(leftBottom, ry, metaTop + 40) + 10;

  if (show('quoteName') && input.quoteName) {
    ensureSpace(16);
    doc.fontSize(10).fillColor('#444444');
    cellText(doc, input.quoteName, MARGIN, y, { width: contentWidth() });
    y += 14;
  }

  if (show('remarks') && input.remarks) {
    ensureSpace(20);
    doc.fontSize(8).fillColor('#444444');
    const rLines = wrapLines(doc, `Remarks: ${input.remarks}`, contentWidth(), 8);
    for (const line of rLines) {
      cellText(doc, line, MARGIN, y, { width: contentWidth() });
      y += 10;
    }
    y += 4;
  }

  // —— Price table (fixed columns — no PDFKit flow drift) ——
  const priceCols = Math.max(1, input.columnHeaders.length);
  const descW =
    priceCols >= 6
      ? Math.min(150, contentWidth() * 0.22)
      : priceCols >= 4
        ? Math.min(180, contentWidth() * 0.28)
        : Math.min(220, contentWidth() * 0.35);
  const unitW = 28;
  const priceArea = contentWidth() - descW - unitW;
  const priceColW = priceArea / priceCols;
  const headerFont = priceCols >= 6 ? 6.5 : priceCols >= 4 ? 7 : 8;
  const priceFont = priceCols >= 6 ? 7 : 8;
  const lineGap = 1.5;

  const headerLines = input.columnHeaders.map((h) =>
    wrapLines(doc, h, Math.max(16, priceColW - 3), headerFont)
  );
  const maxHeaderLines = Math.max(1, ...headerLines.map((l) => l.length));
  const headerRowH = 8 + maxHeaderLines * (headerFont + lineGap) + 4;

  const colX = (i: number) => MARGIN + descW + unitW + i * priceColW;

  const drawTableHeader = () => {
    doc.rect(MARGIN, y, contentWidth(), headerRowH).fill(tableHeaderColor);
    doc.fillColor('#ffffff').fontSize(headerFont);
    cellText(doc, 'Description', MARGIN + 3, y + 4, { width: descW - 6 });
    doc.fontSize(6);
    cellText(doc, `${input.unitLabel} · ${input.displayCurrency}`, MARGIN + 3, y + 14, {
      width: descW - 6,
    });
    doc.fontSize(headerFont);
    cellText(doc, 'Unit', MARGIN + descW, y + 4, { width: unitW, align: 'center' });

    for (let i = 0; i < priceCols; i++) {
      const x = colX(i);
      const lines = headerLines[i] ?? [''];
      let ty = y + 4;
      for (const line of lines) {
        cellText(doc, line, x + 1, ty, { width: priceColW - 2, align: 'center' });
        ty += headerFont + lineGap;
      }
    }
    y += headerRowH + 2;
    doc.fillColor('#111111');
  };

  ensureSpace(headerRowH + 4);
  drawTableHeader();

  for (const row of input.rows) {
    const descLines = wrapLines(doc, row.description, descW - 6, priceFont);
    const rowH = Math.max(14, descLines.length * (priceFont + lineGap) + 6);

    ensureSpace(rowH + 4, () => {
      drawTableHeader();
    });

    const rowTop = y;
    doc.fontSize(priceFont).fillColor('#111111');
    let dy = rowTop + 3;
    for (const line of descLines) {
      cellText(doc, line, MARGIN + 3, dy, { width: descW - 6 });
      dy += priceFont + lineGap;
    }

    cellText(doc, row.unit, MARGIN + descW, rowTop + 3, { width: unitW, align: 'center' });

    doc.font('Helvetica-Bold');
    for (let i = 0; i < priceCols; i++) {
      // Center under slab header (same column box + align as headers)
      cellText(doc, row.prices[i] ?? '—', colX(i) + 1, rowTop + 3, {
        width: priceColW - 2,
        align: 'center',
      });
    }
    doc.font('Helvetica');

    y = rowTop + rowH;
    doc
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + contentWidth(), y)
      .strokeColor('#e5e5e5')
      .lineWidth(0.5)
      .stroke();
    y += 2;
  }

  // —— Extra charges (Dev separate + Freight) ——
  const extras = input.extraCharges ?? [];
  if (extras.length > 0) {
    y += 14;
    ensureSpace(28 + extras.length * 22);
    doc.fontSize(9).fillColor('#111111');
    cellText(doc, 'Additional charges (invoiced separately)', MARGIN, y, {
      width: contentWidth(),
    });
    y += 12;
    doc.fontSize(7).fillColor('#666666');
    cellText(
      doc,
      'Not included in film unit prices above.',
      MARGIN,
      y,
      { width: contentWidth() }
    );
    y += 12;

    const amtW = Math.min(90, contentWidth() * 0.22);
    const descExtraW = contentWidth() - amtW;
    const extraHeaderH = 16;
    doc.rect(MARGIN, y, contentWidth(), extraHeaderH).fill(tableHeaderColor);
    doc.fillColor('#ffffff').fontSize(8);
    cellText(doc, 'Description', MARGIN + 3, y + 4, { width: descExtraW - 6 });
    cellText(doc, 'Amount', MARGIN + descExtraW, y + 4, {
      width: amtW - 4,
      align: 'right',
    });
    y += extraHeaderH + 2;
    doc.fillColor('#111111');

    for (const charge of extras) {
      const titleLines = wrapLines(doc, charge.description, descExtraW - 6, 8);
      const detailLines = charge.detail
        ? wrapLines(doc, charge.detail, descExtraW - 6, 7)
        : [];
      const rowH = Math.max(
        16,
        titleLines.length * 10 + detailLines.length * 9 + 6
      );
      ensureSpace(rowH + 4);
      const rowTop = y;
      doc.fontSize(8).fillColor('#111111');
      let dy = rowTop + 3;
      for (const line of titleLines) {
        cellText(doc, line, MARGIN + 3, dy, { width: descExtraW - 6 });
        dy += 10;
      }
      if (detailLines.length > 0) {
        doc.fontSize(7).fillColor('#666666');
        for (const line of detailLines) {
          cellText(doc, line, MARGIN + 3, dy, { width: descExtraW - 6 });
          dy += 9;
        }
        doc.fillColor('#111111');
      }
      doc.font('Helvetica-Bold').fontSize(8);
      cellText(
        doc,
        formatExtraChargeAmount(charge.amount, charge.currency),
        MARGIN + descExtraW,
        rowTop + 3,
        { width: amtW - 4, align: 'right' }
      );
      doc.font('Helvetica');
      y = rowTop + rowH;
      doc
        .moveTo(MARGIN, y)
        .lineTo(MARGIN + contentWidth(), y)
        .strokeColor('#e5e5e5')
        .lineWidth(0.5)
        .stroke();
      y += 2;
    }
  }

  // —— Terms ——
  if (show('termsBlock')) {
    y += 22;
    ensureSpace(60);
    doc.fontSize(10).fillColor('#111111');
    cellText(doc, 'Terms & Conditions', MARGIN, y, { width: contentWidth() });
    // underline manually
    doc
      .moveTo(MARGIN, y + 12)
      .lineTo(MARGIN + 110, y + 12)
      .strokeColor('#111111')
      .lineWidth(0.75)
      .stroke();
    y += 16;

    const terms =
      input.termsAndConditions?.trim() ||
      [
        show('paymentTerms') && input.paymentTerms ? `Payment: ${input.paymentTerms}` : null,
        show('deliveryTerm') && input.deliveryTerm
          ? `Delivery terms: ${input.deliveryTerm}`
          : null,
        input.footerText?.trim() || null,
        'Standard terms apply.',
      ]
        .filter(Boolean)
        .join('\n');

    const tLines = wrapLines(doc, terms, contentWidth(), 8);
    ensureSpace(tLines.length * 10 + 8);
    doc.fontSize(8).fillColor('#444444');
    for (const line of tLines) {
      cellText(doc, line, MARGIN, y, { width: contentWidth() });
      y += 10;
    }
  }

  // System-generated notice (no signature block)
  y += 16;
  ensureSpace(20);
  doc.fontSize(7).fillColor('#666666');
  cellText(
    doc,
    'This is a system-generated quotation and does not require a signature.',
    MARGIN,
    y,
    { width: contentWidth(), align: 'center' }
  );

  doc.end();

  return new Promise((resolvePromise, reject) => {
    doc.on('end', () => resolvePromise(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

/** Download filename: Ref_YYYY-MM-DD[_revN].pdf */
export function quoteProposalDownloadFilename(params: {
  refNumber: string;
  date?: Date;
  versionNumber?: number | null;
}): string {
  const ref = (params.refNumber || 'quote').replace(/[^\w.-]+/g, '_');
  const d = params.date ?? new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const ver =
    params.versionNumber != null && params.versionNumber > 1
      ? `_rev${params.versionNumber}`
      : '';
  return `${ref}_${yyyy}-${mm}-${dd}${ver}.pdf`;
}
