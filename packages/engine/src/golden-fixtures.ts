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
      costPerKgUsd: 12.0,
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
        { id: '2', materialId: 'ink-sb', micron: 2, position: 1 },
        { id: '3', materialId: 'adhesive-sb', micron: 3, position: 2 },
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
      totalGsm: 66.16,
      totalMicron: 65.6,
      filmDensity: 1.0085,
      materialCostPerKg: 3.204, // layer cost/m2 + solvent/m2, converted to /kg
      solventMixCostPerKg: 0.2177, // (3.6 / 0.5) * (2.0 / 1000) = 0.0144 m2, then /kg = 0.0144 / 66.16 * 1000
      salePricePerKg: 3.9146, // 3.204 + 15% markup (0.4806) + plates (0.15) + delivery (0.08)
      piecesPerKg: 31.49,
      linearMPerKgWeb: 9.39,
      linearMPerKgReel: 18.89,
    },
  },
  {
    name: 'Narrow web UV ink — no solvent mix',
    estimate: {
      ...baseEstimate(),
      layers: [
        { id: '1', materialId: 'pet-transparent', micron: 12, position: 0 },
        { id: '2', materialId: 'ink-uv', micron: 2, position: 1 },
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
      totalGsm: 64.56,
      totalMicron: 64.0,
      filmDensity: 1.0088,
      materialCostPerKg: 2.836,
      solventMixCostPerKg: 0,
      salePricePerKg: 3.492,
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
        { id: '2', materialId: 'ink-sb', micron: 3, position: 1 },
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
      totalGsm: 37.7,
      totalMicron: 40.9,
      filmDensity: 0.9218,
      materialCostPerKg: 3.298, // layer cost/m2 + solvent/m2, converted to /kg
      solventMixCostPerKg: 0.0955, // (0.9 / 0.5) * (2.0 / 1000) = 0.0036 m2, then /kg = 0.0036 / 37.7 * 1000
      salePricePerKg: 4.023, // 3.298 + 15% markup + plates + delivery
      piecesPerKg: 221.0,
      linearMPerKgWeb: 32.83,
      linearMPerKgReel: 66.31,
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
        { id: '2', materialId: 'ink-sb', micron: 2, position: 1 },
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
      totalGsm: 53.96,
      totalMicron: 52.6,
      filmDensity: 1.0259,
      materialCostPerKg: 2.94, // layer cost/m2 + solvent/m2, converted to /kg
      salePricePerKg: 3.786, // 2.94 + 15% markup + plates + delivery + operation (incl. setup)
      operationCostPerKg: 0.175,
      linearMPerKgWeb: 11.51,
    },
  },
];
