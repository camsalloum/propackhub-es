import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { usePriceListCustomSlabs } from '../hooks/usePriceListCustomSlabs';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { buildVariantPricingContext, type VariantPricingContext } from '../lib/variantPricingContext';
import type { ClientCalcMaterial } from '../lib/estimateCalc';
import {
  activeWasteBands,
  bandKey,
  bandRangeKg,
  buildCustomSlabPrice,
  buildPriceListRows,
  customSlabKey,
  findMatchingBand,
  formatCustomSlabQty,
  intersectPriceListUnits,
  kgToUnit,
  unionWasteBands,
  UNIT_LABELS,
  type PriceListUnit,
  type SlabMode,
} from '../lib/priceListPricing';
import PriceListSlabControls from './PriceListSlabControls';
import PriceListCellHints from './PriceListCellHints';

type Props = {
  quoteId: string;
  quoteRef?: string;
  estimateIds: string[];
  activeEstimateId?: string;
  refreshKey?: number;
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
  refreshKey = 0,
  onSelectEstimate,
  structureSummaries,
  rowLabels,
  priceCheckMode = false,
}: Props) {
  const { user, tenant } = useAuth();
  const { reference: masterReference } = useMasterDataReference();
  const [contexts, setContexts] = useState<VariantPricingContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [unit, setUnit] = useState<PriceListUnit | ''>('');
  const [currency, setCurrency] = useState('');
  const [slabMode, setSlabMode] = useState<SlabMode>('predefined');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const { customSlabs, setCustomSlabs } = usePriceListCustomSlabs(user?.id, slabMode, unit);

  const load = useCallback(async () => {
    if (estimateIds.length === 0) {
      setContexts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const materials = (await apiClient.getMaterials()) as ClientCalcMaterial[];
      const estimates = await Promise.all(estimateIds.map((id) => apiClient.getEstimate(id)));
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
          label: rowLabels?.[c.id]?.trim() || c.label,
          structureSummary: structureSummaries?.[c.id] ?? c.structureSummary,
        }));
      setContexts(built);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  }, [estimateIds, masterReference, tenant, user?.pricingMethod, structureSummaries, rowLabels]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

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
    if (unit && !availableUnits.includes(unit)) setUnit('');
  }, [availableUnits, unit]);

  useEffect(() => {
    if (currency && !currencyOptions.includes(currency)) setCurrency('');
  }, [currencyOptions, currency]);

  useEffect(() => {
    setSelectedKeys((prev) => {
      const valid = new Set(activeBands.map(bandKey));
      const next = new Set<string>();
      for (const key of prev) {
        if (valid.has(key)) next.add(key);
      }
      return next;
    });
  }, [activeBands]);

  const slabsReady =
    slabMode === 'predefined' ? selectedKeys.size > 0 : customSlabs.length > 0;
  const ready = Boolean(unit && currency && slabsReady);

  const selectedBands = activeBands.filter((b) => selectedKeys.has(bandKey(b)));

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
      return customSlabs.map((q) => formatCustomSlabQty(q, unit));
    }
    return selectedBands.map((b) => bandRangeKg(b));
  }, [columnKeys, slabMode, customSlabs, unit, selectedBands]);

  const tableRows = useMemo(() => {
    if (!ready || !unit || !currency) return [];
    return contexts.map((ctx) => {
      const prices = new Map<string, { price: string; kgHint: string | null; belowMoq: boolean }>();
      if (slabMode === 'custom') {
        for (const qty of customSlabs) {
          const row = buildCustomSlabPrice(ctx, qty, unit, currency);
          const kgHint =
            row.quantityKg != null && unit !== 'kg'
              ? `${Math.round(row.quantityKg).toLocaleString()} kg`
              : null;
          prices.set(customSlabKey(qty), {
            price: row.price,
            kgHint,
            belowMoq: row.belowMoq,
          });
        }
      } else {
        for (const band of selectedBands) {
          const match = findMatchingBand(ctx.wasteBands, band) ?? band;
          const rows = buildPriceListRows(ctx, unit, currency, new Set([bandKey(match)]));
          prices.set(bandKey(band), { price: rows[0]?.price ?? '—', kgHint: null, belowMoq: false });
        }
      }
      return { ctx, prices };
    });
  }, [ready, unit, currency, contexts, slabMode, customSlabs, selectedBands]);

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
            const n = Number(String(p.price).replace(/,/g, ''));
            return Number.isFinite(n) ? n : p.price;
          }),
        ]);
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
          onClearBands={() => setSelectedKeys(new Set())}
          customSlabs={customSlabs}
          onCustomSlabsChange={setCustomSlabs}
          onFillFromBands={slabMode === 'custom' ? fillCustomFromBands : undefined}
        />

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/50 text-xs text-mist">
                <th className="text-left py-2 px-3 font-medium">{variantColumnLabel}</th>
                <th className="text-left py-2 px-3 font-medium">Structure</th>
                {columnHeaders.map((h, i) => (
                  <th
                    key={columnKeys[i] ?? i}
                    className="text-right py-2 px-3 font-medium whitespace-nowrap"
                  >
                    {h}
                    <span className="block text-[10px] font-normal text-mist/80">
                      {unit ? `${UNIT_LABELS[unit]} · ${currency}` : currency}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(({ ctx, prices }) => {
                const active = ctx.id === activeEstimateId;
                return (
                  <tr
                    key={ctx.id}
                    className={`border-b border-border last:border-0 cursor-pointer hover:bg-surface-raised/40 ${
                      active ? 'bg-accent-soft/40' : ''
                    }`}
                    onClick={() => onSelectEstimate?.(ctx.id)}
                  >
                    <td className="py-2 px-3 font-medium whitespace-nowrap">{ctx.label}</td>
                    <td className="py-2 px-3 text-mist max-w-[10rem] truncate" title={ctx.structureSummary}>
                      {ctx.structureSummary || '—'}
                    </td>
                    {columnKeys.map((key) => {
                      const cell = prices.get(key);
                      return (
                        <td
                          key={key}
                          className="py-2 px-3 text-right font-mono font-semibold text-navy tabular-nums whitespace-nowrap"
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
    </div>
  );
}
