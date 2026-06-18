declare module 'svg-to-pdfkit' {
  import type PDFDocument from 'pdfkit';

  export default function SVGtoPDF(
    doc: PDFDocument,
    svg: string,
    x: number,
    y: number,
    options?: { assumePt?: boolean; width?: number; height?: number }
  ): void;
}
