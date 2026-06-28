import { describe, it, expect } from 'vitest';
import {
  calculatePouchFlatSheetAreaM2,
  resolvePouchConfiguratorType,
  POUCH_SUBTYPE_TO_CONFIGURATOR,
  DEFAULT_POUCH_SEAL_ALLOWANCE_MM,
} from './pouch-flat-sheet';
import type { EstimateDimensions } from './types';

describe('pouch-flat-sheet — flat sheet area per subtype', () => {
  const base: EstimateDimensions = {
    productType: 'pouch',
    openWidthMm: 110,
    openHeightMm: 190,
  };

  // --- resolver ---
  it('resolves type from pouchSubtype', () => {
    expect(resolvePouchConfiguratorType({ ...base, pouchSubtype: 'stand-up' })).toBe('stand-up');
  });

  it('resolves type from productSubtype code', () => {
    expect(
      resolvePouchConfiguratorType({ ...base, productSubtype: 'pouch_three_side_seal' })
    ).toBe('three-side-seal');
  });

  it('legacy alias pouch_doypack → stand-up', () => {
    expect(
      resolvePouchConfiguratorType({ ...base, productSubtype: 'pouch_doypack' })
    ).toBe('stand-up');
  });

  it('legacy alias pouch_pillow → center-seal', () => {
    expect(
      resolvePouchConfiguratorType({ ...base, productSubtype: 'pouch_pillow' })
    ).toBe('center-seal');
  });

  it('returns null when unresolvable (preserves legacy face-area fallback)', () => {
    expect(resolvePouchConfiguratorType({ ...base })).toBeNull();
  });

  // --- 3-side seal ---
  it('three-side-seal: blank = W, length = 2H + SA (single web folded, top seal only)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      pouchSubtype: 'three-side-seal',
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(110);
    expect(r.blankLengthMm).toBe(2 * 190 + 10); // 390
    expect(r.areaM2).toBeCloseTo((110 * 390) / 1e6, 6);
  });

  // --- center seal (pillow / VFFS) ---
  it('center-seal: blank = 2W + OV, length = H + 2·SA (tube circumference + back overlap)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      pouchSubtype: 'center-seal',
      centerSealOverlapMm: 10,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 110 + 10); // 230
    expect(r.blankLengthMm).toBe(190 + 2 * 10); // 210
    expect(r.areaM2).toBeCloseTo((230 * 210) / 1e6, 6);
  });

  it('center-seal: omitting OV still uses tube circumference 2W (NOT W + OV — that is the bug being fixed)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      pouchSubtype: 'center-seal',
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 110); // 220 — full tube, OV defaults to 0
  });

  // --- 4-side seal (the exception: SA on both axes, two plies) ---
  it('four-side-seal: blank = (W+2SA) × (H+2SA), film = 2 plies (separate die-cut webs)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      pouchSubtype: 'four-side-seal',
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(110 + 20); // 130
    expect(r.blankLengthMm).toBe(190 + 20); // 210
    expect(r.areaM2).toBeCloseTo((2 * 130 * 210) / 1e6, 6); // ×2 plies
  });

  // --- stand-up (doypack) ---
  it('stand-up: blank = 2W, length = H + BG + SA (two-web; gusset adds BG to length, no bottom seal)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      pouchSubtype: 'stand-up',
      bottomGussetMm: 50,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 110); // 220
    expect(r.blankLengthMm).toBe(190 + 50 + 10); // 250
    expect(r.areaM2).toBeCloseTo((220 * 250) / 1e6, 6); // = 0.055 m² (worked example in doc §5)
  });

  it('stand-up: worked example produces 151.5 pcs/kg at totalGsm=120 (doc §5)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 110,
      openHeightMm: 190,
      pouchSubtype: 'stand-up',
      bottomGussetMm: 50,
      sealAllowanceMm: 10,
    });
    const totalGsm = 120;
    const piecesPerKg = 1000 / (r.areaM2 * totalGsm);
    expect(piecesPerKg).toBeCloseTo(151.5, 1);
  });

  // --- side-gusset ---
  it('side-gusset: blank = 2W + 4SG, length = H + 2SA (top + bottom seals)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      pouchSubtype: 'side-gusset',
      sideGussetMm: 35,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 110 + 4 * 35); // 360
    expect(r.blankLengthMm).toBe(190 + 20); // 210
    expect(r.areaM2).toBeCloseTo((360 * 210) / 1e6, 6);
  });

  // --- flat-bottom (box pouch) ---
  it('flat-bottom: side-gusset body + W×D bottom panel, length = H + SA (box bottom absorbed in D)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 110,
      openHeightMm: 170,
      pouchSubtype: 'flat-bottom',
      sideGussetMm: 35,
      bottomDepthMm: 45,
      sealAllowanceMm: 10,
    });
    expect(r.blankWidthMm).toBe(2 * 110 + 4 * 35); // 360
    expect(r.blankLengthMm).toBe(170 + 10); // 180
    const bodyArea = 360 * 180;
    const bottomPanel = 110 * 45;
    expect(r.areaM2).toBeCloseTo((bodyArea + bottomPanel) / 1e6, 6);
  });

  // --- seal allowance default ---
  it('uses default seal allowance 10mm when omitted', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      pouchSubtype: 'side-gusset',
      sideGussetMm: 35,
    });
    expect(r.blankLengthMm).toBe(190 + 2 * DEFAULT_POUCH_SEAL_ALLOWANCE_MM);
  });

  // --- unresolvable subtype → falls through (caller uses face-area) ---
  it('returns zero area when subtype unresolved (caller falls back to face area)', () => {
    const r = calculatePouchFlatSheetAreaM2({ ...base });
    expect(r.areaM2).toBe(0);
    expect(r.blankWidthMm).toBe(0);
    expect(r.blankLengthMm).toBe(0);
    expect(r.type).toBeNull();
  });

  it('ignores unknown pouchSubtype string', () => {
    const r = calculatePouchFlatSheetAreaM2({ ...base, pouchSubtype: 'not-a-real-type' });
    expect(r.type).toBeNull();
    expect(r.areaM2).toBe(0);
  });

  // --- mapping table sanity ---
  it('POUCH_SUBTYPE_TO_CONFIGURATOR covers canonical, existing DB, and legacy codes', () => {
    // Canonical codes
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_three_side_seal).toBe('three-side-seal');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_center_seal).toBe('center-seal');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_four_side_seal).toBe('four-side-seal');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_stand_up).toBe('stand-up');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_side_gusset).toBe('side-gusset');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_flat_bottom).toBe('flat-bottom');
    // Existing DB codes (productCatalog / Master-Data defaults)
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_3_side_seal).toBe('three-side-seal');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_3_side_seal_zip).toBe('three-side-seal');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_stand_up_zip).toBe('stand-up');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_kseal_stand_up).toBe('stand-up');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_kseal_stand_up_zip).toBe('stand-up');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_gusset).toBe('side-gusset');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_4_side_seal).toBe('four-side-seal');
    // Legacy aliases
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_pillow).toBe('center-seal');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_doypack).toBe('stand-up');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_box).toBe('flat-bottom');
  });

  it('every DEFAULT product-subtype pouch code resolves to a configurator type', () => {
    // Hard-coded against masterDataReference.DEFAULT_PRODUCT_SUBTYPE_OPTIONS pouch rows
    // — guarantees no user-selectable pouch subtype falls through to "unresolved".
    const dbCodes = [
      'pouch_3_side_seal',
      'pouch_3_side_seal_zip',
      'pouch_stand_up',
      'pouch_stand_up_zip',
      'pouch_kseal_stand_up',
      'pouch_kseal_stand_up_zip',
      'pouch_center_seal',
      'pouch_gusset',
      'pouch_4_side_seal',
      'pouch_flat_bottom',
    ];
    for (const code of dbCodes) {
      expect(POUCH_SUBTYPE_TO_CONFIGURATOR[code]).toBeDefined();
    }
  });
});

describe('pouch-flat-sheet vs legacy face-area — regression guardrail', () => {
  it('legacy face-area model: pouch without subtype undercounts by ~62% vs corrected stand-up', () => {
    // Doc §5 worked example: legacy model gives 398 pcs/kg, corrected gives 151.5 pcs/kg.
    // The ratio is the same 2.6× error documented in POUCH_COSTING_RESEARCH.md.
    const W = 110, H = 190, BG = 50, totalGsm = 120;
    const corrected = calculatePouchFlatSheetAreaM2({
      productType: 'pouch',
      openWidthMm: W,
      openHeightMm: H,
      pouchSubtype: 'stand-up',
      bottomGussetMm: BG,
      sealAllowanceMm: 10,
    });
    const correctedPpk = 1000 / (corrected.areaM2 * totalGsm);
    const legacyFaceArea = (W * H) / 1e6;
    const legacyPpk = 1000 / (legacyFaceArea * totalGsm);
    expect(legacyPpk / correctedPpk).toBeCloseTo(2.6, 1);
  });
});
