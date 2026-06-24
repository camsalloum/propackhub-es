import { eq, and } from 'drizzle-orm';
import { calculateEstimate, type Estimate as EngineEstimate, type CalculationResult, derivePrintingWebClass } from '@es/engine';
import { schema } from '../db';
import { buildEngineMaterialMap, type MaterialRow } from '../utils/material-map';
import { snapshotsFromMaterial, toMaterialLineageSource } from '../utils/layer-lineage';
import { getMasterDataVersion } from '../db/platform-master-data';

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

  // Apply per-layer price overrides: if a layer has unit_cost_snapshot_usd set by the user,
  // clone that material entry with the overridden price so the engine uses it.
  const layerPriceOverrides = new Map<string, number>(); // materialId → override price
  for (const layer of layers) {
    if (layer.unit_cost_snapshot_usd) {
      const override = parseFloat(layer.unit_cost_snapshot_usd);
      if (override > 0) {
        layerPriceOverrides.set(layer.materialId, override);
      }
    }
  }
  // Build patched material map: override costPerKgUsd per-layer
  // Since multiple layers may use the same materialId with different overrides,
  // we build per-layer virtual IDs (layer.id → material)
  const patchedMaterialMap = new Map(materialMap);
  for (const layer of layers) {
    const override = layerPriceOverrides.get(layer.materialId);
    if (override != null) {
      const base = materialMap.get(layer.materialId);
      if (base) {
        // Use layer.id as the virtual material key so each layer gets its own price
        patchedMaterialMap.set(layer.id, { ...base, costPerKgUsd: override });
      }
    }
  }

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

  const layerRefs = layers.map((l: LayerRow) => ({ materialId: l.materialId }));
  const derivedPrintingWebClass = derivePrintingWebClass(layerRefs, patchedMaterialMap);

  const estimateForEngine: EngineEstimate = {
    id: estimate.id,
    tenantId,
    customerId: estimate.customerId || undefined,
    jobName: estimate.jobName,
    status: estimate.status as EngineEstimate['status'],
    layers: layers.map((l: LayerRow) => ({
      id: l.id,
      // Use the virtual per-layer material ID if a price override exists, otherwise real ID
      materialId: layerPriceOverrides.has(l.materialId) ? l.id : l.materialId,
      micron: parseFloat(l.micron),
      position: l.position,
    })),
    dimensions: {
      productType: estimate.productType,
      printingWebClass: derivedPrintingWebClass,
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

  const result = calculateEstimate(estimateForEngine, patchedMaterialMap);
  const fxRate = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;

  // Sanitize engine outputs: a degenerate estimate (e.g. all-zero µ) can yield
  // NaN/Infinity. Persisting "NaN" into a numeric column corrupts the row, so we
  // coerce non-finite values to 0 before any DB write.
  const safe = (n: number | undefined | null): number =>
    typeof n === 'number' && Number.isFinite(n) ? n : 0;

  // Persist layer snapshots — material name, cost, stable keys at calculation time
  // Always snapshot from the real material (for lineage), but record the effective price used
  for (const layer of layers) {
    const mat = materials.find((m: MaterialRow) => m.id === layer.materialId);
    const override = layerPriceOverrides.get(layer.materialId);
    if (mat) {
      const effectiveCost = override != null ? String(override) : mat.costPerKgUsd;
      await db
        .update(schema.layers)
        .set({
          ...snapshotsFromMaterial(toMaterialLineageSource(mat)),
          unit_cost_snapshot_usd: effectiveCost,
        })
        .where(eq(schema.layers.id, layer.id));
    }
  }

  const masterDataVersion = await getMasterDataVersion();

  // Persist estimate aggregates (B4)
  await db
    .update(schema.estimates)
    .set({
      totalGsm: safe(result.estimate.totalGsm).toString(),
      totalMicron: safe(result.estimate.totalMicron).toString(),
      materialCostPerKg: safe(result.estimate.materialCostPerKg).toString(),
      salePricePerKg: safe(result.estimate.salePricePerKg).toString(),
      masterDataVersion,
      updatedAt: new Date(),
    })
    .where(eq(schema.estimates.id, estimateId));

  // Persist per‑slab prices in CANONICAL USD. Display-currency conversion is the
  // responsibility of the API/PDF boundary (web `usdToDisplay`, `slabsUsdToDisplay`).
  // Storing display values here caused an FX double-conversion on reload (SC-1).
  const slabSnapshots = [];
  for (let i = 0; i < slabs.length; i++) {
    const dbSlab = slabs[i];
    const calcSlab = result.slabs[i];
    const usdPrice = safe(calcSlab?.pricePerKg);
    const quantityKg = parseFloat(dbSlab.quantityKg);
    await db
      .update(schema.slabs)
      .set({
        pricePerKg: usdPrice.toString(),
        updatedAt: new Date()
      })
      .where(eq(schema.slabs.id, dbSlab.id));
    slabSnapshots.push({
      quantityKg,
      pricePerKg: usdPrice,
      total: quantityKg * usdPrice
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
