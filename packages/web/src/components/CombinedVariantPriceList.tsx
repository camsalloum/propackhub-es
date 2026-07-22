import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { useQuotePriceListPrefs } from '../hooks/useQuotePriceListPrefs';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { buildVariantPricingContext, type VariantPricingContext } from '../lib/variantPricingContext';
import type { ClientCalcMaterial } from '../lib/estimateCalc';
import { formatCommercialPrice, roundCommercialPrice, customSlabRangesFromBreakpoints } from '@es/engine';
import {
  activeWasteBands,
  bandKey,
  buildCustomSlabPrice,
  buildPriceListRows,
  customSlabKey,
  findMatchingBand,
  customSlabRangeLabels,
  formatCustomSlabRange,
  intersectPriceListUnits,
  kgToUnit,
  pickUnitConversionInput,
  predefinedSlabLabels,
  unionWasteBands,
  UNIT_LABELS,
  type PriceListUnit,
} from '../lib/priceListPricing';
import PriceListSlabControls from './PriceListSlabControls';
import PriceListCellHints from './PriceListCellHints';
import { structureDisplayLines } from '../lib/structureDisplay';
import {
  collectQuotationExtraCharges,
  formatExtraChargeAmount,
  type QuotationExtraCharge,
} from '../lib/quotationExtraCharges';
import { resolveBillableColorCount } from '../lib/tooling';
import {
  parseQuotePriceListDisplayPrefs,
  roundingFromSelectValue,
  roundingSelectValue,
  type QuotePriceListDisplayPrefs,
} from '../lib/quotePriceListPrefs';

type Props = {
  quoteId: string;
  quoteRef?: string;
  estimateIds: string[];
  activeEstimateId?: string;
  priceListDisplayPrefs?: QuotePriceListDisplayPrefs | null;
  onPriceListPrefsSaved?: (prefs: QuotePriceListDisplayPrefs | null) => void;
  onSelectEstimate?: (estimateId: string) => void;
  structureSummaries?: Record<string, string | null | undefined>;
  rowLabels?: Record<string, string | null | undefined>;
  priceCheckMode?: boolean;
};

