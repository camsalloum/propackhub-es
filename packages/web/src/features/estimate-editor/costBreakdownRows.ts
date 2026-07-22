import type { OperatingCostMethod } from '@es/engine';
import { operatingCostMethodRowLabel } from '@es/engine';
import { buildRmTotals, type CostSummaryEstimate } from './costSummaryMetrics';

export type CostBreakdownLayer = {
  materialId?: string;
  materialType?: string;
  gsm?: number;
  costPerKgUsd?: number;
};

export type CostBreakdownMaterial = {
  id: string;
  type?: string;
  substrateFamily?: string | null;
};

export type CostBreakdownRow = {
  label: string;
  kgVal: number;
  m2Val?: number;
  strong?: boolean;
  show?: boolean;
};

export function buildCostBreakdownRows(input: {
  estimate: CostSummaryEstimate | null | undefined;
  layers: CostBreakdownLayer[];
  materials: CostBreakdownMaterial[];
  solventTotalPerM2Usd: number;
  packagingTotalPerKgUsd: number;
  packagingTotalPerM2Usd: number;
  consumablesTotalPerKgUsd: number;
  consumablesTotalPerM2Usd: number;
  operatingCostMethod?: OperatingCostMethod | null;
  fallbackSalePerKg?: number;
}): CostBreakdownRow[] {
  const ce = input.estimate;
  const gsmLocal = ce?.totalGsm ?? 0;
  const showM2 = gsmLocal > 0;
  const m2ToKg = (v: number) => (gsmLocal > 0 ? (v / gsmLocal) * 1000 : 0);
  const kgToM2 = (v: number) => (showM2 ? v * (gsmLocal / 1000) : 0);

  let subM2 = 0;
  let inkAdhM2 = 0;
  let pkgM2 = 0;
  for (const l of input.layers) {
    const mat = input.materials.find((m) => m.id === l.materialId);
    const fam = (mat?.substrateFamily ?? '').toLowerCase();
    const t = (l.materialType || mat?.type || 'substrate') as string;
    const lineM2 = ((l.gsm || 0) / 1000) * (l.costPerKgUsd || 0);
    if (t === 'substrate') {
      if (fam === 'packaging') pkgM2 += lineM2;
      else subM2 += lineM2;
    } else if (t === 'ink' || t === 'adhesive') {
      inkAdhM2 += lineM2;
    }
  }
  inkAdhM2 += input.solventTotalPerM2Usd;

  const substratesKg = m2ToKg(subM2);
  const inkAdhKg = m2ToKg(inkAdhM2);
  const packagingKg = m2ToKg(pkgM2);
  const rm = buildRmTotals(ce, input.solventTotalPerM2Usd, input.packagingTotalPerM2Usd);
  const materialNoWasteKg = rm?.materialNoWastePerKg ?? substratesKg + inkAdhKg + packagingKg;
  const totalRmKg = rm?.totalRmPerKg ?? materialNoWasteKg;
  const wasteKg = rm?.wastePerKg ?? Math.max(0, totalRmKg - materialNoWasteKg);
  const wasteM2 = rm?.wastePerM2 ?? 0;
  const totalRmM2 = rm?.totalRmPerM2 ?? (showM2 ? kgToM2(totalRmKg) : 0);

  const method = input.operatingCostMethod ?? undefined;
  const mfgOpKg = ce?.operationCostPerKg ?? 0;
  const profitKg = ce?.profitMarginPerKg ?? 0;
  const prepressKg = ce?.developmentCostPerKg ?? 0;
  const transportKg = ce?.logisticsCostPerKg ?? 0;
  const accessoryKg = ce?.accessoryCostPerKg ?? 0;
  const saleKg = ce?.salePricePerKg ?? input.fallbackSalePerKg ?? 0;

  const rows: CostBreakdownRow[] = [
    { label: 'Substrates', kgVal: substratesKg, m2Val: subM2 },
    { label: 'Ink, Solvent, Adhesive & Coating', kgVal: inkAdhKg, m2Val: inkAdhM2 },
    { label: 'Waste', kgVal: wasteKg, m2Val: wasteM2 },
    {
      label: 'Packaging',
      kgVal: input.packagingTotalPerKgUsd || packagingKg,
      m2Val: input.packagingTotalPerM2Usd || pkgM2,
      show: (input.packagingTotalPerKgUsd || packagingKg) > 0,
    },
    {
      label: 'Consumables',
      kgVal: input.consumablesTotalPerKgUsd,
      m2Val: input.consumablesTotalPerM2Usd,
      show: input.consumablesTotalPerKgUsd > 0,
    },
    { label: 'Total RM', kgVal: totalRmKg, m2Val: totalRmM2, strong: true },
    {
      label: operatingCostMethodRowLabel(method),
      kgVal: mfgOpKg,
      m2Val: kgToM2(mfgOpKg),
    },
  ];

  if (method === 'process_per_kg') {
    rows.push({
      label: 'Profit margin',
      kgVal: profitKg,
      m2Val: kgToM2(profitKg),
    });
  }

  rows.push(
    { label: 'PrePress', kgVal: prepressKg, m2Val: kgToM2(prepressKg), show: prepressKg > 0 },
    {
      label: 'Transportation',
      kgVal: transportKg,
      m2Val: kgToM2(transportKg),
      show: transportKg > 0,
    },
    {
      label: 'Accessories',
      kgVal: accessoryKg,
      m2Val: kgToM2(accessoryKg),
      show: accessoryKg > 0,
    },
    { label: 'Selling price', kgVal: saleKg, m2Val: kgToM2(saleKg), strong: true }
  );

  return rows;
}
