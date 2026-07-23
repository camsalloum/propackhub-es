import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import { usdToDisplay, usdToDisplayPrecise } from '../../../lib/currency';
import type { OrderQtyMetrics } from '../sections/EstimateEditorYieldAndOrder';

export type SellingPriceRow = { text: string; title?: string };

export type StructureColumn = { key: string; track: string; label: ReactNode };

type ClientCalcEstimate = {
  sqmPerKg?: number | null;
  orderQuantityKgConverted?: number | null;
  orderQuantityKpcs?: number | null;
  orderQuantitySqm?: number | null;
  orderQuantityMetersReel?: number | null;
  piecesPerKg?: number | null;
  gramsPerPiece?: number | null;
  linearMPerKgReel?: number | null;
  salePricePerKg?: number | null;
  totalGsm?: number | null;
} | null | undefined;

export type UseEstimateEditorDerivedArgs = {
  showStructureCosts: boolean;
  showLayerControlsCol: boolean;
  displayCurrencyLabel: string;
  productType: string;
  engineTypeForFamily: (productType: string) => string;
  layers: Array<{ materialType: string }>;
  structureMetrics: {
    totalGsm: number;
    totalConstructionMicron: number | null;
    structureDensity: number | null;
  };
  clientCalcResult: { estimate: NonNullable<ClientCalcEstimate> } | null | undefined;
  estimate: {
    exchangeRateUsdToDisplay?: string | null;
    salePricePerKg?: number | string | null;
    salePriceDisplay?: number | string | null;
    displayCurrency?: string | null;
  } | null | undefined;
  dimensions: {
    reelWidthMm?: number;
    orderUnitMultiplier?: number;
  } | null | undefined;
  allowedUnitBases: Set<string>;
  requiresRollLength: boolean;
};

/**
 * Pure derived display values for EstimateEditor — structure grid cols,
 * yield metrics, selling-price rows. No useState.
 */