export default function CombinedVariantPriceList({
  quoteId,
  quoteRef,
  estimateIds,
  activeEstimateId,
  onSelectEstimate,
  structureSummaries,
  rowLabels,
  priceCheckMode = false,
  priceListDisplayPrefs,
  onPriceListPrefsSaved,
}: Props) {
  const { user, tenant } = useAuth();
  const { reference: masterReference } = useMasterDataReference();
  const [contexts, setContexts] = useState<VariantPricingContext[]>([]);
  const [extraCharges, setExtraCharges] = useState<QuotationExtraCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const {
    hydrated: prefsHydrated,
    unit,
    setUnit,
    currency,
    setCurrency,
    slabMode,
    setSlabMode,
    selectedKeys,
    setSelectedKeys,
    setSelectedKeysQuiet,
    clearSelectedBands,
    customSlabs,
    setCustomSlabs,
    rounding,
    setRounding,
  } = useQuotePriceListPrefs({
    quoteId,
    initialPrefs: priceListDisplayPrefs,
    onSaved: onPriceListPrefsSaved,
  });

  const estimateIdsKey = estimateIds.join(',');
  const rowLabelsKey = useMemo(
    () => JSON.stringify(rowLabels ?? {}),
    [rowLabels]
  );
  const structureSummariesKey = useMemo(
    () => JSON.stringify(structureSummaries ?? {}),
    [structureSummaries]
  );

  const load = useCallback(async () => {
    if (estimateIds.length === 0) {
      setContexts([]);
      setExtraCharges([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const materials = (await apiClient.getMaterials()) as ClientCalcMaterial[];
      const estimates = await Promise.all(estimateIds.map((id) => apiClient.getEstimate(id)));
      const labels = rowLabels ?? {};
      const summaries = structureSummaries ?? {};
      const built = estimates
        .map((est) =>
          buildVariantPricingContext(
            est as Record<string, unknown>,
            materials,
            masterReference,
            tenant,
            user?.pricingMethod
          )
        )
        .filter((c): c is VariantPricingContext => c != null && c.configured)
        .map((c) => ({
          ...c,
          label: labels[c.id]?.trim() || c.label,
          structureSummary: summaries[c.id] ?? c.structureSummary,
        }));
      setContexts(built);
      if (!priceCheckMode) {
        setExtraCharges(
          collectQuotationExtraCharges(
            estimates.map((est) => {
              const e = est as Record<string, unknown>;
              const id = String(e.id ?? '');
              return {
                skuLabel: labels[id]?.trim() || (e.skuLabel as string) || (e.jobName as string),
                jobName: e.jobName as string,
                refNumber: e.refNumber as string,
                toolingBillingMode: e.toolingBillingMode as string,
                printColorCount: e.printColorCount as number,
                billableColorCount: e.billableColorCount as number,
                toolingScenario: e.toolingScenario as string,
                costPerColor: e.costPerColor as string | number,
                deliveryTerm: e.deliveryTerm as string,
                deliveryChargeUsd: e.deliveryChargeUsd as string | number,
                displayCurrency: e.displayCurrency as string,
              };
            }),
            {
              resolveBillableColors: resolveBillableColorCount,
            }
          )
        );
      } else {
        setExtraCharges([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  }, [
    estimateIds,
    estimateIdsKey,
    masterReference,
    tenant,
    user?.pricingMethod,
    rowLabelsKey,
    structureSummariesKey,
    rowLabels,
    structureSummaries,
    priceCheckMode,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const unionBands = useMemo(() => unionWasteBands(contexts), [contexts]);
  const activeBands = useMemo(() => activeWasteBands(unionBands), [unionBands]);

  const availableUnits = useMemo(
    () => intersectPriceListUnits(contexts.map((c) => c.availableUnits)),
    [contexts]
  );

  const currencyOptions = useMemo(() => {
    const codes = new Set<string>(['USD']);
    for (const c of contexts) {
      if (c.estimateDisplayCurrency) codes.add(c.estimateDisplayCurrency);
    }
    return Array.from(codes);
  }, [contexts]);

  useEffect(() => {
    if (!prefsHydrated || loading || contexts.length === 0) return;
    if (unit && !availableUnits.includes(unit)) setUnit('');
  }, [availableUnits, unit, prefsHydrated, loading, contexts.length]);

  useEffect(() => {
    if (!prefsHydrated || loading || contexts.length === 0) return;
    if (currency && !currencyOptions.includes(currency)) setCurrency('');
  }, [currencyOptions, currency, prefsHydrated, loading, contexts.length]);

  const bandsReady = !loading && contexts.length > 0 && activeBands.length > 0;

  // Restore saved slab keys once waste bands are loaded (never autosave here).
  useEffect(() => {
    if (!prefsHydrated || !bandsReady) return;
    const savedKeys = parseQuotePriceListDisplayPrefs(priceListDisplayPrefs)?.selectedBandKeys;
    if (!savedKeys?.length) return;
    setSelectedKeysQuiet((prev) => {
      if (prev.size > 0) return prev;
      const valid = new Set(activeBands.map(bandKey));
      const restored = new Set(savedKeys.filter((k) => valid.has(k)));
      return restored.size > 0 ? restored : prev;
    });
  }, [
    bandsReady,
    prefsHydrated,
    priceListDisplayPrefs,
    activeBands,
    setSelectedKeysQuiet,
  ]);

  useEffect(() => {
    if (!prefsHydrated || !bandsReady) return;
    setSelectedKeysQuiet((prev) => {
      const valid = new Set(activeBands.map(bandKey));
      const next = new Set<string>();
      for (const key of prev) {
        if (valid.has(key)) next.add(key);
      }
      if (prev.size === next.size) {
        let same = true;
        for (const key of prev) {
          if (!next.has(key)) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return next;
    });
  }, [activeBands, bandsReady, prefsHydrated, setSelectedKeysQuiet]);

  const slabsReady =
    slabMode === 'predefined' ? selectedKeys.size > 0 : customSlabs.length > 0;
  const ready = Boolean(unit && currency && slabsReady);

  const selectedBands = activeBands.filter((b) => selectedKeys.has(bandKey(b)));

  const slabLabelContext = useMemo(
    () => (contexts[0] ? pickUnitConversionInput(contexts[0]) : null),
    [contexts]
  );

  const toggleBand = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fillCustomFromBands = () => {
    if (!unit || contexts.length === 0) return;
    const sample = contexts[0];
    const qtys = activeBands
      .map((b) => {
        const kg = b.maxKg ?? b.minKg;
        return kgToUnit(kg, unit, sample);
      })
      .filter((q): q is number => q != null && q > 0);
    setCustomSlabs([...new Set(qtys)].sort((a, b) => a - b));
  };

  const columnKeys = useMemo(() => {
    if (slabMode === 'custom') return customSlabs.map(customSlabKey);
    return selectedBands.map(bandKey);
  }, [slabMode, customSlabs, selectedBands]);

  const columnHeaders = useMemo(() => {
    if (!unit) return columnKeys.map(String);
    if (slabMode === 'custom') {
      return customSlabRangeLabels(customSlabs);
    }
    return predefinedSlabLabels(selectedBands, unit, slabLabelContext);
  }, [columnKeys, slabMode, customSlabs, unit, selectedBands, slabLabelContext]);

  const tableRows = useMemo(() => {
    if (!ready || !unit || !currency) return [];
    return contexts.map((ctx) => {
      const prices = new Map<
        string,
        { price: string; priceNum: number | null; kgHint: string | null; belowMoq: boolean }
      >();
      if (slabMode === 'custom') {
        const ranges = customSlabRangesFromBreakpoints(customSlabs);
        for (const r of ranges) {
          const row = buildCustomSlabPrice(
            ctx,
            r.qty,
            unit,
            currency,
            formatCustomSlabRange(r.from, r.to)
          );
          const kgHint =
            row.quantityKg != null && unit !== 'kg'
              ? `${Math.round(row.quantityKg).toLocaleString()} kg`
              : null;
          const priceNum =
            row.priceNum == null ? null : roundCommercialPrice(row.priceNum, rounding);
          prices.set(customSlabKey(r.qty), {
            price:
              row.priceNum == null ? '—' : formatCommercialPrice(row.priceNum, rounding),
            priceNum,
            kgHint,
            belowMoq: row.belowMoq,
          });
        }
      } else {
        for (const band of selectedBands) {
          const match = findMatchingBand(ctx.wasteBands, band) ?? band;
          const rows = buildPriceListRows(ctx, unit, currency, new Set([bandKey(match)]));
          const raw = rows[0]?.priceNum ?? null;
          prices.set(bandKey(band), {
            price: raw == null ? '—' : formatCommercialPrice(raw, rounding),
            priceNum: raw == null ? null : roundCommercialPrice(raw, rounding),
            kgHint: null,
            belowMoq: false,
          });
        }
      }
      return { ctx, prices };
    });
  }, [ready, unit, currency, contexts, slabMode, customSlabs, selectedBands, rounding]);

  const exportExcel = async () => {
    if (!ready || !unit || !currency || tableRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Estimation Studio';
      const sheet = workbook.addWorksheet('Price list', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });
      const headers = [
        priceCheckMode ? 'Variant' : 'SKU / variant',
        'Structure',
        ...columnHeaders.map((h) =>
          slabMode === 'custom' ? `${h} ${UNIT_LABELS[unit]}` : h
        ),
      ];
      sheet.addRow(headers);
      for (const { ctx, prices } of tableRows) {
        sheet.addRow([
          ctx.label,
          ctx.structureSummary || '',
          ...columnKeys.map((key) => {
            const p = prices.get(key);
            if (p == null || p.price === '—') return '';
            return p.priceNum ?? p.price;
          }),
        ]);
      }
      if (extraCharges.length > 0) {
        const chargesSheet = workbook.addWorksheet('Additional charges');
        chargesSheet.addRow(['Description', 'Detail', 'Amount', 'Currency']);
        for (const c of extraCharges) {
          chargesSheet.addRow([
            c.description,
            c.detail || '',
            c.amount,
            c.currency,
          ]);
        }
      }
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quoteRef || quoteId}-price-list.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-4 flex items-center gap-2 text-mist text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Comparison…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4">
        <p className="text-danger text-sm">{error}</p>
        <button type="button" className="btn-secondary text-xs mt-2" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="card p-4 text-sm text-text-secondary">
        Configure and save each variant before building the price list.
      </div>
    );
  }

  const variantColumnLabel = priceCheckMode ? 'Variant' : 'SKU / variant';

  return (
    <div className="card space-y-4">
      <h3 className="font-display font-semibold text-brand text-sm">Price list</h3>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-mist">
          Unit
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as PriceListUnit | '')}
            className="input input-compact text-xs w-auto min-w-[7rem]"
          >
            <option value="">Select…</option>
            {availableUnits.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-mist">
          Currency
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="input input-compact text-xs w-auto min-w-[6rem]"
          >
            <option value="">Select…</option>
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <PriceListSlabControls
          mode={slabMode}
          onModeChange={setSlabMode}
          unit={unit}
          activeBands={activeBands}
          selectedKeys={selectedKeys}
          onToggleBand={toggleBand}
          onSelectAllBands={() => setSelectedKeys(new Set(activeBands.map(bandKey)))}
          onClearBands={clearSelectedBands}
          customSlabs={customSlabs}
          onCustomSlabsChange={setCustomSlabs}
          onFillFromBands={slabMode === 'custom' ? fillCustomFromBands : undefined}
          unitConversion={slabLabelContext}
        />

        <label className="flex flex-col gap-1 text-xs text-mist">
          Round
          <select
            value={roundingSelectValue(rounding)}
            onChange={(e) => setRounding(roundingFromSelectValue(e.target.value))}
            className="input input-compact text-xs w-auto min-w-[7rem]"
            title="Nearest step: 5.73→5.75, 4.61→4.60, 4.63→4.65"
          >
            <option value="off">Off</option>
            <option value="0.05">0.05</option>
            <option value="0.1">0.10</option>
            <option value="0.5">0.50</option>
            <option value="1">1</option>
          </select>
        </label>

        {ready && (
          <button
            type="button"
            className="btn-secondary text-xs ml-auto inline-flex items-center gap-1"
            disabled={exporting}
            onClick={() => void exportExcel()}
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Excel
          </button>
        )}
      </div>

      {!ready ? (
        <div className="rounded-lg border border-dashed border-border bg-slate/30 min-h-[6rem] flex items-center justify-center">
          <p className="text-sm text-mist">
            Select unit, currency, and {slabMode === 'custom' ? 'custom quantities' : 'slabs'}.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm table-fixed min-w-[48rem]">
            <thead>
              <tr className="border-b border-border bg-surface-raised/50 text-xs text-mist">
                <th className="text-left py-2 px-2 font-medium w-[5.5rem]">{variantColumnLabel}</th>
                <th className="text-left py-2 px-2 font-medium w-[8.5rem]">Structure</th>
                {columnHeaders.map((h, i) => (
                  <th
                    key={columnKeys[i] ?? i}
                    className="text-center py-2 px-1.5 font-medium leading-snug"
                  >
                    <span className="block break-words whitespace-normal">{h}</span>
                    <span className="block text-[10px] font-normal text-mist/80 whitespace-nowrap">
                      {unit ? `${UNIT_LABELS[unit]} · ${currency}` : currency}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(({ ctx, prices }) => {
                const active = ctx.id === activeEstimateId;
                const structureLines = structureDisplayLines(ctx.structureSummary);
                return (
                  <tr
                    key={ctx.id}
                    className={`border-b border-border last:border-0 cursor-pointer hover:bg-surface-raised/40 ${
                      active ? 'bg-accent-soft/40' : ''
                    }`}
                    onClick={() => onSelectEstimate?.(ctx.id)}
                  >
                    <td className="py-2 px-2 align-top font-medium break-words whitespace-normal leading-snug">
                      {ctx.label || '—'}
                    </td>
                    <td className="py-2 px-2 align-top text-mist text-xs leading-snug break-words whitespace-normal">
                      {structureLines.length > 0
                        ? structureLines.map((line, i) => (
                            <span key={`${i}-${line}`} className="block">
                              {line}
                            </span>
                          ))
                        : '—'}
                    </td>
                    {columnKeys.map((key) => {
                      const cell = prices.get(key);
                      return (
                        <td
                          key={key}
                          className="py-2 px-1.5 text-center font-mono font-semibold text-navy tabular-nums whitespace-nowrap align-top"
                        >
                          <span>{cell?.price ?? '—'}</span>
                          <PriceListCellHints kgHint={cell?.kgHint} belowMoq={cell?.belowMoq} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!priceCheckMode && extraCharges.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-surface-raised/30 px-3 py-2.5 space-y-1.5">
          <p className="text-xs font-medium text-brand">
            Additional charges (invoiced separately)
          </p>
          <p className="text-[11px] text-mist">Not included in film unit prices above.</p>
          <ul className="space-y-1.5">
            {extraCharges.map((c, i) => (
              <li
                key={`${c.kind}-${c.skuLabel}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-navy font-medium leading-snug">{c.description}</p>
                  {c.detail && (
                    <p className="text-xs text-mist leading-snug">{c.detail}</p>
                  )}
                </div>
                <p className="font-mono font-semibold text-navy tabular-nums shrink-0">
                  {formatExtraChargeAmount(c.amount, c.currency)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
