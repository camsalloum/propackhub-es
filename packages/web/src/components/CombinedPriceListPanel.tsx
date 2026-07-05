import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { apiClient } from '../lib/api';
import {
  estimateStatusBadgeClass,
  estimateStatusLabel,
} from '../lib/estimateStatus';
import { useAuth } from '../hooks/useAuth';
import { useVisibilityProfile } from '../hooks/useVisibilityProfile';

type PriceListRow = {
  id: string;
  skuLabel?: string | null;
  specsCode?: string | null;
  brand?: string | null;
  jobName?: string;
  structureSummary?: string;
  printColorCount?: number | null;
  costPerColor?: string | number | null;
  developmentTotal?: string | null;
  toolingBillingMode?: string | null;
  totalGsm?: string | number | null;
  totalMicron?: string | number | null;
  orderQuantityKg?: string | number | null;
  productType?: string;
  salePricePerKg?: string | number | null;
  displayCurrency?: string;
  status?: string;
  slabs?: Array<{ quantityKg: string | number; pricePerKg: string | number }>;
};

type Props = {
  quoteId: string;
  quoteRef?: string;
  activeEstimateId?: string;
  onSelectEstimate?: (estimateId: string) => void;
  refreshKey?: number;
  /** Price check — product group + structure only; no SKU/brand/dev columns. */
  priceCheckMode?: boolean;
};

function fmt(n: string | number | null | undefined, digits = 2): string {
  if (n == null || n === '') return '—';
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(digits) : '—';
}

function billingLabel(mode?: string | null): string {
  switch (mode) {
    case 'amortized':
      return 'Amortized';
    case 'not_billed':
      return 'Not billed';
    case 'separate':
      return 'Separate';
    default:
      return '—';
  }
}

