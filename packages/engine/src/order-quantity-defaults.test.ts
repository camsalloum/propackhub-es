import { describe, expect, it } from 'vitest';
import { defaultOrderQuantityUnit, isLabelsRollContext } from './order-quantity-defaults';

describe('isLabelsRollContext', () => {
  it('detects labels from template key and job name', () => {
    expect(isLabelsRollContext({ sourceTemplateKey: 'labels_flexo' })).toBe(true);
    expect(isLabelsRollContext({ jobName: 'Wine labels — triplex' })).toBe(true);
    expect(isLabelsRollContext({ productType: 'sleeve', jobName: 'labels' })).toBe(false);
  });
});

describe('defaultOrderQuantityUnit', () => {
  it('defaults sleeve and labels rolls to kpcs', () => {
    expect(defaultOrderQuantityUnit({ productType: 'sleeve' })).toBe('kpcs');
    expect(
      defaultOrderQuantityUnit({ productType: 'roll', sourceTemplateKey: 'labels_pe' })
    ).toBe('kpcs');
  });

  it('defaults other rolls to kgs', () => {
    expect(defaultOrderQuantityUnit({ productType: 'roll', jobName: 'Laminate film' })).toBe('kgs');
    expect(defaultOrderQuantityUnit({ productType: 'pouch' })).toBe('kgs');
  });
});
