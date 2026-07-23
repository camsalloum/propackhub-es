import PriceListPanel, { type PriceListUnit } from '../../../components/PriceListPanel';
import type { WasteBand, OperatingCostMethod } from '@es/engine';
import type { OrderQtyMetrics } from './EstimateEditorYieldAndOrder';
import type { PriceListPricingInput } from '../../../lib/priceListPricing';

export type PriceListCalcEstimate = {
  totalGsm?: number | null;
  materialCostPerKg?: number | null;
  logisticsCostPerKg?: number | null;
  developmentCostPerKg?: number | null;
  accessoryCostPerKg?: number | null;
  operationCostPerKg?: number | null;
};

export type EstimateEditorPriceListSectionProps = {
  hidePriceListTab: boolean;
  activeSection: 'structure' | 'dimensions' | 'slabs';
  clientCalcResult: { estimate: PriceListCalcEstimate } | null | undefined;
  totalGsm: number;
  orderQtyMetrics: OrderQtyMetrics;
  dimensions: { orderUnitMultiplier?: number; reelWidthMm?: number } | null | undefined;
  allowedUnitBases: Set<string>;
  requiresRollLength: boolean;
  wasteBands: WasteBand[];
  pricingMethod: PriceListPricingInput['pricingMethod'];
  markupPercent: number;
  marginValuePerKgDisplay: number;
  estimateFxRate: number;
  estimateDisplayCurrency: string;
  operatingCostMethod: OperatingCostMethod | null | undefined;
  tenantOperatingCostMethod: OperatingCostMethod | null | undefined;
  profitMarginPercent: number;
  baseCormDisplay: number;
  cormScaleWithWaste: number;
  moqKg: number | null;
};

/** Price list tab — unit / slabs / selling price panel. */
export function EstimateEditorPriceListSection({
  hidePriceListTab,
  activeSection,
  clientCalcResult,
  totalGsm,
  orderQtyMetrics,
  dimensions,
  allowedUnitBases,
  requiresRollLength,
  wasteBands,
  pricingMethod,
  markupPercent,
  marginValuePerKgDisplay,
  estimateFxRate,
  estimateDisplayCurrency,
  operatingCostMethod,
  tenantOperatingCostMethod,
  profitMarginPercent,
  baseCormDisplay,
  cormScaleWithWaste,
  moqKg,
}: EstimateEditorPriceListSectionProps) {
  if (hidePriceListTab || activeSection !== 'slabs') return null;

  if (!clientCalcResult) {
    return (
      <div className="card">
        <p className="text-sm text-mist">Add layers with materials to see the price list.</p>
      </div>
    );
  }

  const ce = clientCalcResult.estimate;
  const gsmLocal = ce.totalGsm ?? totalGsm ?? 0;
  const piecesPerKg = orderQtyMetrics.piecesPerKg;
  const lmPerKg = orderQtyMetrics.lmPerKgReel;
  const rollLengthLm = Number(dimensions?.orderUnitMultiplier) || 0;
  const widthM = (dimensions?.reelWidthMm ?? 0) / 1000;
  const canLm =
    allowedUnitBases.has('lm') &&
    ((lmPerKg != null && lmPerKg > 0) || (gsmLocal > 0 && widthM > 0));
  const canPieces =
    allowedUnitBases.has('pieces') && piecesPerKg != null && piecesPerKg > 0;
  const priceListUnits: PriceListUnit[] = ['kg'];
  if (gsmLocal > 0 && allowedUnitBases.has('sqm')) priceListUnits.push('m2');
  if (canLm) priceListUnits.push('lm');
  if (canLm && requiresRollLength && rollLengthLm > 0) priceListUnits.push('roll');
  if (canPieces) {
    priceListUnits.push('pc');
    priceListUnits.push('kpcs');
  }

  return (
    <PriceListPanel
      wasteBands={wasteBands}
      materialPerKgUsd={ce.materialCostPerKg ?? 0}
      logisticsPerKgUsd={ce.logisticsCostPerKg ?? 0}
      developmentPerKgUsd={ce.developmentCostPerKg ?? 0}
      accessoryPerKgUsd={ce.accessoryCostPerKg ?? 0}
      pricingMethod={pricingMethod}
      markupPercent={markupPercent}
      marginValuePerKgDisplay={marginValuePerKgDisplay}
      estimateFxRate={estimateFxRate}
      estimateDisplayCurrency={estimateDisplayCurrency}
      totalGsm={gsmLocal}
      piecesPerKg={piecesPerKg}
      lmPerKgReel={lmPerKg}
      reelWidthMm={dimensions?.reelWidthMm ?? 0}
      rollLengthLm={rollLengthLm}
      availableUnits={priceListUnits}
      operatingCostMethod={operatingCostMethod ?? tenantOperatingCostMethod ?? undefined}
      mfgProcessPerKgUsd={ce.operationCostPerKg ?? 0}
      profitMarginPercent={profitMarginPercent}
      baseCormDisplay={baseCormDisplay}
      cormScaleWithWaste={cormScaleWithWaste}
      moqKg={moqKg}
    />
  );
}
