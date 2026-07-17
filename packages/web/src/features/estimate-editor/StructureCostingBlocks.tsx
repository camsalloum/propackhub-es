import { Check, Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  PackagingConfig,
  PackagingCostLine,
  PackagingRole,
  ConsumablesConfig,
  ConsumablesCostLine,
  ConsumablesRole,
} from '@es/engine';
import {
  DEFAULT_CARTONS_PER_PALLET,
  DEFAULT_LOAD_PER_PALLET_KG,
  DEFAULT_PCS_PER_CARTON,
  DEFAULT_STRETCH_WRAP_LAYERS,
  DEFAULT_MOUNT_WIDTH_M,
  DEFAULT_REPEAT_M,
} from '@es/engine';
import { usdToDisplay, usdToDisplayPrecise } from '../../lib/currency';
import { selectOnFocus } from '../../lib/inputs';

export type SolventCostLine = {
  key: string;
  label: string;
  perKgUsd: number;
  perM2Usd: number;
  /** Quantitative basis shown in Value (e.g. makeup g/m², kg/job). */
  qty?: number | null;
  qtyUnit?: string;
  /** Short label under qty. */
  qtyHint?: string;
  /** Full formula for hover on qty + cost cells. */
  calcHint?: string;
};

type SolventOption = { id: string; name: string };

type Props = {
  variant: 'desktop' | 'mobile';
  showStructureCosts: boolean;
  showLayerControlsCol: boolean;
  fxRate: number;
  displayCurrency: string;
  canConfigure: boolean;
  /** Solvent */
  showSolvent: boolean;
  solventExpanded: boolean;
  onSolventExpandedChange: (v: boolean) => void;
  solventTotalPerKgUsd: number;
  solventTotalPerM2Usd: number;
  hasSbInk: boolean;
  needsSolventMix: boolean;
  hasSleeveSubstrate: boolean;
  inkPrintingProcess: 'flexo' | 'rotogravure';
  onInkPrintingProcessChange: (v: 'flexo' | 'rotogravure') => void;
  inkSolventRatio: number;
  onInkSolventRatioChange: (v: number | null) => void;
  inkMakeupRatioTooltip: string;
  solventMaterialId: string | null;
  solventMaterialOptions: SolventOption[];
  onSolventMaterialIdChange: (id: string | null) => void;
  solventCostPerKgUsd: number;
  onSolventCostPerKgUsdChange: (usd: number) => void;
  cleaningSolventKgPerJob: number;
  onCleaningSolventKgPerJobChange: (v: number) => void;
  sleeveSeamingSolventGsm: number;
  onSleeveSeamingSolventGsmChange: (v: number) => void;
  solventCostLines: SolventCostLine[];
  /** Packaging */
  showPackaging: boolean;
  packagingExpanded: boolean;
  onPackagingExpandedChange: (v: boolean) => void;
  packagingTotalPerKgUsd: number;
  packagingTotalPerM2Usd: number;
  packagingNeedsReview: boolean;
  packagingCostLines: PackagingCostLine[];
  productType: 'roll' | 'sleeve' | 'pouch' | 'bag';
  packagingConfig: PackagingConfig;
  onPackagingConfigChange: (patch: Partial<PackagingConfig>) => void;
  /** Consumables (mounting tape + other) */
  consumablesExpanded: boolean;
  onConsumablesExpandedChange: (v: boolean) => void;
  consumablesTotalPerKgUsd: number;
  consumablesTotalPerM2Usd: number;
  consumablesNeedsReview: boolean;
  consumablesCostLines: ConsumablesCostLine[];
  consumablesConfig: ConsumablesConfig;
  onConsumablesConfigChange: (patch: Partial<ConsumablesConfig>) => void;
};

function EmptyCell() {
  return <div className="structure-grid__cell" role="cell" />;
}

/** Section type label — plain text (no pill). */
function TypeBadge({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-medium text-navy whitespace-nowrap">{label}</span>
  );
}

/**
 * ONE grid for every Solvent / Pack / Consumables detail row.
 * Fixed tracks — AED and inputs share the same vertical columns.
 * 1 label | 2 qty/primary | 3 mid (select/hint/2nd config) | 4 price
 */
const DETAIL_COLS = '11.5rem 7.5rem minmax(8rem, 1fr) 9.75rem';

const CELL_NUM =
  'cell-input font-mono text-[11px] text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const QTY_INPUT_CLS = `${CELL_NUM} !w-[4.75rem] !max-w-[4.75rem]`;
const PRICE_INPUT_CLS = `${CELL_NUM} !w-[4.5rem] !max-w-[4.5rem] shrink-0`;
const CONFIG_INPUT_CLS = QTY_INPUT_CLS;

function DetailStrip({
  label,
  qty,
  mid,
  price,
}: {
  label: ReactNode;
  qty?: ReactNode;
  mid?: ReactNode;
  price?: ReactNode;
}) {
  return (
    <div
      className="grid w-full items-center gap-x-3"
      style={{ gridTemplateColumns: DETAIL_COLS }}
    >
      <div className="min-w-0 overflow-hidden">{label}</div>
      <div className="min-w-0">{qty ?? null}</div>
      <div className="min-w-0">{mid ?? null}</div>
      <div className="min-w-0">{price ?? null}</div>
    </div>
  );
}

function DetailRow({
  strip,
  gsm,
  showStructureCosts,
  perKg,
  perM2,
  fxRate,
  showLayerControlsCol,
  tip,
  emptyCosts,
}: {
  strip: ReactNode;
  gsm?: ReactNode;
  showStructureCosts: boolean;
  perKg?: number;
  perM2?: number;
  fxRate: number;
  showLayerControlsCol: boolean;
  tip?: string;
  /** Config rows: keep cost columns blank instead of 0.0000 */
  emptyCosts?: boolean;
}) {
  return (
    <div className="structure-grid__row bg-slate/10" role="row">
      <EmptyCell />
      <div
        className="structure-grid__cell py-1.5"
        style={{ gridColumn: '2 / 6' }}
        role="cell"
      >
        {strip}
      </div>
      {gsm ?? (
        <div className="structure-grid__cell text-mist text-[10px]" role="cell">
          —
        </div>
      )}
      {showStructureCosts && emptyCosts ? (
        <>
          <EmptyCell />
          <EmptyCell />
        </>
      ) : (
        <CostCells
          show={showStructureCosts}
          perKg={perKg ?? 0}
          perM2={perM2 ?? 0}
          fxRate={fxRate}
          title={tip}
        />
      )}
      {showLayerControlsCol && <EmptyCell />}
    </div>
  );
}

