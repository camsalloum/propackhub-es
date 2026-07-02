import { describe, expect, it } from 'vitest';
import {
  deriveProcessesFromStructure,
  type DerivedProcess,
  type ProcessCatalog,
} from './derive-processes';

const CATALOG: ProcessCatalog = {
  extrusion: { label: 'Extrusion', costPerKgUsd: 0.4 },
  printing: { label: 'Printing', costPerKgUsd: 0.8 },
  lamination: { label: 'Lamination', costPerKgUsd: 0.3 },
  slitting: { label: 'Slitting', costPerKgUsd: 0.1 },
  pouch_making: { label: 'Pouch Making', costPerKgUsd: 0.9 },
  bag_making: { label: 'Bag Making', costPerKgUsd: 0.5 },
  seaming: { label: 'Seaming', costPerKgUsd: 0.5 },
};

function totalCost(processes: DerivedProcess[]): number {
  return processes
    .filter((process) => process.enabled)
    .reduce(
      (sum, process) => sum + process.costPerKgUsd * process.process_quantity,
      0
    );
}

function processByKey(processes: DerivedProcess[], key: DerivedProcess['process_key']) {
  return processes.find((process) => process.process_key === key);
}

describe('deriveProcessesFromStructure — golden totals', () => {
  it('Triplex printed = 1.90', () => {
    const processes = deriveProcessesFromStructure(
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

    expect(totalCost(processes)).toBeCloseTo(1.9, 6);
    expect(processByKey(processes, 'lamination')?.process_quantity).toBe(2);
  });

  it('Mono PE printed = 1.30', () => {
    const processes = deriveProcessesFromStructure(
      {
        layers: [{ type: 'substrate' }, { type: 'ink' }],
        productType: 'roll',
        materialClass: 'PE',
      },
      CATALOG
    );

    expect(totalCost(processes)).toBeCloseTo(1.3, 6);
    expect(processByKey(processes, 'lamination')).toBeUndefined();
  });

  it('Commercial printed pouch = 2.10', () => {
    const processes = deriveProcessesFromStructure(
      {
        layers: [{ type: 'substrate' }, { type: 'ink' }],
        productType: 'pouch',
        materialClass: 'PE',
      },
      CATALOG
    );

    expect(totalCost(processes)).toBeCloseTo(2.1, 6);
    expect(processByKey(processes, 'pouch_making')).toBeDefined();
  });
});

describe('deriveProcessesFromStructure — edges', () => {
  it('0 adhesives produces no lamination row', () => {
    const processes = deriveProcessesFromStructure(
      {
        layers: [{ type: 'substrate' }, { type: 'ink' }],
        productType: 'roll',
        materialClass: 'PE',
      },
      CATALOG
    );

    expect(processByKey(processes, 'lamination')).toBeUndefined();
  });

  it('3 adhesives derives lamination x3', () => {
    const processes = deriveProcessesFromStructure(
      {
        layers: [
          { type: 'substrate' },
          { type: 'adhesive' },
          { type: 'substrate' },
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

    expect(processByKey(processes, 'lamination')?.process_quantity).toBe(3);
  });

  it('no ink produces no printing row', () => {
    const processes = deriveProcessesFromStructure(
      {
        layers: [{ type: 'substrate' }, { type: 'adhesive' }, { type: 'substrate' }],
        productType: 'roll',
        materialClass: 'Non PE',
      },
      CATALOG
    );

    expect(processByKey(processes, 'printing')).toBeUndefined();
  });

  it('supports extrusion qty override (1 or 2)', () => {
    const processes = deriveProcessesFromStructure(
      {
        layers: [{ type: 'substrate' }, { type: 'ink' }],
        productType: 'roll',
        materialClass: 'PE',
        overrides: {
          extrusion: { process_quantity: 2 },
        },
      },
      CATALOG
    );

    expect(processByKey(processes, 'extrusion')?.process_quantity).toBe(2);
    expect(totalCost(processes)).toBeCloseTo(1.7, 6);
  });
});
