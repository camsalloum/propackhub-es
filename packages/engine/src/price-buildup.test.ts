import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFIT_MARGIN_PERCENT,
  operatingCostMethodRowLabel,
  priceWithNewModel,
} from './price-buildup';
import type { WasteBand } from './waste-bands';

const BANDS: WasteBand[] = [{ minKg: 0, maxKg: null, wastePercent: 10 }];

const base = {
  materialPerKg: 10,
  accessoryPerKg: 0,
  wasteQtyKg: 1000,
  amortizeQtyKg: 1000,
  wasteBands: BANDS,
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

describe('priceWithNewModel — method goldens', () => {
  it('Fixed CoRM: Total RM and M&O scale with waste; sale = RM + M&O', () => {
    const r = priceWithNewModel({ ...base, operatingCostMethod: 'fixed_per_group' });
    expect(r.wasteAdjustedMaterialPerKg).toBeCloseTo(11, 6);
    expect(r.mfgOperatingPerKg).toBeCloseTo(11, 6);
    expect(r.profitMarginPerKg).toBe(0);
    expect(r.salePricePerKg).toBeCloseTo(22, 6);
    expect(operatingCostMethodRowLabel('fixed_per_group')).toBe('Margin Over Raw Material');
  });

  it('Markup over material: M&O = Total RM × markup%', () => {
    const r = priceWithNewModel({ ...base, operatingCostMethod: 'markup_over_rm' });
    expect(r.mfgOperatingPerKg).toBeCloseTo(2.2, 6);
    expect(r.profitMarginPerKg).toBe(0);
    expect(r.salePricePerKg).toBeCloseTo(13.2, 6);
    expect(operatingCostMethodRowLabel('markup_over_rm')).toBe('Markup Over Material');
  });

  it('Process: M&O = process sum; profit = % of cost before margin', () => {
    const r = priceWithNewModel({
      ...base,
      operatingCostMethod: 'process_per_kg',
      profitMarginPercent: DEFAULT_PROFIT_MARGIN_PERCENT,
    });
    expect(r.mfgOperatingPerKg).toBeCloseTo(1.5, 6);
    // cost before profit = 11 + 1.5 = 12.5; 5% = 0.625
    expect(r.profitMarginPerKg).toBeCloseTo(0.625, 6);
    expect(r.salePricePerKg).toBeCloseTo(13.125, 6);
    expect(operatingCostMethodRowLabel('process_per_kg')).toBe('Manufacturing & Operating');
  });
});
