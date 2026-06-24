/**
 * Laravel reference rows — COSTING_NOTES.md §3–7, ES_STANDARD_TEMPLATES_SEED (Laminates).
 * Material costs from master-materials-seed.json (tenant library copy).
 */
import type { Estimate, Material } from './types';

export const LARAVEL_REFERENCE_MATERIALS = new Map<string, Material>([
  [
    'pet-transparent',
    {
      id: 'pet-transparent',
      name: 'PET Transparent',
      type: 'substrate',
      solidPercent: 100,
      density: 1.38,
      costPerKgUsd: 2.8,
      wastePercent: 5,
      isSolventBased: false,
    },
  ],
  [
    'ink-sb',
    {
      id: 'ink-sb',
      name: 'Ink SB (Solvent Based)',
      type: 'ink',
      solidPercent: 30,
      density: 1.0,
      // costPerKgUsd is the dry-equivalent cost: liquidPrice / solidFraction = 12.0 / 0.30 = 40.0
      // The engine uses (dry_gsm/1000) × costPerKgUsd_dry_equiv for cost/m²
      costPerKgUsd: 40.0,
      wastePercent: 10,
      isSolventBased: true,
    },
  ],
  [
    'adhesive-sb',
    {
      id: 'adhesive-sb',
      name: 'Adhesive SB (Solvent Based)',
      type: 'adhesive',
      solidPercent: 100,
      density: 1.0,
      // 100% solid: dry-equiv = liquid price = 6.5
      costPerKgUsd: 6.5,
      wastePercent: 8,
      isSolventBased: true,
    },
  ],
  [
    'ldpe-natural',
    {
      id: 'ldpe-natural',
      name: 'LDPE Natural',
      type: 'substrate',
      solidPercent: 100,
      density: 0.92,
      costPerKgUsd: 2.1,
      wastePercent: 5,
      isSolventBased: false,
    },
  ],
  [
    'ink-uv',
    {
      id: 'ink-uv',
      name: 'Ink UV',
      type: 'ink',
      solidPercent: 100,
      density: 1.0,
      costPerKgUsd: 15.0,
      wastePercent: 10,
      isSolventBased: false,
    },
  ],
  [
    'aluminium-foil',
    {
      id: 'aluminium-foil',
      name: 'Aluminium Foil',
      type: 'substrate',
      solidPercent: 100,
      density: 2.7,
      costPerKgUsd: 8.5,
      wastePercent: 5,
      isSolventBased: false,
    },
  ],
]);

