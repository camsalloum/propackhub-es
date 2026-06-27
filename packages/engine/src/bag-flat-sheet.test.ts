import { describe, it, expect } from 'vitest';
import {
  calculateBagFlatSheetAreaM2,
  resolveBagConfiguratorType,
  BAG_SUBTYPE_TO_CONFIGURATOR,
} from './bag-flat-sheet';
import type { EstimateDimensions } from './types';

describe('bag-flat-sheet — flat sheet area per subtype', () => {
  const base: EstimateDimensions = {
    productType: 'bag',
    openWidthMm: 400,
    openHeightMm: 500,
    numberOfUps: 1,
    extraPrintingTrimMm: 0,
  };

  it('resolves type from bagSubtype', () => {
    expect(resolveBagConfiguratorType({ ...base, bagSubtype: 'wicket' })).toBe('wicket');
  });

  it('resolves type from productSubtype code', () => {
    expect(
      resolveBagConfiguratorType({ ...base, productSubtype: 'bag_bottom_gusset_shopping' })
    ).toBe('bottom-gusset');
  });

  it('returns null when unresolvable', () => {
    expect(resolveBagConfiguratorType({ ...base })).toBeNull();
  });

  it('bottom-gusset: blank = 2W, length = H+BG+SA (two-web; gusset film W×2BG spread across 2W → +BG)', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'bottom-gusset',
      bottomGussetMm: 120,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 400); // 800
    expect(r.blankLengthMm).toBe(500 + 120 + 10); // 630
    expect(r.areaM2).toBeCloseTo((800 * 630) / 1e6, 6);
  });

  it('side-gusset: blank = 2W+4SG, length = H+2SA (SG formed depth unfolds to 2SG/side)', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'side-gusset',
      sideGussetMm: 80,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 400 + 4 * 80); // 1120
    expect(r.blankLengthMm).toBe(500 + 20); // 520
  });

  it('courier: blank = W, length = 2H+FL+SA', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'courier',
      flapMm: 50,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(400);
    expect(r.blankLengthMm).toBe(2 * 500 + 50 + 10); // 1060
  });

  it('diaper: blank = 2W, length = H+BG+FL+SA (two-web; gusset adds BG not 2BG)', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'diaper',
      bottomGussetMm: 100,
      flapMm: 50,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 400); // 800
    expect(r.blankLengthMm).toBe(500 + 100 + 50 + 10); // 660
  });

  it('industrial: blank = 2W+4SG, length = H+2SA (SG formed depth)', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'industrial',
      sideGussetMm: 100,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 400 + 4 * 100); // 1200
    expect(r.blankLengthMm).toBe(500 + 20); // 520
  });

  it('industrial: flat (SG=0) falls back to 2W', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'industrial',
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(800);
    expect(r.blankLengthMm).toBe(520);
  });

  it('loop: body (2W×(H+BG+SA)) + 2 handle strips (HW×HL), same material', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'loop',
      bottomGussetMm: 80,
      handleLengthMm: 260,
      bagHandleWidthMm: 40,
      sealAllowanceMm: 10,
    });
    // body = 800 × (500 + 80 + 10) = 800 × 590
    // handles = 2 × 40 × 260 = 20800 mm² (same material, weight averaged in)
    const bodyArea = (2 * 400) * (500 + 80 + 10);
    const handleArea = 2 * 40 * 260;
    expect(r.blankWidthMm).toBe(800);
    expect(r.blankLengthMm).toBe(590); // body blank; handle weight averaged in via area
    expect(r.areaM2).toBeCloseTo((bodyArea + handleArea) / 1e6, 6);
  });

  it('loop: handle width defaults to W when HW omitted', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'loop',
      bottomGussetMm: 80,
      handleLengthMm: 260,
      sealAllowanceMm: 10,
    });
    const bodyArea = (2 * 400) * (500 + 80 + 10);
    const handleArea = 2 * 400 * 260; // HW defaults to W=400
    expect(r.areaM2).toBeCloseTo((bodyArea + handleArea) / 1e6, 6);
  });

  it('patch: side-gusset base (2W+4SG) + patch area PW×PH', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'patch',
      sideGussetMm: 60,
      bagPatchWidthMm: 120,
      bagPatchHeightMm: 80,
      sealAllowanceMm: 10,
    });
    const baseArea = (2 * 400 + 4 * 60) * (500 + 20) / 1e6;
    expect(r.patchAreaM2).toBeCloseTo((120 * 80) / 1e6, 6);
    expect(r.areaM2).toBeCloseTo(baseArea + r.patchAreaM2, 6);
  });

  it('punch: blank = 2W+4SG, length = H+2SA (SG formed depth)', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'punch',
      sideGussetMm: 60,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 400 + 4 * 60); // 1040
    expect(r.blankLengthMm).toBe(520);
  });

  it('punch: flat (SG=0) falls back to 2W', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'punch',
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(800);
    expect(r.blankLengthMm).toBe(520);
  });

  it('wicket: flat bag (BG=0) + lip (LH), length = H+2SA+LH', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'wicket',
      bagWicketLipMm: 30,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 400); // 800
    expect(r.blankLengthMm).toBe(500 + 2 * 10 + 30); // 550
    expect(r.areaM2).toBeCloseTo((800 * 550) / 1e6, 6);
  });

  it('wicket: gusseted (BG>0) + lip, length = H+BG+SA+LH (two-web; +BG not +2BG)', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'wicket',
      bottomGussetMm: 80,
      bagWicketLipMm: 30,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(800);
    expect(r.blankLengthMm).toBe(500 + 80 + 10 + 30); // 620
  });

  it('uses default seal allowance 10mm when omitted', () => {
    const r = calculateBagFlatSheetAreaM2({
      ...base,
      bagSubtype: 'industrial',
    });
    expect(r.blankLengthMm).toBe(500 + 2 * 10); // 520
  });

  it('returns zero area when subtype unresolved', () => {
    const r = calculateBagFlatSheetAreaM2({ ...base });
    expect(r.areaM2).toBe(0);
    expect(r.type).toBeNull();
  });

  it('BAG_SUBTYPE_TO_CONFIGURATOR has all 9 subtypes', () => {
    expect(Object.keys(BAG_SUBTYPE_TO_CONFIGURATOR)).toHaveLength(9);
  });
});