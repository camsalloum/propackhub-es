import { describe, it, expect } from 'vitest';
import { DEFAULT_SALES_REP_PROFILE, DEFAULT_ADMIN_PROFILE } from './visibility';

describe('Visibility profiles', () => {
  it('DEFAULT_SALES_REP_PROFILE matches PRD §6.8 defaults', () => {
    // Per PRD §6.8, grams_per_piece and alternate_price_units should be false for sales rep
    expect(DEFAULT_SALES_REP_PROFILE.gramsPerPiece).toBe(false);
    expect(DEFAULT_SALES_REP_PROFILE.alternatePriceUnits).toBe(false);
    
    // Core structure fields should be true
    expect(DEFAULT_SALES_REP_PROFILE.structureLayers).toBe(true);
    expect(DEFAULT_SALES_REP_PROFILE.layerMicrons).toBe(true);
    expect(DEFAULT_SALES_REP_PROFILE.dimensions).toBe(true);
    expect(DEFAULT_SALES_REP_PROFILE.totalGsm).toBe(true);
    expect(DEFAULT_SALES_REP_PROFILE.printingWebClass).toBe(true);
    
    // Cost fields should be false for sales rep
    expect(DEFAULT_SALES_REP_PROFILE.materialCostPerKg).toBe(false);
    expect(DEFAULT_SALES_REP_PROFILE.rmCostPerKg).toBe(false);
    expect(DEFAULT_SALES_REP_PROFILE.markupPercent).toBe(false);
    expect(DEFAULT_SALES_REP_PROFILE.operationCost).toBe(false);
    
    // Output should be true
    expect(DEFAULT_SALES_REP_PROFILE.sellingPrice).toBe(true);
    expect(DEFAULT_SALES_REP_PROFILE.slabTable).toBe(true);
    expect(DEFAULT_SALES_REP_PROFILE.proposalPdf).toBe(true);
  });

  it('DEFAULT_ADMIN_PROFILE has all fields true', () => {
    // Admin should see everything
    Object.values(DEFAULT_ADMIN_PROFILE).forEach((value) => {
      expect(value).toBe(true);
    });
  });
});