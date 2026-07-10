import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Database } from '../db';
import { schema } from '../db';
import { getMasterDataVersion } from '../db/platform-master-data';
import { buildLayerInsertValues, toMaterialLineageSource } from '../utils/layer-lineage';
import { generateRefNumber } from '../utils/ref-numbers';
import { deriveToolingFromColors, type ToolingBillingMode, type ToolingScenario } from './quote-helpers';
import { insertEstimateProcess, loadRawEstimateProcesses } from '../utils/estimate-processes';

type EstimateRow = typeof schema.estimates.$inferSelect;
type LayerRow = typeof schema.layers.$inferSelect;
type MaterialRow = typeof schema.materials.$inferSelect;

export type CloneEstimateOptions = {
  tenantId: string;
  quoteId: string;
  customerId?: string | null;
  jobName?: string;
  skuLabel?: string | null;
  notes?: string | null;
  brand?: string | null;
  specsCode?: string | null;
  printColorCount?: number | null;
  costPerColor?: number | string | null;
  toolingBillingMode?: ToolingBillingMode | string | null;
  toolingScenario?: ToolingScenario | string | null;
  billableColorCount?: number | null;
  sortOrder?: number;
  /** Re-quote lineage (fresh commercial version). */
  sourceEstimationId?: string | null;
  /** Same-quote duplicate lineage. */
  copiedFromEstimateId?: string | null;
  /**
   * true = refresh layer cost snapshots from library (re-quote).
   * false = keep source unit_cost_snapshot_usd (duplicate).
   */
  refreshMaterialPrices: boolean;
  displayCurrency: string;
  exchangeRateUsdToDisplay: string;
  status?: 'draft' | 'sent' | 'won' | 'lost';
  /** When true, copy sale/material totals from source (duplicate frozen display). */
  copyCalculatedTotals?: boolean;
};

export type CloneEstimateResult = {
  estimate: EstimateRow;
  sourceLayers: LayerRow[];
};

/**
 * Snapshot-clone an estimate into a target quote.
 * Shared by re-quote (new quote, refresh RM) and same-quote duplicate (keep RM snapshots).
 */
