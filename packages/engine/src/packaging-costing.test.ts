import { describe, it, expect } from 'vitest';
import {
  calculatePackagingCosts,
  coreMetersForJob,
  ldWrapPerRoll,
  mergePackagingConfigDefaults,
  cartonPlatformKeyForOd,
  resolvePackagingUnitPrice,
  stretchFractionPerPallet,
  DEFAULT_LOAD_PER_PALLET_KG,
} from './packaging-costing';
import type { Estimate, Material } from './types';

function pkg(
  id: string,
  key: string,
  opts: {
    priceUnit: string;
    unitPriceUsd: number;
    costPerKgUsd?: number;
    costPerMeterUsd?: number;
    costPerPieceUsd?: number;
  }
): Material {
  return {
    id,
    name: key,
    type: 'packaging',
    solidPercent: 100,
    density: 1,
    costPerKgUsd: opts.costPerKgUsd ?? (opts.priceUnit === 'kgs' ? opts.unitPriceUsd : 0),
    wastePercent: 0,
    platformMasterKey: key,
    priceUnit: opts.priceUnit,
    unitPriceUsd: opts.unitPriceUsd,
    costPerMeterUsd: opts.costPerMeterUsd ?? (opts.priceUnit === 'mtr' ? opts.unitPriceUsd : null),
    costPerPieceUsd:
      opts.costPerPieceUsd ??
      (opts.priceUnit === 'pcs' || opts.priceUnit === 'rol' ? opts.unitPriceUsd : null),
  };
}

const core76 = pkg('c76', 'packaging-core-76', { priceUnit: 'mtr', unitPriceUsd: 1.88 });
const ldWrap = pkg('ld', 'packaging-ld-wrap-film', { priceUnit: 'kgs', unitPriceUsd: 1.37 });
const stretch = pkg('st', 'packaging-stretch-wrap-roll', { priceUnit: 'rol', unitPriceUsd: 7.9 });
const pallet = pkg('pl', 'packaging-pallet-wood', { priceUnit: 'pcs', unitPriceUsd: 7.53 });
const carton = pkg('ct', 'packaging-carton-default', { priceUnit: 'pcs', unitPriceUsd: 0.77 });
const cartonSleeve600 = pkg('ct600', 'packaging-carton-sleeve-600', {
  priceUnit: 'pcs',
  unitPriceUsd: 1.05,
});

const materials = new Map<string, Material>([
  [core76.id, core76],
  [ldWrap.id, ldWrap],
  [stretch.id, stretch],
  [pallet.id, pallet],
  [carton.id, carton],
  [cartonSleeve600.id, cartonSleeve600],
]);

function baseEstimate(partial: Partial<Estimate> & { dimensions: Estimate['dimensions'] }): Estimate {
  return {
    id: 'e1',
    tenantId: 't1',
    jobName: 'pkg',
    status: 'draft',
    layers: [
      {
        id: 'l1',
        materialId: 'pet',
        micron: 12,
        position: 1,
      },
    ],
    markupPercent: 0,
    platesPerKg: 0,
    deliveryPerKg: 0,
    processes: [],
    slabs: [],
    displayCurrencyCode: 'USD',
    exchangeRateUsdToDisplay: 1,
    orderQuantityKg: 800,
    packagingConfig: {
      loadPerPalletKg: 800,
      cartonsPerPallet: 20,
      pcsPerCarton: 1000,
      coreMaterialId: core76.id,
      ldWrapMaterialId: ldWrap.id,
      stretchMaterialId: stretch.id,
      palletMaterialId: pallet.id,
      cartonMaterialId: carton.id,
    },
    ...partial,
  };
}

describe('packaging helpers', () => {
  it('core meters = reel width × rolls', () => {
    expect(coreMetersForJob(800, 10)).toBeCloseTo(8, 5);
  });

  it('stretch fraction for 1×1 m × 4 layers = 20/500', () => {
    expect(stretchFractionPerPallet({})).toBeCloseTo(0.04, 5);
  });

  it('ld wrap returns area and kg from OD', () => {
    const w = ldWrapPerRoll(600, { ldWrapPasses: 2, ldWrapFilmWidthMm: 500, ldWrapGsm: 25 });
    expect(w.areaM2).toBeGreaterThan(0);
    expect(w.kg).toBeGreaterThan(0);
  });

  it('resolvePackagingUnitPrice flags missing price as needsReview', () => {
    const r = resolvePackagingUnitPrice({
      id: 'x',
      name: 'x',
      type: 'packaging',
      solidPercent: 100,
      density: 1,
      costPerKgUsd: 0,
      wastePercent: 0,
      priceUnit: 'pcs',
      unitPriceUsd: 0,
    });
    expect(r.needsReview).toBe(true);
  });

  it('mergePackagingConfigDefaults fills missing fields', () => {
    const m = mergePackagingConfigDefaults({ loadPerPalletKg: 900 });
    expect(m.loadPerPalletKg).toBe(900);
    expect(m.cartonsPerPallet).toBe(20);
    expect(m.pcsPerCarton).toBe(1000);
  });
});

