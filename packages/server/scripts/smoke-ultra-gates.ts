/**
 * Offline smoke for Ultra audit gates that do not need a browser or staging SSH.
 * Covers: M&O price-buildup goldens, process-fork derivation, PKG range helper.
 *
 * Usage: npx tsx scripts/smoke-ultra-gates.ts
 */
import {
  deriveProcessesFromStructure,
  type ProcessCatalog,
} from '@es/engine';
import {
  priceWithNewModel,
  operatingCostMethodRowLabel,
  DEFAULT_PROFIT_MARGIN_PERCENT,
} from '@es/engine';
import { customSlabRangesFromBreakpoints } from '@es/engine';

const CATALOG: ProcessCatalog = {
  extrusion: { label: 'Extrusion', costPerKgUsd: 0.4 },
  printing: { label: 'Printing', costPerKgUsd: 0.8 },
  lamination: { label: 'Lamination', costPerKgUsd: 0.3 },
  slitting: { label: 'Slitting', costPerKgUsd: 0.1 },
  pouch_making: { label: 'Pouch Making', costPerKgUsd: 0.9 },
  bag_making: { label: 'Bag Making', costPerKgUsd: 0.5 },
  seaming: { label: 'Seaming', costPerKgUsd: 0.5 },
};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function nearly(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

function main() {
  // Process-fork Phase 3 — Triplex printed golden (1.90)
  const triplex = deriveProcessesFromStructure(
    {
      layers: [
        { type: 'substrate' },
        { type: 'ink' },
        { type: 'adhesive' },
        { type: 'substrate' },
        { type: 'adhesive' },
        { type: 'substrate' },
      ],
      productType: 'roll',
      materialClass: 'Non PE',
    },
    CATALOG
  );
  const triplexTotal = triplex
    .filter((p) => p.enabled)
    .reduce((s, p) => s + p.costPerKgUsd * p.process_quantity, 0);
  assert(nearly(triplexTotal, 1.9), `Triplex process fork expected 1.90, got ${triplexTotal}`);

  // M&O method goldens
  const base = {
    materialPerKg: 10,
    accessoryPerKg: 0,
    wasteQtyKg: 1000,
    amortizeQtyKg: 1000,
    wasteBands: [{ minKg: 0, maxKg: null as number | null, wastePercent: 10 }],
    platesPerKg: 0,
    deliveryPerKg: 0,
    toolingChargeUsd: 0,
    toolingBilled: false,
    deliveryChargeUsd: 0,
    markupPercent: 20,
    mfgProcessPerKg: 1.5,
    cormPerKgUsd: 10,
    cormScaleWithWaste: 1,
  };

  const fixed = priceWithNewModel({ ...base, operatingCostMethod: 'fixed_per_group' });
  assert(nearly(fixed.wasteAdjustedMaterialPerKg, 11), `Fixed CoRM Total RM ${fixed.wasteAdjustedMaterialPerKg}`);
  assert(nearly(fixed.mfgOperatingPerKg, 11), `Fixed CoRM M&O ${fixed.mfgOperatingPerKg}`);
  assert(operatingCostMethodRowLabel('fixed_per_group') === 'Margin Over Raw Material', 'Fixed label');

  const markup = priceWithNewModel({ ...base, operatingCostMethod: 'markup_over_rm' });
  assert(nearly(markup.mfgOperatingPerKg, 2.2), `Markup M&O ${markup.mfgOperatingPerKg}`);
  assert(operatingCostMethodRowLabel('markup_over_rm') === 'Markup Over Material', 'Markup label');

  const process = priceWithNewModel({
    ...base,
    operatingCostMethod: 'process_per_kg',
    profitMarginPercent: DEFAULT_PROFIT_MARGIN_PERCENT,
  });
  assert(nearly(process.mfgOperatingPerKg, 1.5), `Process M&O ${process.mfgOperatingPerKg}`);
  // Total RM 11 + M&O 1.5 = 12.5; profit 5% = 0.625; sale = 13.125
  assert(nearly(process.profitMarginPerKg, 0.625), `Process profit ${process.profitMarginPerKg}`);
  assert(nearly(process.salePricePerKg, 13.125), `Process sale ${process.salePricePerKg}`);

  // Custom slab ranges (PKG price-list display)
  const ranges = customSlabRangesFromBreakpoints([1000, 2000, 3000]);
  assert(ranges.length === 3, 'expected 3 slab ranges');
  assert(ranges[0]!.from === 0 && ranges[0]!.to === 1000, 'first band 0–1000');
  assert(ranges[1]!.from === 1001 && ranges[1]!.to === 2000, 'second band');

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          'process-fork Triplex 1.90',
          'M&O fixed_per_group',
          'M&O markup_over_rm',
          'M&O process_per_kg + profit',
          'custom slab ranges',
        ],
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