export function useEstimateEditorDerived({
  showStructureCosts,
  showLayerControlsCol,
  displayCurrencyLabel,
  productType,
  engineTypeForFamily,
  layers,
  structureMetrics,
  clientCalcResult,
  estimate,
  dimensions,
  allowedUnitBases,
  requiresRollLength,
}: UseEstimateEditorDerivedArgs) {
  const structureColumns: StructureColumn[] = useMemo(() => {
    const cols: StructureColumn[] = [
      { key: 'idx', track: '2rem', label: '#' },
      { key: 'type', track: '8rem', label: 'Type' },
      { key: 'family', track: 'minmax(0,0.85fr)', label: 'Family' },
      { key: 'grade', track: 'minmax(0,1fr)', label: 'Grade' },
      {
        key: 'value',
        track: '6.25rem',
        label: (
          <span className="block w-full leading-tight text-center">
            <span className="block">Value</span>
            <span className="block font-normal opacity-80 text-[10px]">µ/gsm</span>
          </span>
        ),
      },
      {
        key: 'gsm',
        track: '4.5rem',
        label: (
          <span className="leading-tight text-center">
            <span className="block">GSM</span>
          </span>
        ),
      },
    ];
    if (showStructureCosts) {
      cols.push(
        {
          key: 'perKg',
          track: '5.25rem',
          label: (
            <span className="leading-tight text-center">
              <span className="block">Material</span>
              <span className="block font-normal opacity-80 text-[10px]">
                {displayCurrencyLabel}/kg
              </span>
            </span>
          ),
        },
        {
          key: 'perM2',
          track: '5.25rem',
          label: (
            <span className="leading-tight text-center">
              <span className="block">Area</span>
              <span className="block font-normal opacity-80 text-[10px]">
                {displayCurrencyLabel}/m²
              </span>
            </span>
          ),
        }
      );
    }
    if (showLayerControlsCol) {
      cols.push({ key: 'actions', track: '2rem', label: '' as ReactNode });
    }
    return cols;
  }, [showStructureCosts, showLayerControlsCol, displayCurrencyLabel]);

  const structureGridCols = structureColumns.map((c) => c.track).join(' ');
  const centeredStructureColKeys = useMemo(() => new Set(['value']), []);
  const structureGridStyle = {
    ['--structure-cols' as string]: structureGridCols,
  } as CSSProperties;

  const substrateLayerCount = layers.filter((l) => l.materialType === 'substrate').length;
  const adhesiveLayerCount = layers.filter((l) => l.materialType === 'adhesive').length;
  const maxSubstrates = 4;
  const maxAdhesives = 3;

  const stackLabel = useMemo(() => {
    if (engineTypeForFamily(productType) === 'sleeve') return 'Sleeve Structure';
    const substrateCount = layers.filter((l) => l.materialType === 'substrate').length;
    if (substrateCount >= 2) return 'Laminate Structure';
    return 'Film Structure';
  }, [engineTypeForFamily, productType, layers]);

  const totalGsm = structureMetrics.totalGsm;
  const totalConstructionMicron = structureMetrics.totalConstructionMicron;
  const structureDensity =
    structureMetrics.structureDensity != null
      ? structureMetrics.structureDensity.toFixed(3)
      : '—';
  const yieldSqmPerKg =
    clientCalcResult?.estimate.sqmPerKg ?? (totalGsm > 0 ? 1000 / totalGsm : null);

  const orderQtyMetrics: OrderQtyMetrics = useMemo(() => {
    const e = clientCalcResult?.estimate;
    const pos = (n: number | null | undefined) =>
      n != null && Number.isFinite(n) && n > 0 ? n : null;
    return {
      kg: pos(e?.orderQuantityKgConverted),
      kpcs: pos(e?.orderQuantityKpcs),
      pieces: pos(e?.orderQuantityKpcs) != null ? (e!.orderQuantityKpcs as number) * 1000 : null,
      sqm: pos(e?.orderQuantitySqm),
      lm: pos(e?.orderQuantityMetersReel),
      piecesPerKg: pos(e?.piecesPerKg),
      gramsPerPiece: pos(e?.gramsPerPiece),
      sqmPerKg: pos(e?.sqmPerKg),
      lmPerKgReel: pos(e?.linearMPerKgReel),
    };
  }, [clientCalcResult]);

  const fmtQty = (n: number | null | undefined, decimals = 0) =>
    n != null && Number.isFinite(n)
      ? n.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : '—';

  const orderQuantityHint = useMemo(() => {
    const m = orderQtyMetrics;
    const parts = [
      m.kg != null ? `${fmtQty(m.kg, 2)} kg` : null,
      m.pieces != null ? `${fmtQty(m.pieces, 0)} pcs` : null,
      m.sqm != null ? `${fmtQty(m.sqm, 2)} m²` : null,
      m.lm != null ? `${fmtQty(m.lm, 2)} LM` : null,
    ].filter(Boolean);
    return parts.length ? `This order ≈ ${parts.join(' · ')}` : undefined;
  }, [orderQtyMetrics]);

  const dimensionHints = useMemo(() => {
    const m = orderQtyMetrics;
    const perKg = [
      m.piecesPerKg != null ? `${fmtQty(m.piecesPerKg, 4)} pcs/kg` : null,
      m.gramsPerPiece != null ? `${fmtQty(m.gramsPerPiece, 4)} g/piece` : null,
      m.sqmPerKg != null ? `${fmtQty(m.sqmPerKg, 4)} m²/kg` : null,
      m.lmPerKgReel != null ? `${fmtQty(m.lmPerKgReel, 4)} LM/kg (reel)` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    if (!perKg) return undefined;
    return {
      reelWidthMm: `Reel width drives reel LM and piece count.\nPer kg: ${perKg}`,
      cutoffMm: `Cut-off drives the piece count.\nPer kg: ${perKg}`,
      piecesPerCut: `Pieces per cut multiplies the piece count.\nPer kg: ${perKg}`,
    };
  }, [orderQtyMetrics]);

  const fxRate = parseFloat(estimate?.exchangeRateUsdToDisplay as string) || 1;
  const salePricePerKgUsd =
    Number(clientCalcResult?.estimate?.salePricePerKg ?? estimate?.salePricePerKg) || 0;
  const displaySalePrice =
    salePricePerKgUsd > 0
      ? usdToDisplay(salePricePerKgUsd, fxRate)
      : Number(estimate?.salePriceDisplay) || 0;

  const sellingPricesByUnit: SellingPriceRow[] = useMemo(() => {
    const cur = estimate?.displayCurrency || 'USD';
    const fmt = (usd: number, decimals: number) =>
      usdToDisplayPrecise(usd, fxRate).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    const gsmLocal = clientCalcResult?.estimate?.totalGsm ?? totalGsm ?? 0;
    const widthM = (dimensions?.reelWidthMm ?? 0) / 1000;
    const rollLengthLm = Number(dimensions?.orderUnitMultiplier) || 0;
    const piecesPerKg = orderQtyMetrics.piecesPerKg;
    const lmPerKg = orderQtyMetrics.lmPerKgReel;
    const saleM2Usd = gsmLocal > 0 ? salePricePerKgUsd * (gsmLocal / 1000) : 0;
    const saleLmUsd =
      lmPerKg != null && lmPerKg > 0
        ? salePricePerKgUsd / lmPerKg
        : widthM > 0 && saleM2Usd > 0
          ? saleM2Usd * widthM
          : 0;
    const line = (usd: number, decimals: number, unit: string, title?: string) => ({
      text: `${cur} ${fmt(usd, decimals)} /${unit}`,
      title,
    });
    const rows: SellingPriceRow[] = [line(salePricePerKgUsd, 2, 'kg')];
    if (gsmLocal > 0) rows.push(line(saleM2Usd, 4, 'm²'));
    if (allowedUnitBases.has('lm') && saleLmUsd > 0) rows.push(line(saleLmUsd, 4, 'LM'));
    if (requiresRollLength && rollLengthLm > 0 && saleLmUsd > 0) {
      rows.push(line(saleLmUsd * rollLengthLm, 2, 'roll', `${rollLengthLm} LM per roll`));
    }
    if (allowedUnitBases.has('pieces') && piecesPerKg != null && piecesPerKg > 0) {
      const salePcUsd = salePricePerKgUsd / piecesPerKg;
      rows.push(line(salePcUsd, 4, 'pc'));
      rows.push(line(salePcUsd * 1000, 2, 'Kpcs'));
    }
    return rows;
  }, [
    estimate?.displayCurrency,
    fxRate,
    clientCalcResult,
    totalGsm,
    dimensions,
    orderQtyMetrics,
    salePricePerKgUsd,
    allowedUnitBases,
    requiresRollLength,
  ]);

  return {
    structureColumns,
    structureGridCols,
    centeredStructureColKeys,
    structureGridStyle,
    substrateLayerCount,
    adhesiveLayerCount,
    maxSubstrates,
    maxAdhesives,
    stackLabel,
    totalGsm,
    totalConstructionMicron,
    structureDensity,
    yieldSqmPerKg,
    orderQtyMetrics,
    orderQuantityHint,
    dimensionHints,
    fxRate,
    salePricePerKgUsd,
    displaySalePrice,
    sellingPricesByUnit,
  };
}