function StripLabel({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      className="text-[11px] text-navy font-medium whitespace-nowrap overflow-hidden text-ellipsis block"
      title={title}
    >
      {children}
    </span>
  );
}

function QtyField({
  value,
  unit,
  step = 0.01,
  decimals = 2,
  ariaLabel,
  tip,
  disabled,
  readOnly,
  onChange,
}: {
  value: number;
  unit: string;
  step?: number;
  decimals?: number;
  ariaLabel: string;
  tip?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5" title={tip}>
      <input
        type="number"
        min="0"
        step={step}
        aria-label={ariaLabel}
        className={QTY_INPUT_CLS}
        value={Number(value.toFixed(decimals))}
        onChange={(e) => {
          if (!onChange) return;
          const v = parseFloat(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        onFocus={selectOnFocus}
        disabled={disabled || readOnly || !onChange}
        readOnly={readOnly || !onChange}
      />
      <span className="text-[10px] text-mist shrink-0 whitespace-nowrap">{unit}</span>
    </label>
  );
}

function PriceField({
  currency,
  value,
  unit,
  step = '0.01',
  ariaLabel,
  tip,
  disabled,
  onChange,
}: {
  currency: string;
  value: string;
  unit: string;
  step?: string;
  ariaLabel: string;
  tip?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5" title={tip}>
      <span className="text-[10px] text-mist shrink-0 w-7">{currency}</span>
      <input
        type="number"
        min="0"
        step={step}
        aria-label={ariaLabel}
        className={PRICE_INPUT_CLS}
        value={value}
        placeholder="—"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        onFocus={selectOnFocus}
        disabled={disabled}
      />
      <span className="text-[10px] text-mist shrink-0 whitespace-nowrap">/{unit}</span>
    </label>
  );
}

function CostStripRow({
  label,
  needsReview,
  qty,
  qtyUnit,
  qtyStep = 0.01,
  qtyDecimals = 2,
  qtyReadOnly,
  onQtyChange,
  priceDisplay,
  priceUnit,
  priceStep = '0.01',
  onPriceChange,
  tip,
  showStructureCosts,
  perKg,
  perM2,
  fxRate,
  showLayerControlsCol,
  canConfigure,
  displayCurrency,
  mid,
}: {
  label: string;
  needsReview?: boolean;
  qty: number;
  qtyUnit: string;
  qtyStep?: number;
  qtyDecimals?: number;
  qtyReadOnly?: boolean;
  onQtyChange?: (v: number) => void;
  priceDisplay: string;
  priceUnit: string;
  priceStep?: string;
  onPriceChange: (v: number) => void;
  tip?: string;
  showStructureCosts: boolean;
  perKg: number;
  perM2: number;
  fxRate: number;
  showLayerControlsCol: boolean;
  canConfigure: boolean;
  displayCurrency: string;
  mid?: ReactNode;
}) {
  return (
    <DetailRow
      showStructureCosts={showStructureCosts}
      perKg={perKg}
      perM2={perM2}
      fxRate={fxRate}
      showLayerControlsCol={showLayerControlsCol}
      tip={tip}
      strip={
        <DetailStrip
          label={
            <StripLabel title={label}>
              {label}
              {needsReview ? ' · review' : ''}
            </StripLabel>
          }
          qty={
            <QtyField
              value={qty}
              unit={qtyUnit}
              step={qtyStep}
              decimals={qtyDecimals}
              ariaLabel={`${label} quantity`}
              tip={tip}
              disabled={!canConfigure}
              readOnly={qtyReadOnly}
              onChange={onQtyChange}
            />
          }
          mid={mid}
          price={
            <PriceField
              currency={displayCurrency}
              value={priceDisplay}
              unit={priceUnit}
              step={priceStep}
              ariaLabel={`${label} unit price`}
              tip={tip}
              disabled={!canConfigure}
              onChange={onPriceChange}
            />
          }
        />
      }
    />
  );
}

function SummaryToggle({
  expanded,
  label,
  onToggle,
}: {
  expanded: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-medium text-navy hover:text-gold"
      onClick={onToggle}
      aria-expanded={expanded}
    >
      {expanded ? (
        <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden />
      ) : (
        <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden />
      )}
      {label}
    </button>
  );
}

function CostCells({
  show,
  perKg,
  perM2,
  fxRate,
  bold,
  title,
}: {
  show: boolean;
  perKg: number;
  perM2: number;
  fxRate: number;
  bold?: boolean;
  title?: string;
}) {
  if (!show) return null;
  const weight = bold ? 'font-semibold' : '';
  return (
    <>
      <div
        className={`structure-grid__cell font-mono text-[11px] tabular-nums text-navy ${weight}`}
        role="cell"
        title={title}
      >
        {usdToDisplayPrecise(perKg, fxRate).toFixed(4)}
      </div>
      <div
        className={`structure-grid__cell font-mono text-[11px] tabular-nums text-navy ${weight}`}
        role="cell"
        title={title}
      >
        {usdToDisplayPrecise(perM2, fxRate).toFixed(4)}
      </div>
    </>
  );
}

function lineFor(
  lines: SolventCostLine[],
  key: string
): SolventCostLine | undefined {
  return lines.find((l) => l.key === key);
}

export function StructureCostingBlocks(props: Props) {
  const {
    variant,
    showStructureCosts,
    showLayerControlsCol,
    fxRate,
    displayCurrency,
    canConfigure,
    showSolvent,
    solventExpanded,
    onSolventExpandedChange,
    solventTotalPerKgUsd,
    solventTotalPerM2Usd,
    hasSbInk,
    needsSolventMix,
    hasSleeveSubstrate,
    inkPrintingProcess,
    onInkPrintingProcessChange,
    inkSolventRatio,
    onInkSolventRatioChange,
    inkMakeupRatioTooltip,
    solventMaterialId,
    solventMaterialOptions,
    onSolventMaterialIdChange,
    solventCostPerKgUsd,
    onSolventCostPerKgUsdChange,
    cleaningSolventKgPerJob,
    onCleaningSolventKgPerJobChange,
    sleeveSeamingSolventGsm,
    onSleeveSeamingSolventGsmChange,
    solventCostLines,
    showPackaging,
    packagingExpanded,
    onPackagingExpandedChange,
    packagingTotalPerKgUsd,
    packagingTotalPerM2Usd,
    packagingNeedsReview,
    packagingCostLines,
    productType,
    packagingConfig,
    onPackagingConfigChange,
    consumablesExpanded,
    onConsumablesExpandedChange,
    consumablesTotalPerKgUsd,
    consumablesTotalPerM2Usd,
    consumablesNeedsReview,
    consumablesCostLines,
    consumablesConfig,
    onConsumablesConfigChange,
  } = props;

  const setOverride = (role: PackagingRole, displayVal: number) => {
    const usd = fxRate > 0 ? displayVal / fxRate : displayVal;
    const prev = { ...(packagingConfig.unitPriceOverridesUsd ?? {}) };
    if (usd > 0) prev[role] = usd;
    else delete prev[role];
    onPackagingConfigChange({ unitPriceOverridesUsd: prev });
  };

  const setQtyOverride = (role: PackagingRole, qty: number, calculatedQty: number) => {
    const prev = { ...(packagingConfig.qtyOverrides ?? {}) };
    if (Number.isFinite(qty) && qty >= 0 && Math.abs(qty - calculatedQty) > 1e-9) {
      prev[role] = qty;
    } else {
      delete prev[role];
    }
    onPackagingConfigChange({ qtyOverrides: prev });
  };

  const setConsumablesOverride = (role: ConsumablesRole, displayVal: number) => {
    const usd = fxRate > 0 ? displayVal / fxRate : displayVal;
    const prev = { ...(consumablesConfig.unitPriceOverridesUsd ?? {}) };
    if (usd > 0) prev[role] = usd;
    else delete prev[role];
    onConsumablesConfigChange({ unitPriceOverridesUsd: prev });
  };

  const mountWidthM = consumablesConfig.mountWidthM ?? DEFAULT_MOUNT_WIDTH_M;
  const tapeLine = consumablesCostLines.find((l) => l.role === 'mounting_tape');
  const repeatM =
    consumablesConfig.repeatM ??
    tapeLine?.detail?.repeatM ??
    DEFAULT_REPEAT_M;

  const printMethodButtons = hasSbInk && canConfigure && (
    <div className="inline-flex rounded overflow-hidden border border-border bg-surface-raised h-7 shrink-0">
      {(['flexo', 'rotogravure'] as const).map((method) => {
        const selected = inkPrintingProcess === method;
        const label = method === 'flexo' ? 'Flexo' : 'Roto';
        return (
          <button
            key={method}
            type="button"
            title={method === 'flexo' ? 'Flexo' : 'Rotogravure'}
            className={`inline-flex items-center justify-center px-2 h-7 text-[10px] font-medium whitespace-nowrap ${
              selected ? 'bg-navy text-text-on-accent' : 'bg-surface-raised text-navy hover:bg-slate'
            }`}
            onClick={() => onInkPrintingProcessChange(method)}
          >
            {selected && <Check className="w-2.5 h-2.5 mr-0.5 shrink-0" aria-hidden />}
            {label}
          </button>
        );
      })}
    </div>
  );

  const printProcessBar = hasSbInk && (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium text-navy">Print</span>
      {printMethodButtons}
    </div>
  );

  /** Ink:solvent parts — shown as 1:N (flexo 1:1, roto 1:2). Same editable highlight as other cells. */
  const ratioInput = hasSbInk && canConfigure && (
    <label
      className="cell-input !flex !w-[4.75rem] !max-w-[4.75rem] items-center justify-center gap-0.5 shrink-0 cursor-help !py-0 px-1"
      title={inkMakeupRatioTooltip}
    >
      <span className="font-mono text-[11px] tabular-nums text-navy whitespace-nowrap leading-none">1:</span>
      <input
        type="number"
        min="0.01"
        step="0.1"
        aria-label="Solvent parts per 1 part dry ink (ink:solvent ratio)"
        title={inkMakeupRatioTooltip}
        className="font-mono text-[11px] text-center w-8 h-7 py-0 border-0 bg-transparent outline-none tabular-nums text-navy leading-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        value={inkSolventRatio}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          onInkSolventRatioChange(Number.isFinite(v) && v > 0 ? v : null);
        }}
        onFocus={selectOnFocus}
      />
    </label>
  );

  const solventPick = needsSolventMix && canConfigure && (
    <select
      className="cell-input text-[11px] h-7 py-0 w-full min-w-0"
      aria-label="Solvent"
      value={solventMaterialId ?? ''}
      onChange={(e) => onSolventMaterialIdChange(e.target.value || null)}
    >
      {solventMaterialOptions.length === 0 && <option value="">No solvent</option>}
      {solventMaterialOptions.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );

  const solventPriceInput = needsSolventMix && canConfigure && (
    <PriceField
      currency={displayCurrency}
      value={usdToDisplay(solventCostPerKgUsd, fxRate).toFixed(2)}
      unit="kg"
      ariaLabel="Solvent per kg"
      disabled={!canConfigure}
      onChange={(displayVal) =>
        onSolventCostPerKgUsdChange(fxRate > 0 ? displayVal / fxRate : displayVal)
      }
    />
  );

  /** Qty + unit in the GSM column when Value is used for an editable price. */
  const qtyInGsmCell = (line: SolventCostLine | undefined) => {
    if (!line || line.qty == null || !Number.isFinite(line.qty)) {
      return (
        <div className="structure-grid__cell text-mist text-[10px]" role="cell">
          —
        </div>
      );
    }
    const tip = line.calcHint ?? line.qtyHint;
    return (
      <div
        className="structure-grid__cell structure-grid__cell--col-center font-mono text-[11px] tabular-nums text-navy cursor-help leading-tight text-center"
        role="cell"
        title={tip}
      >
        <span className="block">{line.qty.toFixed(2)}</span>
        <span className="block text-[10px] text-mist font-sans">{line.qtyUnit}</span>
      </div>
    );
  };

  if (variant === 'mobile') {
    return (
      <div className="space-y-3">
        {hasSbInk && (
          <div className="border border-border rounded-lg px-3 py-2.5 bg-surface-raised">
            {printProcessBar}
          </div>
        )}
        {showSolvent && (
          <div className="border border-border rounded-lg overflow-hidden bg-surface-raised">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm"
              onClick={() => onSolventExpandedChange(!solventExpanded)}
            >
              <span className="inline-flex items-center gap-2 font-medium text-navy">
                {solventExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                Solvent
              </span>
              {showStructureCosts && (
                <span className="font-mono text-xs font-semibold text-navy">
                  {usdToDisplayPrecise(solventTotalPerKgUsd, fxRate).toFixed(4)}/kg ·{' '}
                  {usdToDisplayPrecise(solventTotalPerM2Usd, fxRate).toFixed(4)}/m²
                </span>
              )}
            </button>
            {solventExpanded && (
              <div className="divide-y divide-border text-sm">
                {hasSbInk && (
                  <div className="px-3 py-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-medium text-navy">Ink dilution</div>
                      {lineFor(solventCostLines, 'ink-makeup')?.qty != null && (
                        <span
                          className="font-mono text-[11px] text-mist cursor-help"
                          title={lineFor(solventCostLines, 'ink-makeup')?.calcHint}
                        >
                          {lineFor(solventCostLines, 'ink-makeup')!.qty!.toFixed(2)}{' '}
                          {lineFor(solventCostLines, 'ink-makeup')!.qtyUnit}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ratioInput}
                    </div>
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      {solventPick}
                      {solventPriceInput}
                    </div>
                    {showStructureCosts && (
                      <div
                        className="font-mono text-xs text-navy cursor-help"
                        title={lineFor(solventCostLines, 'ink-makeup')?.calcHint}
                      >
                        {usdToDisplayPrecise(lineFor(solventCostLines, 'ink-makeup')?.perKgUsd ?? 0, fxRate).toFixed(4)}
                        /kg ·{' '}
                        {usdToDisplayPrecise(lineFor(solventCostLines, 'ink-makeup')?.perM2Usd ?? 0, fxRate).toFixed(4)}
                        /m²
                      </div>
                    )}
                  </div>
                )}
                {needsSolventMix && (
                  <div className="px-3 py-2.5 space-y-2">
                    <div className="text-xs font-medium text-navy">Press cleaning</div>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input py-1 px-2 w-16 text-xs font-mono"
                        value={cleaningSolventKgPerJob}
                        onChange={(e) => onCleaningSolventKgPerJobChange(Number(e.target.value) || 0)}
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                      <span className="text-xs text-mist">kg/job</span>
                    </label>
                    {showStructureCosts && (
                      <div className="font-mono text-xs text-navy">
                        {usdToDisplayPrecise(lineFor(solventCostLines, 'cleaning')?.perKgUsd ?? 0, fxRate).toFixed(4)}
                        /kg ·{' '}
                        {usdToDisplayPrecise(lineFor(solventCostLines, 'cleaning')?.perM2Usd ?? 0, fxRate).toFixed(4)}
                        /m²
                      </div>
                    )}
                  </div>
                )}
                {hasSleeveSubstrate && (
                  <div className="px-3 py-2.5 space-y-2">
                    <div className="text-xs font-medium text-navy">Seaming</div>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input py-1 px-2 w-16 text-xs font-mono"
                        value={sleeveSeamingSolventGsm}
                        onChange={(e) => onSleeveSeamingSolventGsmChange(Number(e.target.value) || 0)}
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                      <span className="text-xs text-mist">g/m²</span>
                    </label>
                    {showStructureCosts && (
                      <div className="font-mono text-xs text-navy">
                        {usdToDisplayPrecise(lineFor(solventCostLines, 'seaming')?.perKgUsd ?? 0, fxRate).toFixed(4)}
                        /kg ·{' '}
                        {usdToDisplayPrecise(lineFor(solventCostLines, 'seaming')?.perM2Usd ?? 0, fxRate).toFixed(4)}
                        /m²
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showPackaging && (
          <div id="packaging-costing" className="border border-border rounded-lg overflow-hidden bg-surface-raised">
            {packagingNeedsReview && (
              <div className="px-3 py-2 bg-warning/20 text-warning text-xs font-medium border-b border-warning/30">
                Packaging unpriced — sync PACKAGING from PEBI before sending quote
              </div>
            )}
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm"
              onClick={() => onPackagingExpandedChange(!packagingExpanded)}
            >
              <span className="inline-flex items-center gap-2 font-medium text-navy">
                {packagingExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                Packaging
              </span>
              {showStructureCosts && (
                <span className="font-mono text-xs font-semibold text-navy">
                  {usdToDisplayPrecise(packagingTotalPerKgUsd, fxRate).toFixed(4)}/kg ·{' '}
                  {usdToDisplayPrecise(packagingTotalPerM2Usd, fxRate).toFixed(4)}/m²
                </span>
              )}
            </button>
            {packagingExpanded && (
              <div className="divide-y divide-border text-sm">
                <div className="px-3 py-2 flex flex-wrap gap-3">
                  {productType === 'roll' && (
                    <label className="inline-flex items-center gap-1">
                      <span className="text-xs text-mist">Load/pallet</span>
                      <input
                        type="number"
                        min="1"
                        className="input py-1 px-2 w-20 text-xs font-mono"
                        value={packagingConfig.loadPerPalletKg ?? DEFAULT_LOAD_PER_PALLET_KG}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          onPackagingConfigChange({
                            loadPerPalletKg: Number.isFinite(v) && v > 0 ? v : DEFAULT_LOAD_PER_PALLET_KG,
                          });
                        }}
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                      <span className="text-xs text-mist">kg</span>
                    </label>
                  )}
                  {(productType === 'sleeve' || productType === 'pouch' || productType === 'bag') && (
                    <label className="inline-flex items-center gap-1">
                      <span className="text-xs text-mist">Cartons/pallet</span>
                      <input
                        type="number"
                        min="1"
                        className="input py-1 px-2 w-16 text-xs font-mono"
                        value={packagingConfig.cartonsPerPallet ?? DEFAULT_CARTONS_PER_PALLET}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          onPackagingConfigChange({
                            cartonsPerPallet: Number.isFinite(v) && v > 0 ? v : DEFAULT_CARTONS_PER_PALLET,
                          });
                        }}
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                    </label>
                  )}
                  {(productType === 'pouch' || productType === 'bag') && (
                    <label className="inline-flex items-center gap-1">
                      <span className="text-xs text-mist">Pcs/carton</span>
                      <input
                        type="number"
                        min="1"
                        className="input py-1 px-2 w-20 text-xs font-mono"
                        value={packagingConfig.pcsPerCarton ?? DEFAULT_PCS_PER_CARTON}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          onPackagingConfigChange({
                            pcsPerCarton: Number.isFinite(v) && v > 0 ? v : DEFAULT_PCS_PER_CARTON,
                          });
                        }}
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                    </label>
                  )}
                  <label className="inline-flex items-center gap-1">
                    <span className="text-xs text-mist">Stretch layers</span>
                    <input
                      type="number"
                      min="1"
                      className="input py-1 px-2 w-14 text-xs font-mono"
                      value={packagingConfig.stretchWrapLayers ?? DEFAULT_STRETCH_WRAP_LAYERS}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        onPackagingConfigChange({
                          stretchWrapLayers: Number.isFinite(v) && v > 0 ? v : DEFAULT_STRETCH_WRAP_LAYERS,
                        });
                      }}
                      onFocus={selectOnFocus}
                      disabled={!canConfigure}
                    />
                  </label>
                </div>
                {packagingCostLines.map((line) => {
                  const calcQty = line.calculatedQty ?? line.qty;
                  const qtyDecimals = line.qtyUnit === 'roll' ? 3 : line.qtyUnit === 'pc' || line.qtyUnit === 'pcs' ? 0 : 2;
                  return (
                  <div key={line.role} className="px-3 py-2 space-y-1">
                    <div className="text-xs font-medium text-navy">
                      {line.label}
                      {line.needsReview ? ' · needs review' : ''}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step={line.qtyUnit === 'roll' ? 0.001 : 0.01}
                          className="input py-1 px-2 w-24 text-xs font-mono"
                          value={Number(line.qty.toFixed(qtyDecimals))}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setQtyOverride(line.role, Number.isFinite(v) ? v : 0, calcQty);
                          }}
                          onFocus={selectOnFocus}
                          disabled={!canConfigure}
                        />
                        <span className="text-xs text-mist">{line.qtyUnit}</span>
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <span className="text-[10px] text-mist">{displayCurrency}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input py-1 px-2 w-24 text-xs font-mono"
                          value={
                            line.unitPriceUsd != null
                              ? usdToDisplay(line.unitPriceUsd, fxRate).toFixed(2)
                              : ''
                          }
                          placeholder="—"
                          onChange={(e) => setOverride(line.role, parseFloat(e.target.value) || 0)}
                          onFocus={selectOnFocus}
                          disabled={!canConfigure}
                        />
                        <span className="text-xs text-mist">/{line.priceUnit ?? 'u'}</span>
                      </label>
                      {showStructureCosts && (
                        <span className="font-mono text-xs text-navy ml-auto">
                          {usdToDisplayPrecise(line.costPerKgUsd, fxRate).toFixed(4)}/kg ·{' '}
                          {usdToDisplayPrecise(line.costPerM2Usd, fxRate).toFixed(4)}/m²
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden bg-surface-raised">
          {consumablesNeedsReview && (
            <div className="px-3 py-2 bg-warning/20 text-warning text-xs font-medium border-b border-warning/30">
              Consumables unpriced — sync CONSUMABLES from PEBI before sending quote
            </div>
          )}
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm"
            onClick={() => onConsumablesExpandedChange(!consumablesExpanded)}
          >
            <span className="inline-flex items-center gap-2 font-medium text-navy">
              {consumablesExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Consumables
            </span>
            {showStructureCosts && (
              <span className="font-mono text-xs font-semibold text-navy">
                {usdToDisplayPrecise(consumablesTotalPerKgUsd, fxRate).toFixed(4)}/kg ·{' '}
                {usdToDisplayPrecise(consumablesTotalPerM2Usd, fxRate).toFixed(4)}/m²
              </span>
            )}
          </button>
          {consumablesExpanded && (
            <div className="border-t border-border">
              {tapeLine && (
                <div className="px-3 py-2 space-y-2 border-b border-border/60">
                  <div className="text-xs font-medium text-navy">
                    Mounting tape
                    {tapeLine.needsReview ? ' · needs review' : ''}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-mist font-medium">
                    <span>Width</span>
                    <span>Repeat</span>
                    <span>Cost/m²</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="input py-1 px-2 w-full text-xs font-mono"
                        value={Math.round(mountWidthM * 1000)}
                        onChange={(e) => {
                          const mm = parseFloat(e.target.value);
                          onConsumablesConfigChange({
                            mountWidthM:
                              Number.isFinite(mm) && mm > 0 ? mm / 1000 : DEFAULT_MOUNT_WIDTH_M,
                          });
                        }}
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                      <span className="text-mist shrink-0">mm</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="number"
                        min="100"
                        step="1"
                        className="input py-1 px-2 w-full text-xs font-mono"
                        value={Math.round(repeatM * 1000)}
                        onChange={(e) => {
                          const mm = parseFloat(e.target.value);
                          onConsumablesConfigChange({
                            repeatM:
                              Number.isFinite(mm) && mm > 0 ? mm / 1000 : DEFAULT_REPEAT_M,
                          });
                        }}
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                      <span className="text-mist shrink-0">mm</span>
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <span className="text-mist shrink-0">{displayCurrency}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input py-1 px-2 w-full text-xs font-mono"
                        value={
                          tapeLine.unitPriceUsd != null
                            ? usdToDisplay(tapeLine.unitPriceUsd, fxRate).toFixed(2)
                            : ''
                        }
                        placeholder="—"
                        onChange={(e) =>
                          setConsumablesOverride('mounting_tape', parseFloat(e.target.value) || 0)
                        }
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                    </label>
                  </div>
                  {showStructureCosts && (
                    <div className="font-mono text-xs text-navy text-right">
                      {usdToDisplayPrecise(tapeLine.costPerKgUsd, fxRate).toFixed(4)}/kg ·{' '}
                      {usdToDisplayPrecise(tapeLine.costPerM2Usd, fxRate).toFixed(4)}/m²
                    </div>
                  )}
                </div>
              )}
              {consumablesCostLines
                .filter((l) => l.role === 'other')
                .map((line) => (
                  <div key={line.role} className="px-3 py-2 space-y-1">
                    <div className="text-xs font-medium text-navy">
                      {line.label}
                      {line.needsReview ? ' · needs review' : ''}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1">
                        <span className="text-[10px] text-mist">{displayCurrency}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          className="input py-1 px-2 w-24 text-xs font-mono"
                          value={
                            line.unitPriceUsd != null
                              ? usdToDisplayPrecise(line.unitPriceUsd, fxRate).toFixed(4)
                              : ''
                          }
                          placeholder="—"
                          onChange={(e) =>
                            setConsumablesOverride('other', parseFloat(e.target.value) || 0)
                          }
                          onFocus={selectOnFocus}
                          disabled={!canConfigure}
                        />
                        <span className="text-xs text-mist">/kg</span>
                      </label>
                      {showStructureCosts && (
                        <span className="font-mono text-xs text-navy ml-auto">
                          {usdToDisplayPrecise(line.costPerKgUsd, fxRate).toFixed(4)}/kg ·{' '}
                          {usdToDisplayPrecise(line.costPerM2Usd, fxRate).toFixed(4)}/m²
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Desktop structure-grid rows ── */
  return (
    <>
      {hasSbInk && (
        <div className="structure-grid__row bg-slate/10" role="row">
          <EmptyCell />
          <div className="structure-grid__cell" role="cell">
            <TypeBadge label="Print" />
          </div>
          <div className="structure-grid__cell text-mist text-xs" role="cell">
            —
          </div>
          <div className="structure-grid__cell" role="cell">
            {printProcessBar}
          </div>
          <div className="structure-grid__cell text-mist text-[10px]" role="cell">
            —
          </div>
          <div className="structure-grid__cell text-mist" role="cell">
            —
          </div>
          {showStructureCosts && (
            <>
              <div className="structure-grid__cell font-mono text-[11px] text-mist" role="cell">
                —
              </div>
              <div className="structure-grid__cell font-mono text-[11px] text-mist" role="cell">
                —
              </div>
            </>
          )}
          {showLayerControlsCol && <EmptyCell />}
        </div>
      )}
      {showSolvent && (
        <>
          <div className="structure-grid__row" role="row">
            <EmptyCell />
            <div className="structure-grid__cell" role="cell">
              <TypeBadge label="Solvent" />
            </div>
            <div className="structure-grid__cell text-mist text-xs" role="cell">
              —
            </div>
            <div className="structure-grid__cell" role="cell">
              <SummaryToggle
                expanded={solventExpanded}
                label="Solvent"
                onToggle={() => onSolventExpandedChange(!solventExpanded)}
              />
            </div>
            <div className="structure-grid__cell text-mist text-[10px]" role="cell">
              —
            </div>
            <div className="structure-grid__cell text-mist" role="cell">
              —
            </div>
            <CostCells
              show={showStructureCosts}
              perKg={solventTotalPerKgUsd}
              perM2={solventTotalPerM2Usd}
              fxRate={fxRate}
              bold
            />
            {showLayerControlsCol && <EmptyCell />}
          </div>

          {solventExpanded && hasSbInk && (
            <DetailRow
              showStructureCosts={showStructureCosts}
              perKg={lineFor(solventCostLines, 'ink-makeup')?.perKgUsd ?? 0}
              perM2={lineFor(solventCostLines, 'ink-makeup')?.perM2Usd ?? 0}
              fxRate={fxRate}
              showLayerControlsCol={showLayerControlsCol}
              tip={lineFor(solventCostLines, 'ink-makeup')?.calcHint}
              gsm={qtyInGsmCell(lineFor(solventCostLines, 'ink-makeup'))}
              strip={
                <DetailStrip
                  label={<StripLabel>Ink dilution</StripLabel>}
                  qty={ratioInput}
                  mid={solventPick}
                  price={solventPriceInput}
                />
              }
            />
          )}

          {solventExpanded && lineFor(solventCostLines, 'lamination') && (
            <DetailRow
              showStructureCosts={showStructureCosts}
              perKg={lineFor(solventCostLines, 'lamination')!.perKgUsd}
              perM2={lineFor(solventCostLines, 'lamination')!.perM2Usd}
              fxRate={fxRate}
              showLayerControlsCol={showLayerControlsCol}
              tip={lineFor(solventCostLines, 'lamination')?.calcHint}
              strip={
                <DetailStrip
                  label={<StripLabel>Lamination dilution</StripLabel>}
                  qty={
                    <span
                      className="font-mono text-[11px] tabular-nums text-navy cursor-help whitespace-nowrap"
                      title={lineFor(solventCostLines, 'lamination')?.calcHint}
                    >
                      {lineFor(solventCostLines, 'lamination')?.qty != null
                        ? `${lineFor(solventCostLines, 'lamination')!.qty!.toFixed(2)} g/m²`
                        : '—'}
                    </span>
                  }
                  mid={
                    <span
                      className="text-[10px] text-mist truncate cursor-help block"
                      title={lineFor(solventCostLines, 'lamination')?.calcHint}
                    >
                      SB adhesive · EA recipe
                    </span>
                  }
                />
              }
            />
          )}

          {solventExpanded && needsSolventMix && (
            <DetailRow
              showStructureCosts={showStructureCosts}
              perKg={lineFor(solventCostLines, 'cleaning')?.perKgUsd ?? 0}
              perM2={lineFor(solventCostLines, 'cleaning')?.perM2Usd ?? 0}
              fxRate={fxRate}
              showLayerControlsCol={showLayerControlsCol}
              tip={lineFor(solventCostLines, 'cleaning')?.calcHint}
              strip={
                <DetailStrip
                  label={<StripLabel>Press cleaning</StripLabel>}
                  qty={
                    <label
                      className="inline-flex items-center gap-1.5"
                      title={lineFor(solventCostLines, 'cleaning')?.calcHint}
                    >
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label="Cleaning kg per job"
                        className={CONFIG_INPUT_CLS}
                        value={cleaningSolventKgPerJob}
                        onChange={(e) =>
                          onCleaningSolventKgPerJobChange(Number(e.target.value) || 0)
                        }
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                      <span className="text-[10px] text-mist whitespace-nowrap">kg/job</span>
                    </label>
                  }
                  mid={
                    <span className="text-[11px] text-mist truncate block">
                      {solventMaterialOptions.find((m) => m.id === solventMaterialId)?.name ??
                        'Solvent'}
                    </span>
                  }
                />
              }
            />
          )}

          {solventExpanded && hasSleeveSubstrate && (
            <DetailRow
              showStructureCosts={showStructureCosts}
              perKg={lineFor(solventCostLines, 'seaming')?.perKgUsd ?? 0}
              perM2={lineFor(solventCostLines, 'seaming')?.perM2Usd ?? 0}
              fxRate={fxRate}
              showLayerControlsCol={showLayerControlsCol}
              tip={lineFor(solventCostLines, 'seaming')?.calcHint}
              strip={
                <DetailStrip
                  label={<StripLabel>Seaming</StripLabel>}
                  qty={
                    <label
                      className="inline-flex items-center gap-1.5"
                      title={lineFor(solventCostLines, 'seaming')?.calcHint}
                    >
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label="Seaming solvent g per m2"
                        className={CONFIG_INPUT_CLS}
                        value={sleeveSeamingSolventGsm}
                        onChange={(e) =>
                          onSleeveSeamingSolventGsmChange(Number(e.target.value) || 0)
                        }
                        onFocus={selectOnFocus}
                        disabled={!canConfigure}
                      />
                      <span className="text-[10px] text-mist whitespace-nowrap">g/m²</span>
                    </label>
                  }
                  mid={<span className="text-[11px] text-mist truncate block">THF / Dioxolane</span>}
                />
              }
            />
          )}
        </>
      )}

      {showPackaging && (
        <>
          {packagingNeedsReview && (
            <div className="structure-grid__row bg-warning/20" role="row">
              <div
                className="structure-grid__cell py-2 text-xs font-medium text-warning"
                style={{ gridColumn: '1 / -1' }}
                role="cell"
              >
                Packaging unpriced — sync PACKAGING from PEBI before sending quote
              </div>
            </div>
          )}
          <div className="structure-grid__row" role="row">
            <EmptyCell />
            <div className="structure-grid__cell" role="cell">
              <TypeBadge label="Pack" />
            </div>
            <div className="structure-grid__cell text-mist text-xs" role="cell">
              —
            </div>
            <div className="structure-grid__cell" role="cell">
              <SummaryToggle
                expanded={packagingExpanded}
                label="Packaging"
                onToggle={() => onPackagingExpandedChange(!packagingExpanded)}
              />
            </div>
            <div className="structure-grid__cell text-mist text-[10px]" role="cell">
              —
            </div>
            <div className="structure-grid__cell text-mist" role="cell">
              —
            </div>
            <CostCells
              show={showStructureCosts}
              perKg={packagingTotalPerKgUsd}
              perM2={packagingTotalPerM2Usd}
              fxRate={fxRate}
              bold
            />
            {showLayerControlsCol && <EmptyCell />}
          </div>

          {packagingExpanded && (
            <DetailRow
              showStructureCosts={showStructureCosts}
              fxRate={fxRate}
              showLayerControlsCol={showLayerControlsCol}
              emptyCosts
              strip={
                <DetailStrip
                  label={
                    <StripLabel>
                      {productType === 'roll'
                        ? 'Load/pallet'
                        : productType === 'sleeve' || productType === 'pouch' || productType === 'bag'
                          ? 'Cartons/pallet'
                          : 'Config'}
                    </StripLabel>
                  }
                  qty={
                    productType === 'roll' ? (
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          className={CONFIG_INPUT_CLS}
                          value={packagingConfig.loadPerPalletKg ?? DEFAULT_LOAD_PER_PALLET_KG}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            onPackagingConfigChange({
                              loadPerPalletKg:
                                Number.isFinite(v) && v > 0 ? v : DEFAULT_LOAD_PER_PALLET_KG,
                            });
                          }}
                          onFocus={selectOnFocus}
                          disabled={!canConfigure}
                        />
                        <span className="text-[10px] text-mist">kg</span>
                      </label>
                    ) : productType === 'sleeve' ||
                      productType === 'pouch' ||
                      productType === 'bag' ? (
                      <label className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          className={CONFIG_INPUT_CLS}
                          value={packagingConfig.cartonsPerPallet ?? DEFAULT_CARTONS_PER_PALLET}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            onPackagingConfigChange({
                              cartonsPerPallet:
                                Number.isFinite(v) && v > 0 ? v : DEFAULT_CARTONS_PER_PALLET,
                            });
                          }}
                          onFocus={selectOnFocus}
                          disabled={!canConfigure}
                        />
                      </label>
                    ) : undefined
                  }
                  mid={
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {(productType === 'pouch' || productType === 'bag') && (
                        <label className="inline-flex items-center gap-1.5">
                          <span className="text-[11px] text-mist whitespace-nowrap">Pcs/carton</span>
                          <input
                            type="number"
                            min="1"
                            className={CONFIG_INPUT_CLS}
                            value={packagingConfig.pcsPerCarton ?? DEFAULT_PCS_PER_CARTON}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              onPackagingConfigChange({
                                pcsPerCarton:
                                  Number.isFinite(v) && v > 0 ? v : DEFAULT_PCS_PER_CARTON,
                              });
                            }}
                            onFocus={selectOnFocus}
                            disabled={!canConfigure}
                          />
                        </label>
                      )}
                      <label className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] text-mist whitespace-nowrap">Stretch layers</span>
                        <input
                          type="number"
                          min="1"
                          className={CONFIG_INPUT_CLS}
                          value={packagingConfig.stretchWrapLayers ?? DEFAULT_STRETCH_WRAP_LAYERS}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            onPackagingConfigChange({
                              stretchWrapLayers:
                                Number.isFinite(v) && v > 0 ? v : DEFAULT_STRETCH_WRAP_LAYERS,
                            });
                          }}
                          onFocus={selectOnFocus}
                          disabled={!canConfigure}
                        />
                      </label>
                    </div>
                  }
                />
              }
            />
          )}

          {packagingExpanded &&
            packagingCostLines.map((line) => {
              const unitPriceDisplay =
                line.unitPriceUsd != null
                  ? usdToDisplay(line.unitPriceUsd, fxRate).toFixed(2)
                  : '';
              const calcQty = line.calculatedQty ?? line.qty;
              const qtyStep = line.qtyUnit === 'roll' ? 0.001 : line.qtyUnit === 'm' || line.qtyUnit === 'kg' ? 0.01 : 1;
              const qtyDecimals = line.qtyUnit === 'roll' ? 3 : line.qtyUnit === 'pc' || line.qtyUnit === 'pcs' ? 0 : 2;
              const priceTip = [
                line.calcHint ??
                  `${line.label}\nQty default (calculated): ${calcQty.toFixed(qtyDecimals)} ${line.qtyUnit}`,
                unitPriceDisplay
                  ? `Unit ${displayCurrency} ${unitPriceDisplay}/${line.priceUnit ?? 'u'}`
                  : 'Unit price missing — sync PACKAGING or enter price',
                `Job cost → $/kg ${usdToDisplayPrecise(line.costPerKgUsd, fxRate).toFixed(4)}, $/m² ${usdToDisplayPrecise(line.costPerM2Usd, fxRate).toFixed(4)}`,
              ].join('\n');
              return (
                <CostStripRow
                  key={line.role}
                  label={line.label}
                  needsReview={line.needsReview}
                  qty={line.qty}
                  qtyUnit={line.qtyUnit}
                  qtyStep={qtyStep}
                  qtyDecimals={qtyDecimals}
                  onQtyChange={(v) => setQtyOverride(line.role, v, calcQty)}
                  priceDisplay={unitPriceDisplay}
                  priceUnit={line.priceUnit ?? 'u'}
                  onPriceChange={(v) => setOverride(line.role, v)}
                  tip={priceTip}
                  showStructureCosts={showStructureCosts}
                  perKg={line.costPerKgUsd}
                  perM2={line.costPerM2Usd}
                  fxRate={fxRate}
                  showLayerControlsCol={showLayerControlsCol}
                  canConfigure={canConfigure}
                  displayCurrency={displayCurrency}
                />
              );
            })}
        </>
      )}

      {consumablesNeedsReview && (
        <div className="structure-grid__row bg-warning/20" role="row">
          <div
            className="structure-grid__cell py-2 text-xs font-medium text-warning"
            style={{ gridColumn: '1 / -1' }}
            role="cell"
          >
            Consumables unpriced — sync CONSUMABLES from PEBI before sending quote
          </div>
        </div>
      )}
      <div className="structure-grid__row" role="row">
        <EmptyCell />
        <div className="structure-grid__cell" role="cell">
          <TypeBadge label="Consumables" />
        </div>
        <div className="structure-grid__cell text-mist text-xs" role="cell">
          —
        </div>
        <div className="structure-grid__cell" role="cell">
          <SummaryToggle
            expanded={consumablesExpanded}
            label="Consumables"
            onToggle={() => onConsumablesExpandedChange(!consumablesExpanded)}
          />
        </div>
        <div className="structure-grid__cell text-mist text-[10px]" role="cell">
          —
        </div>
        <div className="structure-grid__cell text-mist" role="cell">
          —
        </div>
        <CostCells
          show={showStructureCosts}
          perKg={consumablesTotalPerKgUsd}
          perM2={consumablesTotalPerM2Usd}
          fxRate={fxRate}
          bold
        />
        {showLayerControlsCol && <EmptyCell />}
      </div>
      {consumablesExpanded && (
        <>
          {tapeLine && (() => {
            const calcQty = tapeLine.calculatedQty ?? tapeLine.qty;
            const unitPriceDisplay =
              tapeLine.unitPriceUsd != null
                ? usdToDisplay(tapeLine.unitPriceUsd, fxRate).toFixed(2)
                : '';
            const widthMm = Math.round(mountWidthM * 1000);
            const repeatMm = Math.round(repeatM * 1000);
            const tapePriceTip = [
              'Mounting tape (flexo plate area)',
              `Area = colors × width × cylinder repeat = ${calcQty.toFixed(2)} m²`,
              `Cylinder repeat defaults to 500–600 mm average (not product cutoff)`,
              unitPriceDisplay
                ? `Unit ${displayCurrency} ${unitPriceDisplay}/m²`
                : 'Unit price missing — sync CONSUMABLES or enter price',
            ].join('\n');
            return (
              <>
                <DetailRow
                  showStructureCosts={showStructureCosts}
                  fxRate={fxRate}
                  showLayerControlsCol={showLayerControlsCol}
                  emptyCosts
                  strip={
                    <DetailStrip
                      label={<span className="text-[10px] text-mist"> </span>}
                      qty={
                        <span className="text-[10px] text-mist font-medium">Width</span>
                      }
                      mid={
                        <span className="text-[10px] text-mist font-medium">Repeat</span>
                      }
                      price={
                        <span className="text-[10px] text-mist font-medium">Cost/m²</span>
                      }
                    />
                  }
                />
                <DetailRow
                  showStructureCosts={showStructureCosts}
                  perKg={tapeLine.costPerKgUsd}
                  perM2={tapeLine.costPerM2Usd}
                  fxRate={fxRate}
                  showLayerControlsCol={showLayerControlsCol}
                  tip={tapePriceTip}
                  strip={
                    <DetailStrip
                      label={
                        <StripLabel title={tapePriceTip}>
                          Mounting tape
                          {tapeLine.needsReview ? ' · review' : ''}
                        </StripLabel>
                      }
                      qty={
                        <label className="inline-flex items-center gap-1.5" title={tapePriceTip}>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            aria-label="Mount width mm"
                            className={CONFIG_INPUT_CLS}
                            value={widthMm}
                            onChange={(e) => {
                              const mm = parseFloat(e.target.value);
                              onConsumablesConfigChange({
                                mountWidthM:
                                  Number.isFinite(mm) && mm > 0
                                    ? mm / 1000
                                    : DEFAULT_MOUNT_WIDTH_M,
                              });
                            }}
                            onFocus={selectOnFocus}
                            disabled={!canConfigure}
                          />
                          <span className="text-[10px] text-mist">mm</span>
                        </label>
                      }
                      mid={
                        <label
                          className="inline-flex items-center gap-1.5"
                          title="Cylinder circumference (typical 500–600 mm)"
                        >
                          <input
                            type="number"
                            min="100"
                            step="1"
                            aria-label="Cylinder repeat mm"
                            className={CONFIG_INPUT_CLS}
                            value={repeatMm}
                            onChange={(e) => {
                              const mm = parseFloat(e.target.value);
                              onConsumablesConfigChange({
                                repeatM:
                                  Number.isFinite(mm) && mm > 0
                                    ? mm / 1000
                                    : DEFAULT_REPEAT_M,
                              });
                            }}
                            onFocus={selectOnFocus}
                            disabled={!canConfigure}
                          />
                          <span className="text-[10px] text-mist">mm</span>
                        </label>
                      }
                      price={
                        <PriceField
                          currency={displayCurrency}
                          value={unitPriceDisplay}
                          unit="m²"
                          ariaLabel="Mounting tape unit price"
                          tip={tapePriceTip}
                          disabled={!canConfigure}
                          onChange={(v) => setConsumablesOverride('mounting_tape', v)}
                        />
                      }
                    />
                  }
                />
              </>
            );
          })()}
          {consumablesCostLines
            .filter((l) => l.role === 'other')
            .map((line) => {
              const unitPriceDisplay =
                line.unitPriceUsd != null
                  ? usdToDisplayPrecise(line.unitPriceUsd, fxRate).toFixed(4)
                  : '';
              const priceTip = [
                line.label,
                'Allowance rate applied per kg of finished product',
                unitPriceDisplay
                  ? `Unit ${displayCurrency} ${unitPriceDisplay}/kg`
                  : 'Unit price missing — sync CONSUMABLES or enter price',
                `Job cost → $/kg ${usdToDisplayPrecise(line.costPerKgUsd, fxRate).toFixed(4)}, $/m² ${usdToDisplayPrecise(line.costPerM2Usd, fxRate).toFixed(4)}`,
              ].join('\n');
              return (
                <CostStripRow
                  key={line.role}
                  label={line.label}
                  needsReview={line.needsReview}
                  qty={line.qty}
                  qtyUnit={line.qtyUnit}
                  qtyStep={1}
                  qtyDecimals={0}
                  qtyReadOnly
                  priceDisplay={unitPriceDisplay}
                  priceUnit={line.priceUnit ?? 'kg'}
                  priceStep="0.0001"
                  onPriceChange={(v) => setConsumablesOverride('other', v)}
                  tip={priceTip}
                  showStructureCosts={showStructureCosts}
                  perKg={line.costPerKgUsd}
                  perM2={line.costPerM2Usd}
                  fxRate={fxRate}
                  showLayerControlsCol={showLayerControlsCol}
                  canConfigure={canConfigure}
                  displayCurrency={displayCurrency}
                />
              );
            })}
        </>
      )}
    </>
  );
}
