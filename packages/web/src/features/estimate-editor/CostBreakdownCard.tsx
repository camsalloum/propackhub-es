import type { OperatingCostMethod } from '@es/engine';
import { usdToDisplayPrecise } from '../../lib/currency';
import {
  buildCostBreakdownRows,
  type CostBreakdownLayer,
  type CostBreakdownMaterial,
} from './costBreakdownRows';
import type { CostSummaryEstimate } from './costSummaryMetrics';
import { DraftNumberInput } from './DraftNumberInput';

const METHOD_OPTIONS: Array<{ value: OperatingCostMethod; label: string }> = [
  { value: 'fixed_per_group', label: 'Fixed CoRM per template' },
  { value: 'markup_over_rm', label: 'Markup over material' },
  { value: 'process_per_kg', label: 'Per-kg process cost' },
];

export type CostBreakdownCardProps = {
  estimate: CostSummaryEstimate | null | undefined;
  layers: CostBreakdownLayer[];
  materials: CostBreakdownMaterial[];
  solventTotalPerM2Usd: number;
  packagingTotalPerKgUsd: number;
  packagingTotalPerM2Usd: number;
  consumablesTotalPerKgUsd: number;
  consumablesTotalPerM2Usd: number;
  displayCurrency: string;
  fxRate: number;
  reelWidthMm: number;
  rollLengthLm: number;
  allowedUnitBases: Set<string>;
  requiresRollLength: boolean;
  operatingCostMethod: OperatingCostMethod;
  tenantOperatingCostMethod: OperatingCostMethod;
  /** Active CoRM in display currency/kg (Printed or Plain by structure). */
  cormPerKgDisplay: number;
  markupPercent: number;
  profitMarginPercent: number;
  canOverrideMethod: boolean;
  readOnly?: boolean;
  fallbackSalePerKg?: number;
  onMethodChange: (method: OperatingCostMethod) => void;
  onCormChange: (cormDisplayPerKg: number) => void;
  onMarkupChange: (pct: number) => void;
  onProfitMarginChange: (pct: number) => void;
  onResetToTenantDefault: () => void;
};

