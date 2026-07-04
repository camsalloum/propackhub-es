import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { effectiveCormPerKg, DEFAULT_CORM_SCALE_WITH_WASTE, type WasteBand } from '@es/engine';
import { displayToUsd, usdToDisplayPrecise } from '../lib/currency';

export type PriceListUnit = 'kg' | 'm2' | 'lm' | 'roll' | 'pc' | 'kpcs';

const UNIT_LABELS: Record<PriceListUnit, string> = {
  kg: 'kg',
  m2: 'm²',
  lm: 'LM',
  roll: 'roll',
  pc: 'pc',
  kpcs: 'Kpcs',
};

const UNIT_QTY_DECIMALS: Record<PriceListUnit, number> = {
  kg: 0,
  m2: 0,
  lm: 0,
  roll: 0,
  pc: 0,
  kpcs: 1,
};

export interface PriceListPanelProps {
  wasteBands: WasteBand[];
  materialPerKgUsd: number;
  logisticsPerKgUsd: number;
  developmentPerKgUsd: number;
  accessoryPerKgUsd: number;
  pricingMethod: 'markup' | 'margin_per_kg';
  markupPercent: number;
  /** Margin per kg in estimate display currency. */
  marginValuePerKgDisplay: number;
  /** USD → estimate display currency. */
  estimateFxRate: number;
  estimateDisplayCurrency: string;
  totalGsm: number;
  piecesPerKg: number | null;
  lmPerKgReel: number | null;
  reelWidthMm: number;
  rollLengthLm: number;
  availableUnits: PriceListUnit[];
  /** Tenant M&O method — when fixed_per_group, CoRM is added per band. */
  operatingCostMethod?: 'process_per_kg' | 'markup_over_rm' | 'fixed_per_group';
  /** Base CoRM for print mode (display currency/kg). */
  baseCormDisplay?: number;
  /** CoRM tracks waste % by this factor (default 1). */
  cormScaleWithWaste?: number;
  /** Hide bands below MOQ (kg). */
  moqKg?: number | null;
}

interface PriceListRow {
  slab: string;
  meters: string | null;
  unit: string;
  currency: string;
  price: string;
  priceNum: number | null;
}

function bandKey(band: WasteBand): string {
  return `${band.minKg}:${band.maxKg ?? 'open'}`;
}

function formatQty(n: number, decimals: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Commercial-style rounding: fewer decimals for larger amounts, strip noise. */
function smartPriceDecimals(n: number): { minDp: number; maxDp: number } {
  const abs = Math.abs(n);
  if (abs >= 100) return { minDp: 2, maxDp: 2 };
  if (abs >= 1) return { minDp: 2, maxDp: 2 };
  if (abs >= 0.1) return { minDp: 2, maxDp: 3 };
  if (abs >= 0.01) return { minDp: 2, maxDp: 4 };
  if (abs >= 0.001) return { minDp: 3, maxDp: 5 };
  return { minDp: 4, maxDp: 6 };
}

function formatSmartPrice(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const { minDp, maxDp } = smartPriceDecimals(n);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: minDp,
    maximumFractionDigits: maxDp,
  });
}

/** Decimal places actually shown by formatSmartPrice (for Excel numFmt). */
function smartPriceShownDecimals(n: number): number {
  const { minDp, maxDp } = smartPriceDecimals(n);
  const fixed = Math.abs(n).toFixed(maxDp);
  const frac = fixed.split('.')[1] ?? '';
  const trimmed = frac.replace(/0+$/, '');
  return Math.max(minDp, trimmed.length);
}

/** Read live theme tokens so export matches the current UI palette. */
function themeArgb(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  const parts = raw.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  if (parts.length < 3) return fallback;
  const hex = parts
    .slice(0, 3)
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `FF${hex}`;
}

function bandRangeKg(band: WasteBand): string {
  return band.maxKg == null
    ? `${band.minKg.toLocaleString()}+ kg`
    : `${band.minKg.toLocaleString()} – ${band.maxKg.toLocaleString()} kg`;
}

