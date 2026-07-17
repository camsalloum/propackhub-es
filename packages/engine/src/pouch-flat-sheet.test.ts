import { describe, it, expect } from 'vitest';
import {
  calculatePouchFlatSheetAreaM2,
  calculatePouchFlatGeom,
  resolvePouchConfiguratorType,
  POUCH_SUBTYPE_TO_CONFIGURATOR,
  familyForPouchType,
} from './pouch-flat-sheet';
import type { EstimateDimensions } from './types';

describe('pouch-flat-sheet v4 — Family × Variant', () => {
  const base: EstimateDimensions = {
    productType: 'pouch',
    openWidthMm: 110,
    openHeightMm: 190,
  };

  it('resolves type from pouchSubtype (v4 key)', () => {
    expect(
      resolvePouchConfiguratorType({ ...base, pouchSubtype: 'three-side-seal-standing' })
    ).toBe('three-side-seal-standing');
  });

  it('resolves type from productSubtype v4 code', () => {
    expect(
      resolvePouchConfiguratorType({ ...base, productSubtype: 'pouch_tss_flat' })
    ).toBe('three-side-seal-flat');
  });

  it('legacy productSubtype pouch_3_side_seal → three-side-seal-flat', () => {
    expect(
      resolvePouchConfiguratorType({ ...base, productSubtype: 'pouch_3_side_seal' })
    ).toBe('three-side-seal-flat');
  });

  it('legacy pouchSubtype string stand-up → three-side-seal-standing', () => {
    expect(resolvePouchConfiguratorType({ ...base, pouchSubtype: 'stand-up' })).toBe(
      'three-side-seal-standing'
    );
  });

  it('legacy pouch_kseal_stand_up → three-side-seal-standing (K-seal is weld style, same area)', () => {
    expect(
      resolvePouchConfiguratorType({ ...base, productSubtype: 'pouch_kseal_stand_up' })
    ).toBe('three-side-seal-standing');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_tss_standing_kseal).toBe('three-side-seal-standing');
  });

  it('returns null when unresolvable', () => {
    expect(resolvePouchConfiguratorType({ ...base })).toBeNull();
  });

  it('three-side-seal-flat: 2 webs, W×L each', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 150,
      openHeightMm: 200,
      pouchSubtype: 'three-side-seal-flat',
    });
    expect(r.webCount).toBe(2);
    expect(r.blankWidthMm).toBe(150);
    expect(r.blankLengthMm).toBe(200);
    expect(r.areaM2).toBeCloseTo((150 * 200 * 2) / 1e6, 6);
    expect(r.separateBottomWeb).toBe(false);
  });

  it('three-side-seal-standing: 2 webs + W×G panel, separateBottomWeb', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 110,
      openHeightMm: 220,
      bottomGussetMm: 45,
      pouchSubtype: 'three-side-seal-standing',
    });
    expect(r.webCount).toBe(2);
    expect(r.separateBottomWeb).toBe(true);
    expect(r.extraPanelAreaMm2).toBe(110 * 45);
    expect(r.areaM2).toBeCloseTo((110 * 220 * 2 + 110 * 45) / 1e6, 6);
  });

  it('center-fold-seal-flat: 1 web, height = L + S1', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 140,
      openHeightMm: 180,
      bottomSealWidthMm: 12,
      pouchSubtype: 'center-fold-seal-flat',
    });
    expect(r.webCount).toBe(1);
    expect(r.blankWidthMm).toBe(140);
    expect(r.blankLengthMm).toBe(192);
    expect(r.areaM2).toBeCloseTo((140 * 192) / 1e6, 6);
  });

  it('center-fold-seal-side-gusset: flatWidth = W + 2G', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 150,
      openHeightMm: 200,
      sideGussetMm: 35,
      bottomSealWidthMm: 12,
      pouchSubtype: 'center-fold-seal-side-gusset',
    });
    expect(r.blankWidthMm).toBe(150 + 70);
    expect(r.blankLengthMm).toBe(212);
  });

  it('center-fold-seal-standing: flatHeight = L + G/2', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 130,
      openHeightMm: 200,
      bottomGussetMm: 40,
      pouchSubtype: 'center-fold-seal-standing',
    });
    expect(r.blankWidthMm).toBe(130);
    expect(r.blankLengthMm).toBe(200 + 20);
  });

  it('half-fold-fusion-flat: flatWidth = 2W', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 150,
      openHeightMm: 280,
      pouchSubtype: 'half-fold-fusion-flat',
    });
    expect(r.webCount).toBe(1);
    expect(r.blankWidthMm).toBe(300);
    expect(r.blankLengthMm).toBe(280);
  });

  it('half-fold-fusion-standing: flatHeight = L − G + W×G panel', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 150,
      openHeightMm: 300,
      bottomGussetMm: 55,
      pouchSubtype: 'half-fold-fusion-standing',
    });
    expect(r.separateBottomWeb).toBe(true);
    expect(r.blankWidthMm).toBe(300);
    expect(r.blankLengthMm).toBe(245);
    expect(r.extraPanelAreaMm2).toBe(150 * 55);
    expect(r.areaM2).toBeCloseTo((300 * 245 + 150 * 55) / 1e6, 6);
  });

  it('side-weld-side-gusset: W+2G × (L−G)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 180,
      openHeightMm: 220,
      sideGussetMm: 45,
      pouchSubtype: 'side-weld-side-gusset',
    });
    expect(r.blankWidthMm).toBe(270);
    expect(r.blankLengthMm).toBe(175);
  });

  it('oblique: base W×L, webCount 1 (angle is scrap)', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 450,
      openHeightMm: 400,
      cutAngleDeg: 10,
      pouchSubtype: 'oblique-side-weld-trapezoid',
    });
    expect(r.webCount).toBe(1);
    expect(r.areaM2).toBeCloseTo((450 * 400) / 1e6, 6);
  });

  it('flat-bottom-box: webCount 3, flatWidth = W+D, + W×D panel', () => {
    const r = calculatePouchFlatSheetAreaM2({
      ...base,
      openWidthMm: 130,
      openHeightMm: 280,
      bottomDepthMm: 90,
      pouchSubtype: 'flat-bottom-box-standing',
    });
    expect(r.webCount).toBe(3);
    expect(r.separateBottomWeb).toBe(true);
    expect(r.blankWidthMm).toBe(220);
    expect(r.blankLengthMm).toBe(280);
    expect(r.extraPanelAreaMm2).toBe(130 * 90);
    expect(r.areaM2).toBeCloseTo((220 * 280 * 3 + 130 * 90) / 1e6, 6);
  });

  it('calculatePouchFlatGeom matches area helper', () => {
    const g = calculatePouchFlatGeom('three-side-seal-flat', {
      W: 100,
      L: 200,
      G: 0,
      S1: 12,
      D: 0,
    });
    expect(g.webCount).toBe(2);
    expect(g.flatWidth * g.flatHeight * g.webCount).toBe(40000);
  });

  it('familyForPouchType groups variants', () => {
    expect(familyForPouchType('half-fold-fusion-standing')).toBe('half-fold-fusion');
    expect(familyForPouchType('flat-bottom-box-standing')).toBe('flat-bottom-box');
  });

  it('POUCH_SUBTYPE_TO_CONFIGURATOR covers v4 + legacy codes', () => {
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_tss_flat).toBe('three-side-seal-flat');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_fbb_standing).toBe('flat-bottom-box-standing');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_3_side_seal).toBe('three-side-seal-flat');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_stand_up).toBe('three-side-seal-standing');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_4_side_seal).toBe('center-fold-seal-flat');
    expect(POUCH_SUBTYPE_TO_CONFIGURATOR.pouch_gusset).toBe('center-fold-seal-side-gusset');
  });

  it('every v4 DEFAULT product-subtype code resolves', () => {
    const dbCodes = [
      'pouch_tss_flat',
      'pouch_tss_standing',
      'pouch_tss_standing_kseal',
      'pouch_cfs_flat',
      'pouch_cfs_side_gusset',
      'pouch_cfs_standing',
      'pouch_hff_flat',
      'pouch_hff_standing',
      'pouch_sw_flat',
      'pouch_sw_side_gusset',
      'pouch_osw_trapezoid',
      'pouch_osw_triangle',
      'pouch_fbb_standing',
    ];
    for (const code of dbCodes) {
      expect(POUCH_SUBTYPE_TO_CONFIGURATOR[code]).toBeDefined();
    }
  });

  it('returns zero area when subtype unresolved', () => {
    const r = calculatePouchFlatSheetAreaM2({ ...base });
    expect(r.areaM2).toBe(0);
    expect(r.type).toBeNull();
  });
});