export function CostBreakdownCard({
  estimate,
  layers,
  materials,
  solventTotalPerM2Usd,
  packagingTotalPerKgUsd,
  packagingTotalPerM2Usd,
  consumablesTotalPerKgUsd,
  consumablesTotalPerM2Usd,
  displayCurrency,
  fxRate,
  reelWidthMm,
  rollLengthLm,
  allowedUnitBases,
  requiresRollLength,
  operatingCostMethod,
  tenantOperatingCostMethod,
  cormPerKgDisplay,
  markupPercent,
  profitMarginPercent,
  canOverrideMethod,
  readOnly,
  fallbackSalePerKg,
  onMethodChange,
  onCormChange,
  onMarkupChange,
  onProfitMarginChange,
  onResetToTenantDefault,
}: CostBreakdownCardProps) {
  const gsmLocal = estimate?.totalGsm ?? 0;
  const widthM = reelWidthMm / 1000;
  const showM2 = gsmLocal > 0;
  const showLm = allowedUnitBases.has('lm') && widthM > 0;
  const showRoll = requiresRollLength && rollLengthLm > 0 && showLm;
  const m2ToLm = (v: number) => (showLm ? v * widthM : 0);
  const m2ToRoll = (v: number) => (showRoll ? m2ToLm(v) * rollLengthLm : 0);
  const kgToM2 = (v: number) => (showM2 ? v * (gsmLocal / 1000) : 0);
  const fmtKg = (v: number) => usdToDisplayPrecise(v, fxRate).toFixed(2);
  const fmtM2 = (v: number) => usdToDisplayPrecise(v, fxRate).toFixed(4);
  const fmtLm = (v: number) => usdToDisplayPrecise(v, fxRate).toFixed(4);
  const fmtRoll = (v: number) => usdToDisplayPrecise(v, fxRate).toFixed(2);
  const cur = displayCurrency;

  const rows = buildCostBreakdownRows({
    estimate,
    layers,
    materials,
    solventTotalPerM2Usd,
    packagingTotalPerKgUsd,
    packagingTotalPerM2Usd,
    consumablesTotalPerKgUsd,
    consumablesTotalPerM2Usd,
    operatingCostMethod,
    fallbackSalePerKg,
  });

  const methodIsOverride = operatingCostMethod !== tenantOperatingCostMethod;

  return (
    <div className="card h-full min-w-0">
      <h3 className="font-display font-semibold text-brand mb-3">Cost breakdown</h3>

      {canOverrideMethod && !readOnly && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <label className="block text-xs font-medium text-mist mb-1">
              Manufacturing &amp; Operating method
            </label>
            <select
              className="input w-full text-sm"
              value={operatingCostMethod}
              onChange={(e) => onMethodChange(e.target.value as OperatingCostMethod)}
            >
              {METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                  {o.value === tenantOperatingCostMethod ? ' (tenant default)' : ''}
                </option>
              ))}
            </select>
          </div>
          {operatingCostMethod === 'fixed_per_group' && (
            <div className="w-32">
              <label className="block text-xs font-medium text-mist mb-1">
                CoRM ({cur}/kg)
              </label>
              <DraftNumberInput
                className="input w-full text-sm"
                value={cormPerKgDisplay}
                min={0}
                onCommit={onCormChange}
              />
            </div>
          )}
          {operatingCostMethod === 'markup_over_rm' && (
            <div className="w-28">
              <label className="block text-xs font-medium text-mist mb-1">Markup %</label>
              <DraftNumberInput
                className="input w-full text-sm"
                value={markupPercent}
                min={0}
                max={1000}
                onCommit={onMarkupChange}
              />
            </div>
          )}
          {operatingCostMethod === 'process_per_kg' && (
            <div className="w-28">
              <label className="block text-xs font-medium text-mist mb-1">Profit %</label>
              <DraftNumberInput
                className="input w-full text-sm"
                value={profitMarginPercent}
                min={0}
                max={100}
                onCommit={onProfitMarginChange}
              />
            </div>
          )}
          {methodIsOverride && (
            <button type="button" className="btn-secondary text-xs px-2 py-2" onClick={onResetToTenantDefault}>
              Use tenant default
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-medium text-mist"> </th>
              <th className="text-right py-2 px-3 text-xs font-medium text-mist whitespace-nowrap">
                {cur} / kg
              </th>
              {showM2 && (
                <th className="text-right py-2 px-3 text-xs font-medium text-mist whitespace-nowrap">
                  {cur} / m²
                </th>
              )}
              {showLm && (
                <th className="text-right py-2 px-3 text-xs font-medium text-mist whitespace-nowrap">
                  {cur} / LM
                </th>
              )}
              {showRoll && (
                <th
                  className="text-right py-2 px-3 text-xs font-medium text-mist whitespace-nowrap"
                  title={`Per roll of ${rollLengthLm} LM`}
                >
                  {cur} / roll
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => r.show !== false)
              .map((r, i) => (
                <tr
                  key={r.label}
                  className={`${r.strong ? 'border-t border-border' : ''} ${i % 2 === 1 ? 'bg-slate/40' : ''}`}
                >
                  <td
                    className={`py-2 px-3 ${r.strong ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}
                  >
                    {r.label}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono tabular whitespace-nowrap ${r.strong ? 'font-semibold text-text-primary' : ''}`}
                  >
                    {fmtKg(r.kgVal)}
                  </td>
                  {showM2 && (
                    <td
                      className={`py-2 px-3 text-right font-mono tabular whitespace-nowrap ${r.strong ? 'font-semibold text-text-primary' : ''}`}
                    >
                      {fmtM2(r.m2Val ?? 0)}
                    </td>
                  )}
                  {showLm && (
                    <td
                      className={`py-2 px-3 text-right font-mono tabular whitespace-nowrap ${r.strong ? 'font-semibold text-text-primary' : ''}`}
                    >
                      {fmtLm(m2ToLm(r.m2Val ?? 0))}
                    </td>
                  )}
                  {showRoll && (
                    <td
                      className={`py-2 px-3 text-right font-mono tabular whitespace-nowrap ${r.strong ? 'font-semibold text-text-primary' : ''}`}
                    >
                      {fmtRoll(m2ToRoll(r.m2Val ?? kgToM2(r.kgVal)))}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