export default function PriceListPanel({
  wasteBands,
  materialPerKgUsd,
  logisticsPerKgUsd,
  developmentPerKgUsd,
  accessoryPerKgUsd,
  pricingMethod,
  markupPercent,
  marginValuePerKgDisplay,
  estimateFxRate,
  estimateDisplayCurrency,
  totalGsm,
  piecesPerKg,
  lmPerKgReel,
  reelWidthMm,
  rollLengthLm,
  availableUnits,
  operatingCostMethod,
  baseCormDisplay = 0,
  cormScaleWithWaste = DEFAULT_CORM_SCALE_WITH_WASTE,
  moqKg = null,
}: PriceListPanelProps) {
  const currencyOptions = useMemo(() => {
    const codes = new Set<string>(['USD']);
    if (estimateDisplayCurrency) codes.add(estimateDisplayCurrency);
    return Array.from(codes);
  }, [estimateDisplayCurrency]);

  /** Bands at/above MOQ; first band min clamped to MOQ when set. */
  const activeBands = useMemo(() => {
    const moq = moqKg != null && moqKg > 0 ? moqKg : 0;
    if (moq <= 0) return wasteBands;
    return wasteBands
      .filter((b) => b.maxKg == null || b.maxKg >= moq)
      .map((b) => ({
        ...b,
        minKg: Math.max(b.minKg, moq),
      }));
  }, [wasteBands, moqKg]);

  const [unit, setUnit] = useState<PriceListUnit | ''>('');
  const [currency, setCurrency] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [slabsOpen, setSlabsOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const slabsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (unit && !availableUnits.includes(unit)) setUnit('');
  }, [availableUnits, unit]);

  useEffect(() => {
    if (currency && !currencyOptions.includes(currency)) setCurrency('');
  }, [currencyOptions, currency]);

  useEffect(() => {
    if (!slabsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (slabsRef.current && !slabsRef.current.contains(e.target as Node)) {
        setSlabsOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [slabsOpen]);

  const ready = Boolean(unit && currency && selectedKeys.size > 0);
  const showMeters = unit === 'roll' && rollLengthLm > 0;

  const kgToUnit = (kg: number, u: PriceListUnit): number | null => {
    switch (u) {
      case 'kg':
        return kg;
      case 'm2':
        return totalGsm > 0 ? kg * (1000 / totalGsm) : null;
      case 'lm': {
        if (lmPerKgReel != null && lmPerKgReel > 0) return kg * lmPerKgReel;
        const widthM = reelWidthMm / 1000;
        if (totalGsm > 0 && widthM > 0) return kg * (1000 / totalGsm) * widthM;
        return null;
      }
      case 'roll': {
        if (rollLengthLm <= 0) return null;
        const lm =
          lmPerKgReel != null && lmPerKgReel > 0
            ? kg * lmPerKgReel
            : totalGsm > 0 && reelWidthMm > 0
              ? kg * (1000 / totalGsm) * (reelWidthMm / 1000)
              : null;
        return lm != null ? lm / rollLengthLm : null;
      }
      case 'pc':
        return piecesPerKg != null && piecesPerKg > 0 ? kg * piecesPerKg : null;
      case 'kpcs':
        return piecesPerKg != null && piecesPerKg > 0 ? (kg * piecesPerKg) / 1000 : null;
      default:
        return null;
    }
  };

  const priceUsdPerKgForBand = (band: WasteBand): number => {
    const wasteAdj = materialPerKgUsd * (1 + band.wastePercent / 100);
    const baseCormUsd = displayToUsd(baseCormDisplay, estimateFxRate);
    const cormUsd =
      operatingCostMethod === 'fixed_per_group'
        ? effectiveCormPerKg(baseCormUsd, band.wastePercent, cormScaleWithWaste)
        : 0;
    const costBase =
      wasteAdj + logisticsPerKgUsd + developmentPerKgUsd + accessoryPerKgUsd + cormUsd;
    const marginUsd =
      operatingCostMethod === 'fixed_per_group'
        ? 0
        : pricingMethod === 'margin_per_kg'
          ? displayToUsd(marginValuePerKgDisplay, estimateFxRate)
          : costBase * (markupPercent / 100);
    return costBase + marginUsd;
  };

  const priceUsdInUnit = (priceUsdPerKg: number, u: PriceListUnit): number | null => {
    switch (u) {
      case 'kg':
        return priceUsdPerKg;
      case 'm2':
        return totalGsm > 0 ? priceUsdPerKg * (totalGsm / 1000) : null;
      case 'lm': {
        if (lmPerKgReel != null && lmPerKgReel > 0) return priceUsdPerKg / lmPerKgReel;
        const widthM = reelWidthMm / 1000;
        if (totalGsm > 0 && widthM > 0) return priceUsdPerKg * (totalGsm / 1000) * widthM;
        return null;
      }
      case 'roll': {
        if (rollLengthLm <= 0) return null;
        const perLm =
          lmPerKgReel != null && lmPerKgReel > 0
            ? priceUsdPerKg / lmPerKgReel
            : totalGsm > 0 && reelWidthMm > 0
              ? priceUsdPerKg * (totalGsm / 1000) * (reelWidthMm / 1000)
              : null;
        return perLm != null ? perLm * rollLengthLm : null;
      }
      case 'pc':
        return piecesPerKg != null && piecesPerKg > 0 ? priceUsdPerKg / piecesPerKg : null;
      case 'kpcs':
        return piecesPerKg != null && piecesPerKg > 0
          ? (priceUsdPerKg / piecesPerKg) * 1000
          : null;
      default:
        return null;
    }
  };

  /** Quantity range only — unit lives in its own column. */
  const formatBandRange = (band: WasteBand, u: PriceListUnit): string => {
    const qtyDecimals = UNIT_QTY_DECIMALS[u];
    const minU = kgToUnit(band.minKg, u);
    const maxU = band.maxKg == null ? null : kgToUnit(band.maxKg, u);
    if (minU == null) {
      return band.maxKg == null
        ? `${band.minKg.toLocaleString()}+`
        : `${band.minKg.toLocaleString()} – ${band.maxKg.toLocaleString()}`;
    }
    if (maxU == null) return `${formatQty(minU, qtyDecimals)}+`;
    return `${formatQty(minU, qtyDecimals)} – ${formatQty(maxU, qtyDecimals)}`;
  };

  const formatMetersRange = (band: WasteBand): string | null => {
    if (rollLengthLm <= 0) return null;
    const minRolls = kgToUnit(band.minKg, 'roll');
    const maxRolls = band.maxKg == null ? null : kgToUnit(band.maxKg, 'roll');
    if (minRolls == null) return null;
    const minM = minRolls * rollLengthLm;
    if (maxRolls == null) return `${formatQty(minM, 0)}+`;
    return `${formatQty(minM, 0)} – ${formatQty(maxRolls * rollLengthLm, 0)}`;
  };

  const rows: PriceListRow[] = useMemo(() => {
    if (!unit || !currency || selectedKeys.size === 0) return [];
    const fxForCurrency = currency === 'USD' ? 1 : estimateFxRate;
    const unitLabel = UNIT_LABELS[unit];
    return activeBands
      .filter((b) => selectedKeys.has(bandKey(b)))
      .map((band) => {
        const priceUsd = priceUsdInUnit(priceUsdPerKgForBand(band), unit);
        const priceNum =
          priceUsd == null ? null : usdToDisplayPrecise(priceUsd, fxForCurrency);
        return {
          slab: formatBandRange(band, unit),
          meters: unit === 'roll' ? formatMetersRange(band) : null,
          unit: unitLabel,
          currency,
          price: priceNum == null ? '—' : formatSmartPrice(priceNum),
          priceNum,
        };
      });
  }, [
    unit,
    currency,
    selectedKeys,
    activeBands,
    materialPerKgUsd,
    logisticsPerKgUsd,
    developmentPerKgUsd,
    accessoryPerKgUsd,
    pricingMethod,
    markupPercent,
    marginValuePerKgDisplay,
    estimateFxRate,
    totalGsm,
    piecesPerKg,
    lmPerKgReel,
    reelWidthMm,
    rollLengthLm,
    operatingCostMethod,
    baseCormDisplay,
    cormScaleWithWaste,
  ]);

  const toggleBand = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllBands = () => setSelectedKeys(new Set(activeBands.map(bandKey)));
  const clearBands = () => setSelectedKeys(new Set());

  const headers = useMemo(() => {
    const cols = ['Slab'];
    if (showMeters) cols.push('Meters');
    cols.push('Unit', 'Currency', 'Price');
    return cols;
  }, [showMeters]);

  const rowCells = (r: PriceListRow): string[] => {
    const cells = [r.slab];
    if (showMeters) cells.push(r.meters ?? '—');
    cells.push(r.unit, r.currency, r.price);
    return cells;
  };

  const toTsv = () => {
    const lines = [headers.join('\t'), ...rows.map((r) => rowCells(r).join('\t'))];
    return lines.join('\n');
  };

  const toHtmlTable = () => {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
    const body = rows
      .map((r) => `<tr>${rowCells(r).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  };

  const copyTable = async () => {
    if (rows.length === 0) return;
    const tsv = toTsv();
    const html = toHtmlTable();
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([tsv], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(tsv);
      }
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 1500);
    } catch {
      try {
        await navigator.clipboard.writeText(tsv);
        setCopyDone(true);
        window.setTimeout(() => setCopyDone(false), 1500);
      } catch {
        /* ignore */
      }
    }
  };

  const exportExcel = async () => {
    if (rows.length === 0) return;

    // Match UI tokens: header mist on slate/sunken, body mono navy price.
    const colorMist = themeArgb('--color-text-secondary', 'FF78716C');
    const colorNavy = themeArgb('--color-brand', 'FF0C0A09');
    const colorHeaderBg = themeArgb('--color-surface-sunken', 'FFF5F5F4');
    const colorBorder = themeArgb('--color-border', 'FFE7E5E4');
    const colorBodyBg = themeArgb('--color-surface-raised', 'FFFFFFFF');

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: colorBorder } },
      left: { style: 'thin', color: { argb: colorBorder } },
      bottom: { style: 'thin', color: { argb: colorBorder } },
      right: { style: 'thin', color: { argb: colorBorder } },
    };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Estimation Studio';
    const sheet = workbook.addWorksheet('Price list', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const colCount = headers.length;
    const priceCol = colCount; // 1-based last column

    // Column widths similar to on-screen density
    headers.forEach((h, i) => {
      const col = sheet.getColumn(i + 1);
      if (h === 'Slab' || h === 'Meters') col.width = 22;
      else if (h === 'Price') col.width = 14;
      else col.width = 12;
    });

    const headerRow = sheet.addRow(headers);
    headerRow.height = 20;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: colorMist },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colorHeaderBg },
      };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 ? 'left' : 'right',
      };
    });

    for (const r of rows) {
      const values: (string | number)[] = [r.slab];
      if (showMeters) values.push(r.meters ?? '—');
      values.push(r.unit, r.currency);
      values.push(r.priceNum ?? r.price);

      const row = sheet.addRow(values);
      row.height = 18;

      row.eachCell((cell, colNumber) => {
        const isPrice = colNumber === priceCol;
        const isFirst = colNumber === 1;
        cell.font = {
          name: 'Consolas',
          size: 11,
          bold: isPrice,
          color: { argb: isPrice ? colorNavy : colorNavy },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colorBodyBg },
        };
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: isFirst ? 'left' : 'right',
        };

        if (isPrice && typeof cell.value === 'number' && Number.isFinite(cell.value)) {
          const dp = smartPriceShownDecimals(cell.value);
          cell.numFmt = dp > 0 ? `0.${'0'.repeat(dp)}` : '0';
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-list-${unit}-${currency}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rightAlign = (h: string) =>
    h === 'Price' || h === 'Currency' || h === 'Unit' || h === 'Meters';

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-display font-semibold text-navy">Price list</h3>

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

        <div className="relative" ref={slabsRef}>
          <span className="block text-xs text-mist mb-1">Slabs</span>
          <button
            type="button"
            onClick={() => setSlabsOpen((o) => !o)}
            className="input input-compact text-xs w-auto min-w-[9rem] inline-flex items-center justify-between gap-2"
          >
            <span>
              {selectedKeys.size === 0
                ? 'Select…'
                : selectedKeys.size === activeBands.length
                  ? 'All slabs'
                  : `${selectedKeys.size} selected`}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-mist shrink-0 transition-transform ${slabsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {slabsOpen && (
            <div className="absolute z-20 mt-1 left-0 min-w-[14rem] max-h-64 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-lg p-2 space-y-1">
              <div className="flex items-center justify-between gap-2 px-1 pb-1 border-b border-border mb-1">
                <button
                  type="button"
                  className="text-[11px] text-accent-text font-medium"
                  onClick={selectAllBands}
                >
                  All
                </button>
                <button
                  type="button"
                  className="text-[11px] text-mist font-medium"
                  onClick={clearBands}
                >
                  None
                </button>
              </div>
              {activeBands.map((band) => {
                const key = bandKey(band);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate/50 cursor-pointer text-xs text-navy"
                  >
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(key)}
                      onChange={() => toggleBand(key)}
                      className="rounded border-border"
                    />
                    <span className="font-mono">{bandRangeKg(band)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {ready && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={copyTable}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5"
            >
              {copyDone ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copyDone ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="btn-secondary inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </button>
          </div>
        )}
      </div>

      {!ready ? (
        <div className="rounded-lg border border-dashed border-border bg-slate/30 min-h-[8rem] flex items-center justify-center">
          <p className="text-sm text-mist">Select unit, currency, and slabs.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate/40">
                {headers.map((h) => (
                  <th
                    key={h}
                    className={`py-2.5 px-3 text-xs font-medium text-mist ${
                      rightAlign(h) ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.slab}-${row.unit}-${row.currency}`}
                  className="border-b border-border last:border-0 hover:bg-slate/50"
                >
                  <td className="py-2.5 px-3 font-mono">{row.slab}</td>
                  {showMeters && (
                    <td className="py-2.5 px-3 text-right font-mono">{row.meters ?? '—'}</td>
                  )}
                  <td className="py-2.5 px-3 text-right font-mono">{row.unit}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{row.currency}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-navy tabular-nums">
                    {row.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
