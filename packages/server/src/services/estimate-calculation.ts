import { eq, and } from 'drizzle-orm';
import { calculateEstimate, type Estimate as EngineEstimate, type CalculationResult } from '@es/engine';
import { schema } from '../db';
import { usdToDisplay } from '../utils/currency';
import { buildEngineMaterialMap, type MaterialRow } from '../utils/material-map';

type Db = ReturnType<typeof import('../db').getDatabase>;

export async function calculateAndPersistEstimate(
  db: Db,
  estimateId: string,
  tenantId: string
): Promise<CalculationResult> {
  const [estimate] = await db
    .select()
    .from(schema.estimates)
    .where(and(eq(schema.estimates.id, estimateId), eq(schema.estimates.tenantId, tenantId)));

  if (!estimate) {
    throw new Error('Estimate not found');
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

  const materialMap = buildEngineMaterialMap(materials);

  const processes = await db
    .select()
    .from(schema.processes)
    .where(eq(schema.processes.estimateId, estimateId));

  const slabs = await db
    .select()
    .from(schema.slabs)
    .where(eq(schema.slabs.estimateId, estimateId))
    .orderBy(schema.slabs.quantityKg);

  type LayerRow = (typeof layers)[number];
  type ProcessRow = (typeof processes)[number];
  type SlabRow = (typeof slabs)[number];

  const estimateForEngine: EngineEstimate = {
    id: estimate.id,
    tenantId,
    customerId: estimate.customerId || undefined,
    jobName: estimate.jobName,
    status: estimate.status as EngineEstimate['status'],
    layers: layers.map((l: LayerRow) => ({
      id: l.id,
      materialId: l.materialId,
      micron: parseFloat(l.micron),
      position: l.position,
    })),
    dimensions: {
      productType: estimate.productType,
      printingWebClass: estimate.printingWebClass,
      ...(estimate.dimensions as object),
    },
    markupPercent: parseFloat(estimate.markupPercent),
    platesPerKg: parseFloat(estimate.platesPerKg),
    deliveryPerKg: parseFloat(estimate.deliveryPerKg),
    processes: processes.map((p: ProcessRow) => ({
      id: p.id,
      name: p.name,
      costPerHour: parseFloat(p.costPerHour),
      speedBasis: p.speedBasis as 'kg_per_hour' | 'm_per_min' | 'pcs_per_min',
      speedValue: parseFloat(p.speedValue),
      setupHours: parseFloat(p.setupHours),
      enabled: p.enabled,
    })),
    slabs: slabs.map((s: SlabRow) => ({
      quantityKg: parseFloat(s.quantityKg),
      pricePerKg: parseFloat(s.pricePerKg),
    })),
    displayCurrencyCode: estimate.displayCurrency,
    exchangeRateUsdToDisplay: parseFloat(estimate.exchangeRateUsdToDisplay),
    orderQuantityKg: estimate.orderQuantityKg
      ? parseFloat(estimate.orderQuantityKg)
      : slabs[0]?.quantityKg
        ? parseFloat(slabs[0].quantityKg)
        : 1000,
    solventCostPerKgUsd: estimate.solventCostPerKgUsd ? parseFloat(estimate.solventCostPerKgUsd) : undefined,
    solventRatio: estimate.solventRatio ? parseFloat(estimate.solventRatio) : undefined,
    createdAt: estimate.createdAt,
    updatedAt: estimate.updatedAt,
  };

  const result = calculateEstimate(estimateForEngine, materialMap);
  const fxRate = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;

  // Convert per‑slab USD prices to display currency and persist
  const slabsWithDisplay = result.slabs.map(slab => {
    const pricePerKgDisplay = usdToDisplay(slab.pricePerKg, fxRate);
    return {
      ...slab,
      pricePerKgDisplay,
      totalDisplay: slab.quantityKg * pricePerKgDisplay
    };
  });

  // Persist estimate aggregates
  await db
    .update(schema.estimates)
    .set({
      totalGsm: result.estimate.totalGsm?.toString(),
      totalMicron: result.estimate.totalMicron?.toString(),
      materialCostPerKg: result.estimate.materialCostPerKg?.toString(),
      salePricePerKg: result.estimate.salePricePerKg?.toString(),
      updatedAt: new Date(),
    })
    .where(eq(schema.estimates.id, estimateId));

  // Persist per‑slab prices (display currency) and collect for snapshot
  const slabSnapshots = [];
  for (let i = 0; i < slabs.length; i++) {
    const dbSlab = slabs[i];
    const calcSlab = slabsWithDisplay[i];
    await db
      .update(schema.slabs)
      .set({
        pricePerKg: calcSlab.pricePerKgDisplay.toString(),
        updatedAt: new Date()
      })
      .where(eq(schema.slabs.id, dbSlab.id));
    slabSnapshots.push({
      quantityKg: parseFloat(dbSlab.quantityKg),
      pricePerKg: calcSlab.pricePerKgDisplay,
      total: calcSlab.totalDisplay
    });
  }

  // Insert estimation cost snapshot (B4)
  await db.insert(schema.estimationCosts).values({
    estimateId: estimate.id,
    breakdownJson: JSON.stringify({
      estimate: result.estimate,
      slabs: slabSnapshots,
      costBreakdown: result.costBreakdown
    })
  });

  // Return per‑slab data to caller
  result.slabs = slabSnapshots.map(s => ({
    quantityKg: s.quantityKg,
    pricePerKg: s.pricePerKg,
    total: s.total
  }));

  return result;
}

export { buildEngineMaterialMap, type MaterialRow };
