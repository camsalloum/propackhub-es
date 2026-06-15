import fs from 'fs/promises';
import path from 'path';
import { calculateEstimate } from '@es/engine';

async function run() {
  // Minimal sample data to exercise the proposal template and PDF path
  const sampleEstimate: any = {
    id: 'sample-1',
    tenantId: 'tenant-sample',
    customerId: 'customer-sample',
    jobName: 'Sample Proposal Job',
    status: 'draft',
    layers: [
      { id: 'l1', materialId: 'm1', micron: 30, position: 0 },
      { id: 'l2', materialId: 'm2', micron: 50, position: 1 },
      { id: 'l3', materialId: 'm3', micron: 20, position: 2 },
    ],
    dimensions: { productType: 'roll', printingWebClass: 'wide_web' },
    markupPercent: 15,
    platesPerKg: 0,
    deliveryPerKg: 0,
    processes: [],
    slabs: [ { quantityKg: 1000, pricePerKg: 12.48 }, { quantityKg: 2000, pricePerKg: 11.9 } ],
    displayCurrencyCode: 'AED',
    exchangeRateUsdToDisplay: 1,
    orderQuantityKg: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const materials = new Map<string, any>([
    ['m1', { id: 'm1', name: 'PE Film', type: 'substrate', solidPercent: 100, density: 0.92, costPerKgUsd: 1.2, wastePercent: 0 }],
    ['m2', { id: 'm2', name: 'Ink SB', type: 'ink', solidPercent: 30, density: 0.9, costPerKgUsd: 5.5, wastePercent: 5 }],
    ['m3', { id: 'm3', name: 'Adhesive', type: 'adhesive', solidPercent: 100, density: 0.95, costPerKgUsd: 2.0, wastePercent: 0 }],
  ]);

  // Use calculation engine
  const result = calculateEstimate(sampleEstimate as any, materials as any);

  // Simple PRD-style HTML (same structure as server template) — minimal copy for local testing
  const laminateSvg = (() => {
    const layers = sampleEstimate.layers;
    const total = layers.reduce((s: number, l: any) => s + (l.micron || 0), 0) || 1;
    const rects = layers.map((l: any, i: number) => {
      const h = Math.max(4, (l.micron / total) * 200);
      const y = layers.slice(0, i).reduce((s: number, p: any) => s + Math.max(4, (p.micron / total) * 200), 0);
      return `<rect x="0" y="${y}" width="200" height="${h}" fill="#${(Math.abs(hashCode(l.materialId))%0xFFFFFF).toString(16).padStart(6,'0')}" />`;
    }).join('\n');
    return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
  })();

  function hashCode(str: string) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i) | 0;
    return h;
  }

  const slabRows = sampleEstimate.slabs.map((s: any) => `<tr><td>${s.quantityKg}</td><td>${s.pricePerKg}</td><td>${(s.quantityKg*s.pricePerKg).toFixed(2)}</td></tr>`).join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Sample Proposal</title><style>body{font-family:Arial;padding:20px}</style></head><body>
  <h1>${sampleEstimate.jobName}</h1>
  <div>${laminateSvg}</div>
  <h3>Slabs</h3>
  <table border="1" cellpadding="6"><thead><tr><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${slabRows}</tbody></table>
</body></html>`;

  const outDir = path.join(process.cwd(), 'tmp');
  await fs.mkdir(outDir, { recursive: true });

  // Try Puppeteer
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    const outPath = path.join(outDir, 'proposal-sample.pdf');
    await fs.writeFile(outPath, pdf);
    console.log('Wrote PDF to', outPath);
  } catch (err) {
    const outPath = path.join(outDir, 'proposal-sample.html');
    await fs.writeFile(outPath, html);
    console.log('Puppeteer not available — wrote HTML to', outPath);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
