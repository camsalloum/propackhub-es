import { describe, it, expect } from 'vitest';
import { calculatePouchAccessories } from './pouch-accessories';
import type { EstimateDimensions, Material } from './types';

const noMaterials = new Map<string, Material>();

function dims(accessories: EstimateDimensions['accessories']): EstimateDimensions {
  return { productType: 'pouch', openWidthMm: 120, openHeightMm: 180, accessories } as EstimateDimensions;
}

describe('pouch-accessories — window patch', () => {
  it('substrate-linked patch: priced & weighed by its own film, not the structure blank', () => {
    // 60×80 mm patch = 0.0048 m². Substrate 30µ × 0.92 g/cm³ → gsm 27.6 → $/m² at $2/kg = 0.0552
    const res = calculatePouchAccessories(
      dims([
        {
          kind: 'window',
          enabled: true,
          widthMm: 60,
          heightMm: 80,
          costPerM2Usd: 0.0552,
          weightGramPerM2: 27.6,
        },
      ]),
      noMaterials
    );
    const areaM2 = (60 * 80) / 1e6; // 0.0048
    expect(res.filmAreaM2).toBeCloseTo(0, 9); // NOT folded into the structure blank
    expect(res.costUsdPerPiece).toBeCloseTo(areaM2 * 0.0552, 9);
    expect(res.weightGramPerPiece).toBeCloseTo(areaM2 * 27.6, 9);
  });

  it('legacy patch (no rates): falls back to weighing area at the structure GSM', () => {
    const res = calculatePouchAccessories(
      dims([{ kind: 'window', enabled: true, widthMm: 60, heightMm: 80 }]),
      noMaterials
    );
    const areaM2 = (60 * 80) / 1e6;
    expect(res.filmAreaM2).toBeCloseTo(areaM2, 9);
    expect(res.costUsdPerPiece).toBe(0);
    expect(res.weightGramPerPiece).toBe(0);
  });

  it('disabled patch contributes nothing', () => {
    const res = calculatePouchAccessories(
      dims([{ kind: 'window', enabled: false, widthMm: 60, heightMm: 80, costPerM2Usd: 1, weightGramPerM2: 1 }]),
      noMaterials
    );
    expect(res).toEqual({ weightGramPerPiece: 0, costUsdPerPiece: 0, filmAreaM2: 0 });
  });
});