const baseEstimate = (): Omit<Estimate, 'layers' | 'dimensions'> => ({
  id: 'golden',
  tenantId: 'tenant-golden',
  jobName: 'Laravel reference',
  status: 'draft',
  markupPercent: 15,
  platesPerKg: 0.15,
  deliveryPerKg: 0.08,
  orderQuantityKg: 2000,
  displayCurrencyCode: 'USD',
  exchangeRateUsdToDisplay: 1,
  solventCostPerKgUsd: 2.0,
  solventRatio: 0.5,
  processes: [],
  slabs: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

export interface GoldenScenario {
  name: string;
  estimate: Estimate;
  expected: {
    totalGsm: number;
    totalMicron: number;
    filmDensity: number;
    materialCostPerKg: number;
    solventMixCostPerKg?: number;
    salePricePerKg: number;
    piecesPerKg?: number;
    linearMPerKgWeb?: number;
    linearMPerKgReel?: number;
    operationCostPerKg?: number;
  };
}

/** Laminates template default stack — wide web, roll 800×600, 2-up + 10mm trim */
export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    name: 'Laminates duplex (PET/Ink SB/Adhesive SB/LDPE)',
    estimate: {
      ...baseEstimate(),
      layers: [
        { id: '1', materialId: 'pet-transparent', micron: 12, position: 0 },
        { id: '2', materialId: 'ink-sb', micron: 2, position: 1 },   // 2 gsm dry ink
        { id: '3', materialId: 'adhesive-sb', micron: 3, position: 2 }, // 3 gsm dry adhesive
        { id: '4', materialId: 'ldpe-natural', micron: 50, position: 3 },
      ],
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
        piecesPerCut: 1,
        printingWebClass: 'wide_web',
      },
    },
    expected: {
      // New model: ink/adhesive layer.micron = dry gsm
      // totalGsm = 16.56 + 2 + 3 + 46 = 67.56
      // totalMicron = 12 + 2 + 3 + 50 = 67
      // ink cost/m²  = (2/0.3)/1000 × 12 = 0.0800
      // adh cost/m²  = (3/1.0)/1000 × 6.5 = 0.0195
      // pet cost/m²  = (16.56/1000) × 2.8 = 0.04637
      // ldpe cost/m² = (46/1000) × 2.1   = 0.09660
      // solvent: sb_gsm=5, cost/m² = (5/0.5)×(2/1000) = 0.020
      // materialCost = (0.2425+0.020)/67.56×1000 = 3.888
      totalGsm: 67.56,
      totalMicron: 67.0,
      filmDensity: 1.0082,
      materialCostPerKg: 3.888,
      solventMixCostPerKg: 0.2960,
      salePricePerKg: 4.698,
      piecesPerKg: 30.86,
      linearMPerKgWeb: 9.22,
      linearMPerKgReel: 18.54,
    },
  },
  {
    name: 'Narrow web UV ink — no solvent mix',
    estimate: {
      ...baseEstimate(),
      layers: [
        { id: '1', materialId: 'pet-transparent', micron: 12, position: 0 },
        { id: '2', materialId: 'ink-uv', micron: 2, position: 1 }, // 2 gsm dry UV ink (100% solid → same)
        { id: '3', materialId: 'ldpe-natural', micron: 50, position: 2 },
      ],
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        numberOfUps: 1,
        extraPrintingTrimMm: 5,
        piecesPerCut: 1,
        printingWebClass: 'narrow_web',
      },
    },
    expected: {
      // UV 100% solid: cost/m² = (2/1.0)/1000 × 15 = 0.030 (same as before)
      // totalGsm = 16.56 + 2 + 46 = 64.56
      // totalMicron = 12 + 2 + 50 = 64
      totalGsm: 64.56,
      totalMicron: 64.0,
      filmDensity: 1.0088,
      materialCostPerKg: 2.678, // UV unchanged
      solventMixCostPerKg: 0,
      salePricePerKg: 3.310,
      piecesPerKg: 32.27,
      linearMPerKgWeb: 19.24,
      linearMPerKgReel: 19.36,
    },
  },
  {
    name: 'Shrink sleeve — pieces/kg and LM/kg reel path',
    estimate: {
      ...baseEstimate(),
      layers: [
        { id: '1', materialId: 'ldpe-natural', micron: 40, position: 0 },
        { id: '2', materialId: 'ink-sb', micron: 3, position: 1 }, // 3 gsm dry SB ink
      ],
      dimensions: {
        productType: 'sleeve',
        reelWidthMm: 400,
        cutoffMm: 300,
        numberOfUps: 2,
        extraPrintingTrimMm: 8,
        printingWebClass: 'wide_web',
      },
    },
    expected: {
      // totalGsm = 36.8 + 3 = 39.8 ; totalMicron = 40 + 3 = 43
      // ink cost/m² = (3/0.3)/1000 × 12 = 0.12
      // ldpe cost/m² = (36.8/1000) × 2.1 = 0.07728
      // solvent: sb_gsm=3, cost/m² = (3/0.5)×(2/1000) = 0.012
      // materialCost = (0.07728+0.12+0.012)/39.8×1000 = 5.249
      totalGsm: 39.8,
      totalMicron: 43.0,
      filmDensity: 0.9256,
      materialCostPerKg: 5.258,
      solventMixCostPerKg: 0.3015,
      salePricePerKg: 6.277,
      piecesPerKg: 209.4,
      linearMPerKgWeb: 31.09,
      linearMPerKgReel: 62.81,
    },
  },
  {
    name: 'Operation cost — printing m/min drives sale price',
    estimate: {
      ...baseEstimate(),
      orderQuantityKg: 1000,
      processes: [
        {
          id: 'p1',
          name: 'Printing',
          costPerHour: 120,
          speedBasis: 'm_per_min',
          speedValue: 200,
          setupHours: 0.5,
          enabled: true,
        },
      ],
      layers: [
        { id: '1', materialId: 'pet-transparent', micron: 12, position: 0 },
        { id: '2', materialId: 'ink-sb', micron: 2, position: 1 }, // 2 gsm dry SB ink
        { id: '3', materialId: 'ldpe-natural', micron: 40, position: 2 },
      ],
      dimensions: {
        productType: 'roll',
        reelWidthMm: 800,
        cutoffMm: 600,
        numberOfUps: 2,
        extraPrintingTrimMm: 10,
        piecesPerCut: 1,
        printingWebClass: 'wide_web',
      },
    },
    expected: {
      // totalGsm = 16.56 + 2 + 36.8 = 55.36 ; totalMicron = 12+2+40 = 54
      // ink cost/m² = (2/0.3)/1000×12 = 0.08
      // pet cost/m² = (16.56/1000)×2.8 = 0.04637
      // ldpe cost/m² = (36.8/1000)×2.1 = 0.07728
      // solvent: sb_gsm=2, cost/m²=(2/0.5)×(2/1000)=0.008
      // matCost = (0.04637+0.08+0.07728+0.008)/55.36×1000 = 3.832
      totalGsm: 55.36,
      totalMicron: 54.0,
      filmDensity: 1.0252,
      materialCostPerKg: 3.823,
      salePricePerKg: 4.799,
      operationCostPerKg: 0.175,
      linearMPerKgWeb: 11.25,
    },
  },
];
