import { eq, and } from 'drizzle-orm';
import { calculateEstimate, derivePrintingWebClass, type CalculationResult } from '@es/engine';
import { schema } from '../db';
import { buildEngineMaterialMap, type MaterialRow } from '../utils/material-map';
import { snapshotsFromMaterial, toMaterialLineageSource } from '../utils/layer-lineage';
import { getMasterDataVersion } from '../db/platform-master-data';
import { resolveOrderUnitDef } from '../db/tenant-reference-data';
import { buildEngineEstimateFromRows } from '../utils/estimate-engine-input';
import { resolveEstimateProcesses } from '../utils/estimate-processes';

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

  const layerPriceOverrides = new Map<string, number>();
  for (const layer of layers) {
    if (layer.unit_cost_snapshot_usd) {
      const override = parseFloat(layer.unit_cost_snapshot_usd);
      if (override > 0) {
        layerPriceOverrides.set(layer.materialId, override);
      }
    }
  }

  const processes = await resolveEstimateProcesses(db, estimate);

  const slabs = await db
    .select()
    .from(schema.slabs)
    .where(eq(schema.slabs.estimateId, estimateId))
    .orderBy(schema.slabs.quantityKg);

  // Manufacturing & Operating method is a tenant setting (admin-defined).
  const [tenantRow] = await db
    .select({ operatingCostMethod: schema.tenants.operatingCostMethod })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId));

  const { estimateForEngine, materialMap } = buildEngineEstimateFromRows({
    estimate,
    tenantId,
    layers,
    materials,
    processes,
    slabs,
    layerPriceOverrides,
    operatingCostMethod: tenantRow?.operatingCostMethod ?? 'markup_over_rm',
    orderQuantityUnitDef: await resolveOrderUnitDef(
      tenantId,
      estimate.orderQuantityUnit,
      (estimate.dimensions as { orderUnitMultiplier?: number } | null)?.orderUnitMultiplier
    ),
  });

  const layerRefs = layers.map((l) => ({
    materialId: layerPriceOverrides.has(l.materialId) ? l.id : l.materialId,
  }));
  estimateForEngine.dimensions.printingWebClass = derivePrintingWebClass(layerRefs, materialMap);

  const result = calculateEstimate(estimateForEngine, materialMap);

  const safe = (n: number | undefined | null): number =>
    typeof n === 'number' && Number.isFinite(n) ? n : 0;

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
        updatedAt: new Date(),
      })
      .where(eq(schema.slabs.id, dbSlab.id));
    slabSnapshots.push({
      quantityKg,
      pricePerKg: usdPrice,
      total: quantityKg * usdPrice,
    });
  }

  await db.insert(schema.estimationCosts).values({
    estimateId: estimate.id,
    breakdownJson: JSON.stringify({
      estimate: result.estimate,
      slabs: slabSnapshots,
      costBreakdown: result.costBreakdown,
    }),
  });

  result.slabs = slabSnapshots.map((s) => ({
    quantityKg: s.quantityKg,
    pricePerKg: s.pricePerKg,
    total: s.total,
  }));

  return result;
}

export { buildEngineMaterialMap, type MaterialRow };
