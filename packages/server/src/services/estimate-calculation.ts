import { eq, and, asc } from 'drizzle-orm';
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
  const materialById = new Map<string, MaterialRow>(materials.map((m: MaterialRow) => [m.id, m]));

  const processes = await db
    .select()
    .from(schema.processes)
    .where(eq(schema.processes.estimateId, estimateId));

  const slabs = await db
    .select()
    .from(schema.slabs)
    .where(eq(schema.slabs.estimateId, estimateId))
    .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

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
  const now = new Date();

  const slabsWithDisplay = result.slabs.map((slab) => {
    const pricePerKgUsd = slab.pricePerKg ?? result.estimate.salePricePerKg ?? 0;
    const pricePerKgDisplay = usdToDisplay(pricePerKgUsd, fxRate);
    return {
      ...slab,
      pricePerKg: pricePerKgUsd,
      pricePerKgDisplay,
      totalDisplay: slab.quantityKg * pricePerKgDisplay,
    };
  });

  await db
    .update(schema.estimates)
    .set({
      totalGsm: result.estimate.totalGsm?.toString(),
      totalMicron: result.estimate.totalMicron?.toString(),
      materialCostPerKg: result.estimate.materialCostPerKg?.toString(),
      salePricePerKg: result.estimate.salePricePerKg?.toString(),
      lastCalculatedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.estimates.id, estimateId));

  const calcLayerById = new Map(
    (result.estimate.layers || []).map((l) => [String(l.id), l])
  );

  for (const layer of layers) {
    const mat = materialById.get(layer.materialId);
    const calcLayer = calcLayerById.get(layer.id);
    const stale = !mat;

    await db
      .update(schema.layers)
      .set({
        gsm: calcLayer?.gsm?.toString() ?? layer.gsm,
        costPerM2: calcLayer?.costPerM2?.toString() ?? layer.costPerM2,
        materialName: mat?.name ?? layer.materialName ?? 'Unknown',
        density: mat ? mat.density : layer.density,
        solidPercent: mat ? mat.solidPercent : layer.solidPercent,
        wastePercent: mat ? mat.wastePercent : layer.wastePercent,
        costPerKgUsd: mat ? mat.costPerKgUsd : layer.costPerKgUsd,
        materialStale: stale,
        updatedAt: now,
      })
      .where(eq(schema.layers.id, layer.id));
  }

  const slabSnapshots = [];
  for (let i = 0; i < slabs.length; i++) {
    const dbSlab = slabs[i];
    const calcSlab = slabsWithDisplay[i];
    await db
      .update(schema.slabs)
      .set({
        pricePerKg: calcSlab.pricePerKgDisplay.toString(),
        sortOrder: i,
        updatedAt: now,
      })
      .where(eq(schema.slabs.id, dbSlab.id));
    slabSnapshots.push({
      quantityKg: parseFloat(dbSlab.quantityKg),
      pricePerKg: calcSlab.pricePerKgDisplay,
      total: calcSlab.totalDisplay,
    });
  }

  await db.insert(schema.estimationCosts).values({
    estimateId: estimate.id,
    computedAt: now,
    breakdownJson: {
      estimate: result.estimate,
      slabs: slabSnapshots,
      costBreakdown: result.costBreakdown,
    },
  });

  result.slabs = slabSnapshots.map((s) => ({
    quantityKg: s.quantityKg,
    pricePerKg: s.pricePerKg,
    total: s.total,
  }));

  return result;
}

export { buildEngineMaterialMap, type MaterialRow };
