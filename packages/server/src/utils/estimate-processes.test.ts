import { describe, expect, it } from 'vitest';
import { deriveProcessesFromStructure } from '@es/engine';
import {
  buildProcessesFromDerived,
  buildProcessesFromTemplateDefaults,
  computeEstimateStructureSignature,
  computeTemplateStructureSignature,
  resolveEstimateMaterialClass,
} from './estimate-processes';

describe('estimate-processes helpers', () => {
  it('computeTemplateStructureSignature is stable for equivalent template stacks', () => {
    const templateA = {
      productType: 'roll',
      defaultLayers: [
        { layer_order: 1, layer_type: 'substrate' },
        { layer_order: 2, layer_type: 'ink' },
        { layer_order: 3, layer_type: 'adhesive' },
      ],
    } as any;

    const templateB = {
      productType: 'roll',
      defaultLayers: [
        { layer_order: 3, layer_type: 'adhesive' },
        { layer_order: 1, layer_type: 'substrate' },
        { layer_order: 2, layer_type: 'ink' },
      ],
    } as any;

    expect(computeTemplateStructureSignature(templateA)).toBe(
      computeTemplateStructureSignature(templateB)
    );
  });

  it('resolveEstimateMaterialClass prioritizes estimate classification over template', () => {
    const estimate = {
      dimensions: {
        templateClassification: {
          materialClass: 'PE',
        },
      },
    } as any;

    const template = {
      materialClass: 'Non PE',
    } as any;

    expect(resolveEstimateMaterialClass(estimate, template)).toBe('PE');
    expect(resolveEstimateMaterialClass({ dimensions: {} } as any, template)).toBe('Non PE');
    expect(resolveEstimateMaterialClass({ dimensions: {} } as any, null as any)).toBe('Non PE');
  });

  it('buildProcessesFromTemplateDefaults keeps template quantities', () => {
    const processRefMap = new Map<string, any>([
      ['extrusion', { code: 'extrusion', label: 'Extrusion', costPerHour: 60, costPerKgUsd: 0.4 }],
      ['lamination', { code: 'lamination', label: 'Lamination', costPerHour: 50, costPerKgUsd: 0.3 }],
    ]);

    const rows = buildProcessesFromTemplateDefaults(
      'est-1',
      [
        { process_key: 'extrusion', process_quantity: 1, enabled: true },
        { process_key: 'lamination', process_quantity: 2, enabled: true },
      ],
      processRefMap,
      'template'
    );

    expect(rows).toHaveLength(2);
    expect(rows[1].processQuantity).toBe(2);
    expect(rows[1].costPerKgUsd).toBe('0.3');
  });

  it('buildProcessesFromDerived maps derived output to process rows', () => {
    const signature = computeEstimateStructureSignature(
      [
        { type: 'substrate', position: 1 },
        { type: 'ink', position: 2 },
        { type: 'adhesive', position: 3 },
        { type: 'substrate', position: 4 },
      ],
      'roll'
    );

    expect(signature.startsWith('v1_')).toBe(true);

    const derived = deriveProcessesFromStructure(
      {
        layers: [
          { type: 'substrate' },
          { type: 'ink' },
          { type: 'adhesive' },
          { type: 'substrate' },
        ],
        productType: 'roll',
        materialClass: 'Non PE',
      },
      {
        extrusion: { label: 'Extrusion', costPerKgUsd: 0.4 },
        printing: { label: 'Printing', costPerKgUsd: 0.8 },
        lamination: { label: 'Lamination', costPerKgUsd: 0.3 },
        slitting: { label: 'Slitting', costPerKgUsd: 0.1 },
      }
    );

    const processRefMap = new Map<string, any>([
      ['extrusion', { code: 'extrusion', label: 'Extrusion', costPerHour: 60, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 }],
      ['printing', { code: 'printing', label: 'Printing', costPerHour: 70, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 }],
      ['lamination', { code: 'lamination', label: 'Lamination', costPerHour: 80, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 }],
      ['slitting', { code: 'slitting', label: 'Slitting', costPerHour: 40, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 }],
    ]);

    const rows = buildProcessesFromDerived('est-2', derived, processRefMap, 'derived');

    expect(rows.map((row) => row.processKey)).toEqual([
      'extrusion',
      'printing',
      'lamination',
      'slitting',
    ]);
    expect(rows.find((row) => row.processKey === 'lamination')?.processQuantity).toBe(1);
  });
});