describe('calculatePackagingCosts — roll', () => {
  it('includes core, ld wrap, stretch, pallet', () => {
    const estimate = baseEstimate({
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        numberOfUps: 1,
        rollSpecOdDriven: 1,
        rollOutsideDiameterMm: 600,
        coreInsideDiameterMm: 76.2,
        coreThicknessMm: 12,
      },
    });
    const result = calculatePackagingCosts(estimate, materials, {
      orderQuantityKg: 800,
      totalGsm: 50,
      filmDensity: 1,
      piecesPerKg: 0,
    });
    expect(result.lines.map((l) => l.role)).toEqual(['core', 'ld_wrap', 'stretch', 'pallet']);
    expect(result.palletsInOrder).toBe(1);
    expect(result.totalCostPerKg).toBeGreaterThan(0);
    expect(result.needsReview).toBe(false);
    expect(result.lines.every((l) => !l.needsReview)).toBe(true);
  });

  it('marks line needsReview when material unpriced — no silent fallback', () => {
    const unpriced = { ...pallet, unitPriceUsd: 0, costPerPieceUsd: 0, costPerKgUsd: 0 };
    const map = new Map(materials);
    map.set(pallet.id, unpriced);
    const estimate = baseEstimate({
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        rollSpecOdDriven: 1,
        rollOutsideDiameterMm: 600,
        coreInsideDiameterMm: 76.2,
      },
    });
    const result = calculatePackagingCosts(estimate, map, {
      orderQuantityKg: 800,
      totalGsm: 50,
      filmDensity: 1,
      piecesPerKg: 0,
    });
    const palletLine = result.lines.find((l) => l.role === 'pallet')!;
    expect(palletLine.needsReview).toBe(true);
    expect(palletLine.costJobUsd).toBe(0);
    expect(result.needsReview).toBe(true);
  });

  it('uses loadPerPalletKg for pallet count', () => {
    const estimate = baseEstimate({
      orderQuantityKg: 1600,
      packagingConfig: {
        loadPerPalletKg: DEFAULT_LOAD_PER_PALLET_KG,
        coreMaterialId: core76.id,
        ldWrapMaterialId: ldWrap.id,
        stretchMaterialId: stretch.id,
        palletMaterialId: pallet.id,
      },
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        rollSpecOdDriven: 1,
        rollOutsideDiameterMm: 600,
        coreInsideDiameterMm: 76.2,
      },
    });
    const result = calculatePackagingCosts(estimate, materials, {
      orderQuantityKg: 1600,
      totalGsm: 50,
      filmDensity: 1,
      piecesPerKg: 0,
    });
    expect(result.palletsInOrder).toBe(2);
  });
});

describe('calculatePackagingCosts — sleeve', () => {
  it('uses cartonsPerPallet and 600 OD pack roll; no ld wrap', () => {
    const estimate = baseEstimate({
      orderQuantityKg: 500,
      packagingConfig: {
        cartonsPerPallet: 10,
        coreMaterialId: core76.id,
        cartonMaterialId: carton.id,
        stretchMaterialId: stretch.id,
        palletMaterialId: pallet.id,
      },
      dimensions: {
        productType: 'sleeve',
        layFlatValue: 400,
        cutoffMm: 200,
        coreInsideDiameterMm: 76.2,
        coreThicknessMm: 12,
      },
    });
    const result = calculatePackagingCosts(estimate, materials, {
      orderQuantityKg: 500,
      totalGsm: 40,
      filmDensity: 1.3,
      piecesPerKg: 0,
    });
    expect(result.lines.map((l) => l.role)).toEqual(['core', 'carton', 'stretch', 'pallet']);
    expect(result.lines.find((l) => l.role === 'ld_wrap')).toBeUndefined();
    expect(result.cartonsNeeded).toBe(result.rollsInOrder);
    expect(result.palletsInOrder).toBe(Math.ceil(result.cartonsNeeded / 10));
  });

  it('defaults carton to packaging-carton-sleeve-600 for 600 OD', () => {
    expect(cartonPlatformKeyForOd(600)).toBe('packaging-carton-sleeve-600');
    const estimate = baseEstimate({
      orderQuantityKg: 500,
      packagingConfig: {
        cartonsPerPallet: 20,
        coreMaterialId: core76.id,
        stretchMaterialId: stretch.id,
        palletMaterialId: pallet.id,
      },
      dimensions: {
        productType: 'sleeve',
        layFlatValue: 400,
        cutoffMm: 200,
        coreInsideDiameterMm: 76.2,
        coreThicknessMm: 12,
      },
    });
    const result = calculatePackagingCosts(estimate, materials, {
      orderQuantityKg: 500,
      totalGsm: 40,
      filmDensity: 1.3,
      piecesPerKg: 0,
    });
    const cartonLine = result.lines.find((l) => l.role === 'carton');
    expect(cartonLine?.unitPriceUsd).toBe(1.05);
    expect(cartonLine?.needsReview).toBe(false);
  });
});

describe('calculatePackagingCosts — pouch', () => {
  it('carton + stretch + pallet only', () => {
    const estimate = baseEstimate({
      orderQuantityKg: 100,
      packagingConfig: {
        pcsPerCarton: 500,
        cartonsPerPallet: 20,
        cartonMaterialId: carton.id,
        stretchMaterialId: stretch.id,
        palletMaterialId: pallet.id,
      },
      dimensions: {
        productType: 'pouch',
        openWidthMm: 200,
        openHeightMm: 300,
      },
    });
    const result = calculatePackagingCosts(estimate, materials, {
      orderQuantityKg: 100,
      totalGsm: 80,
      filmDensity: 1,
      piecesPerKg: 50,
    });
    expect(result.lines.map((l) => l.role)).toEqual(['carton', 'stretch', 'pallet']);
    // 100 kg × 50 pcs/kg = 5000 pcs → 10 cartons → 1 pallet
    expect(result.cartonsNeeded).toBe(10);
    expect(result.palletsInOrder).toBe(1);
  });
});