export async function cloneEstimate(
  db: Database,
  sourceId: string,
  options: CloneEstimateOptions
): Promise<CloneEstimateResult> {
  const [source] = await db
    .select()
    .from(schema.estimates)
    .where(
      and(
        eq(schema.estimates.id, sourceId),
        eq(schema.estimates.tenantId, options.tenantId),
        isNull(schema.estimates.deletedAt)
      )
    );

  if (!source) {
    throw new Error('Source estimate not found');
  }

  const sourceLayers = await db
    .select()
    .from(schema.layers)
    .where(eq(schema.layers.estimateId, sourceId))
    .orderBy(schema.layers.position);

  const sourceProcesses = await loadRawEstimateProcesses(db, sourceId);

  const sourceSlabs = await db
    .select()
    .from(schema.slabs)
    .where(eq(schema.slabs.estimateId, sourceId))
    .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

  const newRefNumber = await generateRefNumber(db, options.tenantId);
  const masterDataVersion = await getMasterDataVersion();

  const tenantMaterials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, options.tenantId));
  const materialById = new Map<string, MaterialRow>(
    tenantMaterials.map((m) => [m.id, m])
  );

  const printColorCount =
    options.printColorCount !== undefined
      ? options.printColorCount
      : source.printColorCount;
  const costPerColor =
    options.costPerColor !== undefined
      ? options.costPerColor
      : source.costPerColor;
  const toolingBillingMode =
    options.toolingBillingMode !== undefined
      ? options.toolingBillingMode
      : source.toolingBillingMode;
  const toolingScenario =
    options.toolingScenario !== undefined
      ? options.toolingScenario
      : source.toolingScenario ?? 'new';
  const billableColorCount =
    options.billableColorCount !== undefined
      ? options.billableColorCount
      : source.billableColorCount;

  const derived = deriveToolingFromColors({
    printColorCount,
    costPerColor,
    toolingBillingMode,
    toolingScenario,
    billableColorCount,
    exchangeRateUsdToDisplay: options.exchangeRateUsdToDisplay,
  });

  const [newEstimate] = (await db
    .insert(schema.estimates)
    .values({
      tenantId: options.tenantId,
      customerId: options.customerId !== undefined ? options.customerId : source.customerId,
      quoteId: options.quoteId,
      sortOrder: options.sortOrder ?? 0,
      skuLabel:
        options.skuLabel !== undefined ? options.skuLabel : source.skuLabel,
      brand: options.brand !== undefined ? options.brand : source.brand,
      specsCode:
        options.specsCode !== undefined ? options.specsCode : source.specsCode,
      printColorCount: printColorCount ?? null,
      costPerColor: costPerColor != null ? String(costPerColor) : null,
      toolingBillingMode: derived?.toolingBillingMode ?? toolingBillingMode ?? null,
      toolingScenario: toolingScenario ?? 'new',
      billableColorCount: derived?.billableColorCount ?? billableColorCount ?? null,
      copiedFromEstimateId: options.copiedFromEstimateId ?? null,
      refNumber: newRefNumber,
      jobName: options.jobName ?? source.jobName,
      notes: options.notes !== undefined ? options.notes : source.notes,
      status: options.status ?? 'draft',
      productType: source.productType,
      productSubtype: source.productSubtype,
      printingWebClass: source.printingWebClass,
      dimensions: source.dimensions,
      markupPercent: source.markupPercent,
      platesPerKg: source.platesPerKg,
      deliveryPerKg: source.deliveryPerKg,
      displayCurrency: options.displayCurrency,
      exchangeRateUsdToDisplay: options.exchangeRateUsdToDisplay,
      solventMaterialId: source.solventMaterialId,
      solventCostPerKgUsd: source.solventCostPerKgUsd,
      solventRatio: source.solventRatio,
      laminationRecipeOverrides: source.laminationRecipeOverrides,
      cleaningSolventKgPerJob: source.cleaningSolventKgPerJob,
      sleeveSeamingSolventGsm: source.sleeveSeamingSolventGsm,
      inkPrintingProcess: source.inkPrintingProcess,
      orderQuantityKg: source.orderQuantityKg,
      orderQuantityUnit: source.orderQuantityUnit,
      pricingMethod: source.pricingMethod,
      marginValuePerKgUsd: source.marginValuePerKgUsd,
      cormPerKgUsd: source.cormPerKgUsd,
      cormPerKgPlain: source.cormPerKgPlain,
      moqKg: source.moqKg,
      toolingChargeUsd: derived?.toolingChargeUsd ?? source.toolingChargeUsd,
      toolingBilledToCustomer:
        derived?.toolingBilledToCustomer ?? source.toolingBilledToCustomer,
      deliveryTerm: source.deliveryTerm,
      deliveryChargeUsd: source.deliveryChargeUsd,
      wasteBands: source.wasteBands,
      sourceEstimationId: options.sourceEstimationId ?? null,
      masterDataVersion,
      sourceTemplateKey: source.sourceTemplateKey,
      structureForked: source.structureForked,
      processesCustomized: source.processesCustomized,
      structureSignature: source.structureSignature,
      ...(options.copyCalculatedTotals
        ? {
            totalGsm: source.totalGsm,
            totalMicron: source.totalMicron,
            materialCostPerKg: source.materialCostPerKg,
            salePricePerKg: source.salePricePerKg,
          }
        : {}),
    })
    .returning()) as EstimateRow[];

  for (const layer of sourceLayers) {
    const mat = materialById.get(layer.materialId);
    const snapshotCost =
      layer.unit_cost_snapshot_usd != null
        ? parseFloat(layer.unit_cost_snapshot_usd)
        : null;
    await db.insert(schema.layers).values(
      buildLayerInsertValues({
        estimateId: newEstimate.id,
        materialId: layer.materialId,
        micron: layer.micron,
        position: layer.position,
        material: mat ? toMaterialLineageSource(mat) : null,
        unitCostOverrideUsd:
          !options.refreshMaterialPrices && snapshotCost != null && Number.isFinite(snapshotCost)
            ? snapshotCost
            : null,
        gsm: layer.gsm ?? null,
      })
    );
  }

  for (const process of sourceProcesses) {
    await insertEstimateProcess(db, {
      estimateId: newEstimate.id,
      name: process.name,
      processKey: process.processKey,
      processQuantity: process.processQuantity,
      costPerHour: process.costPerHour,
      costPerKgUsd: process.costPerKgUsd,
      speedBasis: process.speedBasis,
      speedValue: process.speedValue,
      setupHours: process.setupHours,
      enabled: process.enabled,
      runHours: process.runHours,
      totalCost: process.totalCost,
    });
  }

  for (let i = 0; i < sourceSlabs.length; i++) {
    const slab = sourceSlabs[i];
    await db.insert(schema.slabs).values({
      estimateId: newEstimate.id,
      quantityKg: slab.quantityKg,
      pricePerKg: slab.pricePerKg,
      sortOrder: slab.sortOrder ?? i,
    });
  }

  return { estimate: newEstimate, sourceLayers };
}
