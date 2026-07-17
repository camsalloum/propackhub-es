import { describe, expect, it } from 'vitest';
import {
  calculateConsumablesCosts,
  DEFAULT_MOUNT_WIDTH_M,
  type ConsumablesConfig,
} from './consumables-costing';
import type { Estimate, Material } from './types';

function mat(partial: Partial<Material> & Pick<Material, 'id' | 'name' | 'platformMasterKey'>): Material {
  return {
    type: 'packaging',
    solidPercent: 100,
    density: 1,
    costPerKgUsd: 0,
    wastePercent: 0,
    ...partial,
  };
}

function baseEstimate(
  cfg?: ConsumablesConfig,
  extra?: Partial<Estimate>
): Estimate {
  return {
    id: 'e1',
    tenantId: 't1',
    layers: [],
    processes: [],
    orderQuantityKg: 1000,
    markupPercent: 0,
    platesPerKg: 0,
    deliveryPerKg: 0,
    dimensions: { productType: 'roll', reelWidthMm: 500, cutoffMm: 600 },
    inkPrintingProcess: 'flexo',
    printColorCount: 4,
    consumablesConfig: cfg,
    ...extra,
  } as Estimate;
}

describe('calculateConsumablesCosts', () => {
  const materials = new Map<string, Material>([
    [
      'm1',
      mat({
        id: 'm1',
        name: 'Mounting Tape',
        platformMasterKey: 'consumables-mounting-tape',
        priceUnit: 'm2',
        unitPriceUsd: 10,
      }),
    ],
    [
      'm2',
      mat({
        id: 'm2',
        name: 'Other',
        platformMasterKey: 'consumables-other',
        priceUnit: 'kgs',
        costPerKgUsd: 0.05,
        unitPriceUsd: 0.05,
      }),
    ],
  ]);

  it('flexo: tape m² = colors × 1m × repeat; other is $/kg', () => {
    const detail = calculateConsumablesCosts(baseEstimate(), materials, {
      orderQuantityKg: 1000,
      totalGsm: 50,
      printColorCount: 4,
    });
    const tape = detail.lines.find((l) => l.role === 'mounting_tape')!;
    const other = detail.lines.find((l) => l.role === 'other')!;
    // cutoff 600 mm is in cylinder band → 4 × 1 × 0.6 = 2.4 m² × $10 = $24 → $0.024/kg
    expect(tape.qty).toBeCloseTo(2.4, 6);
    expect(tape.detail?.repeatM).toBeCloseTo(0.6, 6);
    expect(tape.priceUnit).toBe('m2');
    expect(tape.costPerKgUsd).toBeCloseTo(0.024, 6);
    expect(other.priceUnit).toBe('kgs');
    expect(other.costPerKgUsd).toBeCloseTo(0.05, 6);
    expect(detail.totalCostPerKg).toBeCloseTo(0.074, 6);
  });

  it('flexo: product cutoff below cylinder band uses 550 mm average', () => {
    const detail = calculateConsumablesCosts(
      baseEstimate(undefined, {
        dimensions: { productType: 'roll', reelWidthMm: 250, cutoffMm: 125 },
      }),
      materials,
      { orderQuantityKg: 1000, totalGsm: 50, printColorCount: 4 }
    );
    const tape = detail.lines.find((l) => l.role === 'mounting_tape')!;
    // 4 × 1 × 0.55 = 2.2 m²
    expect(tape.detail?.repeatM).toBeCloseTo(0.55, 6);
    expect(tape.qty).toBeCloseTo(2.2, 6);
  });

  it('flexo: ignores leaked product-cutoff saved as repeatM', () => {
    const detail = calculateConsumablesCosts(
      baseEstimate(
        { repeatM: 0.125 },
        { dimensions: { productType: 'roll', reelWidthMm: 250, cutoffMm: 125 } }
      ),
      materials,
      { orderQuantityKg: 1000, totalGsm: 50, printColorCount: 4 }
    );
    const tape = detail.lines.find((l) => l.role === 'mounting_tape')!;
    expect(tape.detail?.repeatM).toBeCloseTo(0.55, 6);
  });

  it('roto: no mounting tape line', () => {
    const detail = calculateConsumablesCosts(
      baseEstimate(undefined, { inkPrintingProcess: 'rotogravure' }),
      materials,
      { orderQuantityKg: 1000, totalGsm: 50, printColorCount: 6 }
    );
    expect(detail.lines.find((l) => l.role === 'mounting_tape')).toBeUndefined();
    expect(detail.lines).toHaveLength(1);
    expect(detail.lines[0]!.role).toBe('other');
  });

  it('allows mount width / repeat / tape m² overrides', () => {
    const detail = calculateConsumablesCosts(
      baseEstimate({
        mountWidthM: DEFAULT_MOUNT_WIDTH_M,
        repeatM: 0.4,
        colors: 2,
        tapeM2Override: 3,
        unitPriceOverridesUsd: { mounting_tape: 8 },
      }),
      materials,
      { orderQuantityKg: 500, totalGsm: 40, printColorCount: 8 }
    );
    const tape = detail.lines.find((l) => l.role === 'mounting_tape')!;
    expect(tape.calculatedQty).toBeCloseTo(2 * 1 * 0.4, 6);
    expect(tape.qty).toBe(3);
    expect(tape.costJobUsd).toBeCloseTo(24, 6);
  });
});
