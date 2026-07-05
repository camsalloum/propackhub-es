import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import type { WasteBand } from '@es/engine';
import { useAuth } from '../hooks/useAuth';
import { usePriceListCustomSlabs } from '../hooks/usePriceListCustomSlabs';
import {
  activeWasteBands,
  bandKey,
  buildCustomSlabPrices,
  buildPriceListRows,
  kgToUnit,
  smartPriceShownDecimals,
  themeArgb,
  UNIT_LABELS,
  type PriceListUnit,
  type SlabMode,
} from '../lib/priceListPricing';
import type { PriceListPricingInput } from '../lib/priceListPricing';
import PriceListSlabControls from './PriceListSlabControls';
import PriceListCellHints from './PriceListCellHints';

export type { PriceListUnit } from '../lib/priceListPricing';

export interface PriceListPanelProps extends PriceListPricingInput {
  estimateDisplayCurrency: string;
  availableUnits: PriceListUnit[];
  rollLengthLm: number;
}

interface PriceListRow {
  slab: string;
  kgHint: string | null;
  belowMoq: boolean;
  meters: string | null;
  unit: string;
  currency: string;
  price: string;
  priceNum: number | null;
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
  cormScaleWithWaste,
  moqKg = null,
}: PriceListPanelProps) {
  const { user } = useAuth();
  const activeBands = useMemo(
    () => activeWasteBands(wasteBands, moqKg),
    [wasteBands, moqKg]
  );

  const currencyOptions = useMemo(() => {
    const codes = new Set<string>(['USD']);
    if (estimateDisplayCurrency) codes.add(estimateDisplayCurrency);
    return Array.from(codes);
  }, [estimateDisplayCurrency]);

  const [unit, setUnit] = useState<PriceListUnit | ''>('');
  const [currency, setCurrency] = useState('');
  const [slabMode, setSlabMode] = useState<SlabMode>('predefined');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const { customSlabs, setCustomSlabs } = usePriceListCustomSlabs(user?.id, slabMode, unit);
  const [copyDone, setCopyDone] = useState(false);

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

  const slabsReady =
    slabMode === 'predefined' ? selectedKeys.size > 0 : customSlabs.length > 0;
  const ready = Boolean(unit && currency && slabsReady);
  const showMeters = unit === 'roll' && rollLengthLm > 0;

  const rows: PriceListRow[] = useMemo(() => {
    if (!unit || !currency || !slabsReady) return [];
    const unitLabel = UNIT_LABELS[unit];
    const input: PriceListPricingInput = {
      wasteBands,
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
      moqKg,
    };

    if (slabMode === 'custom') {
      return buildCustomSlabPrices(input, unit, currency, customSlabs).map((r) => ({
        slab: r.slab,
        kgHint:
          r.quantityKg != null && unit !== 'kg'
            ? `${Math.round(r.quantityKg).toLocaleString()} kg`
            : null,
        belowMoq: r.belowMoq,
        meters: null,
        unit: unitLabel,
        currency,
        price: r.price,
        priceNum: r.priceNum,
      }));
    }

    return buildPriceListRows(input, unit, currency, selectedKeys).map((r) => ({
      slab: r.slab,
      kgHint: null,
      belowMoq: false,
      meters: r.meters,
      unit: unitLabel,
      currency,
      price: r.price,
      priceNum: r.priceNum,
    }));
  }, [
    unit,
    currency,
    slabsReady,
    slabMode,
    customSlabs,
    selectedKeys,
    wasteBands,
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
    moqKg,
  ]);

  const toggleBand = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fillCustomFromBands = () => {
    if (!unit) return;
    const convInput = {
      totalGsm,
      piecesPerKg,
      lmPerKgReel,
      reelWidthMm,
      rollLengthLm,
    };
    const qtys = activeBands
      .map((b: WasteBand) => {
        const kg = b.maxKg ?? b.minKg;
        return kgToUnit(kg, unit, convInput);
      })
      .filter((q): q is number => q != null && q > 0);
    setCustomSlabs([...new Set(qtys)].sort((a, b) => a - b));
  };

  const headers = useMemo(() => {
    const cols = ['Slab'];
    if (showMeters) cols.push('Meters');
    cols.push('Unit', 'Currency', 'Price');
    return cols;
  }, [showMeters]);

  const rowCells = (r: PriceListRow): string[] => {
    const slabLabel = r.belowMoq
      ? `${r.slab}${r.kgHint ? ` (${r.kgHint})` : ''} [Below MOQ]`
      : r.kgHint
        ? `${r.slab} (${r.kgHint})`
        : r.slab;
    const cells = [slabLabel];
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
    const priceCol = colCount;

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
      const slabExport = r.belowMoq
        ? `${r.slab}${r.kgHint ? ` (${r.kgHint})` : ''} [Below MOQ]`
        : r.kgHint
          ? `${r.slab} (${r.kgHint})`
          : r.slab;
      const values: (string | number)[] = [slabExport];
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
          color: { argb: colorNavy },
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
          <p className="text-sm text-mist">
            Select unit, currency, and {slabMode === 'custom' ? 'custom quantities' : 'slabs'}.
          </p>
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
                  <td className="py-2.5 px-3 font-mono">
                    {row.slab}
                    <PriceListCellHints kgHint={row.kgHint} belowMoq={row.belowMoq} />
                  </td>
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