export default function CombinedPriceListPanel({
  quoteId,
  quoteRef,
  activeEstimateId,
  onSelectEstimate,
  refreshKey = 0,
  priceCheckMode = false,
}: Props) {
  const { user } = useAuth();
  const { can } = useVisibilityProfile(user?.role);
  const showDev = !priceCheckMode && can('platesPerKg');
  const [rows, setRows] = useState<PriceListRow[]>([]);
  const [separateCharges, setSeparateCharges] = useState<
    Array<{
      estimateId: string;
      skuLabel?: string;
      printColorCount?: number;
      costPerColor?: string;
      developmentTotal?: string;
      displayCurrency?: string;
    }>
  >([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getQuotePriceList(quoteId);
      setRows((data.rows || []) as PriceListRow[]);
      setSeparateCharges(data.separateDevelopmentCharges || []);
      setCurrency(data.displayCurrency || 'USD');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load price list');
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const slabQtys = Array.from(
    new Set(
      rows.flatMap((r) => (r.slabs || []).map((s) => Number(s.quantityKg))).filter((q) => q > 0)
    )
  ).sort((a, b) => a - b);

  const exportExcel = async () => {
    if (rows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Estimation Studio';
      const sheet = workbook.addWorksheet('Combined price list', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      const headers = [
        priceCheckMode ? 'Product group' : 'SKU',
        ...(priceCheckMode ? [] : ['Specs', 'Brand']),
        'Structure',
        ...(showDev ? ['Colors', 'Dev cost', 'Billing'] : []),
        'GSM',
        'Micron',
        'Order qty (kg)',
        'Price/kg',
        'Currency',
        'Status',
        ...slabQtys.map((q) => `${q} kg`),
      ];
      sheet.addRow(headers);

      for (const r of rows) {
        const slabMap = new Map(
          (r.slabs || []).map((s) => [Number(s.quantityKg), Number(s.pricePerKg)])
        );
        sheet.addRow([
          r.jobName || r.skuLabel || '',
          ...(priceCheckMode ? [] : [r.specsCode || '', r.brand || '']),
          r.structureSummary || '',
          ...(showDev
            ? [
                r.printColorCount ?? '',
                r.developmentTotal != null ? Number(r.developmentTotal) : '',
                billingLabel(r.toolingBillingMode),
              ]
            : []),
          r.totalGsm != null ? Number(r.totalGsm) : '',
          r.totalMicron != null ? Number(r.totalMicron) : '',
          r.orderQuantityKg != null ? Number(r.orderQuantityKg) : '',
          r.salePricePerKg != null ? Number(r.salePricePerKg) : '',
          r.displayCurrency || currency,
          estimateStatusLabel(r.status),
          ...slabQtys.map((q) => {
            const price = slabMap.get(q);
            return price != null ? price : '';
          }),
        ]);
      }

      if (showDev && separateCharges.length > 0) {
        const chargesSheet = workbook.addWorksheet('Development charges');
        chargesSheet.addRow(['SKU', 'Colors', 'Cost/color', 'Total', 'Currency', 'Billing']);
        for (const c of separateCharges) {
          chargesSheet.addRow([
            c.skuLabel || '',
            c.printColorCount ?? '',
            c.costPerColor != null ? Number(c.costPerColor) : '',
            c.developmentTotal != null ? Number(c.developmentTotal) : '',
            c.displayCurrency || currency,
            'Separate',
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
      a.download = `${quoteRef || 'quote'}-price-list.xlsx`;
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
        Price list…
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

  if (rows.length === 0) {
    return (
      <div className="card p-4 text-sm text-text-secondary">No estimates on this quote.</div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <h3 className="font-display font-semibold text-brand text-sm">
          {priceCheckMode ? 'Price check comparison' : 'Combined price list'}
        </h3>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={exporting}
          onClick={() => void exportExcel()}
        >
          {exporting ? (
            <Loader2 className="w-3.5 h-3.5 inline mr-1 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 inline mr-1" />
          )}
          Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised/50 text-xs text-mist">
              <th className="text-left py-2 px-3 font-medium">
                {priceCheckMode ? 'Product group' : 'SKU'}
              </th>
              {!priceCheckMode && (
                <>
                  <th className="text-left py-2 px-3 font-medium">Specs</th>
                  <th className="text-left py-2 px-3 font-medium">Brand</th>
                </>
              )}
              <th className="text-left py-2 px-3 font-medium">Structure</th>
              {showDev && (
                <>
                  <th className="text-right py-2 px-3 font-medium">Colors</th>
                  <th className="text-right py-2 px-3 font-medium">Dev cost</th>
                  <th className="text-left py-2 px-3 font-medium">Billing</th>
                </>
              )}
              <th className="text-right py-2 px-3 font-medium">GSM</th>
              <th className="text-right py-2 px-3 font-medium">µ</th>
              <th className="text-right py-2 px-3 font-medium">Qty</th>
              <th className="text-right py-2 px-3 font-medium">Price/kg</th>
              <th className="text-left py-2 px-3 font-medium">Status</th>
              {slabQtys.map((q) => (
                <th key={q} className="text-right py-2 px-3 font-medium whitespace-nowrap">
                  {q} kg
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = r.id === activeEstimateId;
              const slabMap = new Map(
                (r.slabs || []).map((s) => [Number(s.quantityKg), Number(s.pricePerKg)])
              );
              return (
                <tr
                  key={r.id}
                  className={`border-b border-border last:border-0 cursor-pointer hover:bg-surface-raised/40 ${
                    active ? 'bg-accent-soft/40' : ''
                  }`}
                  onClick={() => onSelectEstimate?.(r.id)}
                >
                  <td className="py-2 px-3 font-medium whitespace-nowrap">
                    {priceCheckMode ? r.jobName || '—' : r.skuLabel || r.jobName || '—'}
                  </td>
                  {!priceCheckMode && (
                    <>
                      <td className="py-2 px-3 font-mono text-xs">{r.specsCode || '—'}</td>
                      <td className="py-2 px-3">{r.brand || '—'}</td>
                    </>
                  )}
                  <td className="py-2 px-3 text-mist max-w-[10rem] truncate" title={r.structureSummary || ''}>
                    {r.structureSummary || '—'}
                  </td>
                  {showDev && (
                    <>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {r.printColorCount ?? '—'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {r.developmentTotal != null
                          ? `${r.displayCurrency || currency} ${fmt(r.developmentTotal, 0)}`
                          : '—'}
                      </td>
                      <td className="py-2 px-3">{billingLabel(r.toolingBillingMode)}</td>
                    </>
                  )}
                  <td className="py-2 px-3 text-right tabular-nums">{fmt(r.totalGsm)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{fmt(r.totalMicron, 1)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{fmt(r.orderQuantityKg, 0)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-gold tabular-nums whitespace-nowrap">
                    {r.salePricePerKg != null
                      ? `${r.displayCurrency || currency} ${fmt(r.salePricePerKg)}`
                      : '—'}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`badge ${estimateStatusBadgeClass(r.status)}`}>
                      {estimateStatusLabel(r.status)}
                    </span>
                  </td>
                  {slabQtys.map((q) => {
                    const price = slabMap.get(q);
                    return (
                      <td key={q} className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                        {price != null ? fmt(price) : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showDev && separateCharges.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-surface-raised/30 text-sm space-y-1">
          <p className="font-medium text-brand text-xs">Development charges (billed separately)</p>
          {separateCharges.map((c) => (
            <p key={c.estimateId} className="text-text-secondary">
              {c.skuLabel || 'SKU'}: {c.printColorCount ?? '—'} colors ×{' '}
              {c.displayCurrency || currency} {fmt(c.costPerColor, 0)} ={' '}
              <span className="font-semibold text-navy">
                {c.displayCurrency || currency} {fmt(c.developmentTotal, 0)}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
