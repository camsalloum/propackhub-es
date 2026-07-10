import { Check, Minus, Plus } from 'lucide-react';
import type { PackagingConfig, PackagingCostLine, PackagingRole } from '@es/engine';
import {
  DEFAULT_CARTONS_PER_PALLET,
  DEFAULT_LOAD_PER_PALLET_KG,
  DEFAULT_PCS_PER_CARTON,
  DEFAULT_STRETCH_WRAP_LAYERS,
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
  /** Prepress placeholder */
  prepressExpanded: boolean;
  onPrepressExpandedChange: (v: boolean) => void;
};

function EmptyCell() {
  return <div className="structure-grid__cell" role="cell" />;
}

function TypeBadge({ label, tone }: { label: string; tone: 'solvent' | 'pack' | 'prepress' }) {
  const cls =
    tone === 'prepress' ? 'bg-mist/20 text-mist' : 'bg-slate text-navy';
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap ${cls}`}>
      {label}
    </span>
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
    prepressExpanded,
    onPrepressExpandedChange,
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

  /** Ink:solvent parts — shown as 1:N (flexo 1:1, roto 1:2). Same editable highlight as other cells. */
  const ratioInput = hasSbInk && canConfigure && (
    <label
      className="cell-input !flex !w-auto !max-w-none items-center gap-1 shrink-0 cursor-help !py-0 px-2"
      title={inkMakeupRatioTooltip}
    >
      <span className="font-mono text-[11px] tabular-nums text-navy whitespace-nowrap leading-none">1 :</span>
      <input
        type="number"
        min="0.01"
        step="0.1"
        aria-label="Solvent parts per 1 part dry ink (ink:solvent ratio)"
        title={inkMakeupRatioTooltip}
        className="font-mono text-[11px] text-center w-10 h-7 py-0 border-0 bg-transparent outline-none tabular-nums text-navy leading-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
      className="cell-input text-[11px] w-full min-w-0 h-7 py-0"
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
    <label className="inline-flex items-center gap-0.5 shrink-0 h-7">
      <input
        type="number"
        min="0"
        step="0.01"
        aria-label="Solvent per kg"
        className="cell-input font-mono text-[11px] text-right w-14 h-7 py-0"
        value={usdToDisplay(solventCostPerKgUsd, fxRate).toFixed(2)}
        onChange={(e) => {
          const displayVal = parseFloat(e.target.value) || 0;
          onSolventCostPerKgUsdChange(fxRate > 0 ? displayVal / fxRate : displayVal);
        }}
        onFocus={selectOnFocus}
      />
      <span className="text-[10px] text-mist shrink-0">{displayCurrency}/kg</span>
    </label>
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
                      {printMethodButtons}
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
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm"
            onClick={() => onPrepressExpandedChange(!prepressExpanded)}
          >
            <span className="inline-flex items-center gap-2 font-medium text-navy">
              {prepressExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Prepress
            </span>
            {showStructureCosts && <span className="font-mono text-xs text-mist">—</span>}
          </button>
          {prepressExpanded && (
            <div className="px-3 py-2 text-xs text-mist">Coming soon</div>
          )}
        </div>
      </div>
    );
  }

  /* ── Desktop structure-grid rows ── */
  return (
    <>
      {showSolvent && (
        <>
          <div className="structure-grid__row" role="row">
            <EmptyCell />
            <div className="structure-grid__cell" role="cell">
              <TypeBadge label="Solvent" tone="solvent" />
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
            <div className="structure-grid__row bg-slate/20" role="row">
              <EmptyCell />
              <div
                className="structure-grid__cell py-1.5"
                style={{ gridColumn: '2 / 6' }}
                role="cell"
              >
                <div
                  className="grid w-full items-center gap-x-2 gap-y-1"
                  style={{
                    gridTemplateColumns: '6.25rem auto 3.75rem minmax(6.5rem, 1fr) auto',
                  }}
                >
                  <span className="text-[11px] text-navy font-medium whitespace-nowrap">
                    Ink dilution
                  </span>
                  {printMethodButtons}
                  {ratioInput}
                  {solventPick}
                  {solventPriceInput}
                </div>
              </div>
              {qtyInGsmCell(lineFor(solventCostLines, 'ink-makeup'))}
              <CostCells
                show={showStructureCosts}
                perKg={lineFor(solventCostLines, 'ink-makeup')?.perKgUsd ?? 0}
                perM2={lineFor(solventCostLines, 'ink-makeup')?.perM2Usd ?? 0}
                fxRate={fxRate}
                title={lineFor(solventCostLines, 'ink-makeup')?.calcHint}
              />
              {showLayerControlsCol && <EmptyCell />}
            </div>
          )}

          {solventExpanded && lineFor(solventCostLines, 'lamination') && (
            <div className="structure-grid__row bg-slate/20" role="row">
              <EmptyCell />
              <div
                className="structure-grid__cell py-1.5"
                style={{ gridColumn: '2 / 6' }}
                role="cell"
              >
                <div
                  className="grid w-full items-center gap-x-2"
                  style={{ gridTemplateColumns: '6.25rem minmax(0, 1fr) auto' }}
                >
                  <span className="text-[11px] text-navy font-medium whitespace-nowrap">
                    Lamination dilution
                  </span>
                  <span
                    className="text-[10px] text-mist truncate cursor-help"
                    title={lineFor(solventCostLines, 'lamination')?.calcHint}
                  >
                    SB adhesive · EA recipe
                  </span>
                  <span
                    className="font-mono text-[11px] tabular-nums text-navy cursor-help whitespace-nowrap"
                    title={lineFor(solventCostLines, 'lamination')?.calcHint}
                  >
                    {lineFor(solventCostLines, 'lamination')?.qty != null
                      ? `${lineFor(solventCostLines, 'lamination')!.qty!.toFixed(2)} g/m²`
                      : '—'}
                  </span>
                </div>
              </div>
              <div className="structure-grid__cell text-mist text-[10px]" role="cell">
                —
              </div>
              <CostCells
                show={showStructureCosts}
                perKg={lineFor(solventCostLines, 'lamination')!.perKgUsd}
                perM2={lineFor(solventCostLines, 'lamination')!.perM2Usd}
                fxRate={fxRate}
                title={lineFor(solventCostLines, 'lamination')?.calcHint}
              />
              {showLayerControlsCol && <EmptyCell />}
            </div>
          )}

          {solventExpanded && needsSolventMix && (
            <div className="structure-grid__row bg-slate/20" role="row">
              <EmptyCell />
              <div
                className="structure-grid__cell py-1.5"
                style={{ gridColumn: '2 / 6' }}
                role="cell"
              >
                <div
                  className="grid w-full items-center gap-x-2"
                  style={{ gridTemplateColumns: '6.25rem minmax(0, 1fr) auto' }}
                >
                  <span className="text-[11px] text-navy font-medium whitespace-nowrap">
                    Press cleaning
                  </span>
                  <span className="text-[11px] text-mist truncate">
                    {solventMaterialOptions.find((m) => m.id === solventMaterialId)?.name ?? 'Solvent'}
                  </span>
                  <label
                    className="inline-flex items-center gap-1 shrink-0"
                    title={lineFor(solventCostLines, 'cleaning')?.calcHint}
                  >
                    <input
                      type="number"
                      min="0"
                      step="1"
                      aria-label="Cleaning kg per job"
                      className="cell-input font-mono text-[11px] text-right w-14 h-7 py-0"
                      value={cleaningSolventKgPerJob}
                      onChange={(e) => onCleaningSolventKgPerJobChange(Number(e.target.value) || 0)}
                      onFocus={selectOnFocus}
                      disabled={!canConfigure}
                    />
                    <span className="text-[10px] text-mist">kg/job</span>
                  </label>
                </div>
              </div>
              <div className="structure-grid__cell text-mist text-[10px]" role="cell">
                —
              </div>
              <CostCells
                show={showStructureCosts}
                perKg={lineFor(solventCostLines, 'cleaning')?.perKgUsd ?? 0}
                perM2={lineFor(solventCostLines, 'cleaning')?.perM2Usd ?? 0}
                fxRate={fxRate}
                title={lineFor(solventCostLines, 'cleaning')?.calcHint}
              />
              {showLayerControlsCol && <EmptyCell />}
            </div>
          )}

          {solventExpanded && hasSleeveSubstrate && (
            <div className="structure-grid__row bg-slate/20" role="row">
              <EmptyCell />
              <div
                className="structure-grid__cell py-1.5"
                style={{ gridColumn: '2 / 6' }}
                role="cell"
              >
                <div
                  className="grid w-full items-center gap-x-2"
                  style={{ gridTemplateColumns: '6.25rem minmax(0, 1fr) auto' }}
                >
                  <span className="text-[11px] text-navy font-medium whitespace-nowrap">
                    Seaming
                  </span>
                  <span className="text-[11px] text-mist truncate">THF / Dioxolane</span>
                  <label
                    className="inline-flex items-center gap-1 shrink-0"
                    title={lineFor(solventCostLines, 'seaming')?.calcHint}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label="Seaming solvent g per m2"
                      className="cell-input font-mono text-[11px] text-right w-14 h-7 py-0"
                      value={sleeveSeamingSolventGsm}
                      onChange={(e) => onSleeveSeamingSolventGsmChange(Number(e.target.value) || 0)}
                      onFocus={selectOnFocus}
                      disabled={!canConfigure}
                    />
                    <span className="text-[10px] text-mist">g/m²</span>
                  </label>
                </div>
              </div>
              <div className="structure-grid__cell text-mist text-[10px]" role="cell">
                —
              </div>
              <CostCells
                show={showStructureCosts}
                perKg={lineFor(solventCostLines, 'seaming')?.perKgUsd ?? 0}
                perM2={lineFor(solventCostLines, 'seaming')?.perM2Usd ?? 0}
                fxRate={fxRate}
                title={lineFor(solventCostLines, 'seaming')?.calcHint}
              />
              {showLayerControlsCol && <EmptyCell />}
            </div>
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
              <TypeBadge label="Pack" tone="pack" />
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
            <div className="structure-grid__row bg-slate/10" role="row">
              <EmptyCell />
              <div
                className="structure-grid__cell py-1.5"
                style={{ gridColumn: '2 / 6' }}
                role="cell"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {productType === 'roll' && (
                    <label className="inline-flex items-center gap-1.5">
                      <span className="text-[11px] text-mist whitespace-nowrap">Load/pallet</span>
                      <input
                        type="number"
                        min="1"
                        className="cell-input font-mono text-[11px] !w-16 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      <span className="text-[10px] text-mist">kg</span>
                    </label>
                  )}
                  {(productType === 'sleeve' || productType === 'pouch' || productType === 'bag') && (
                    <label className="inline-flex items-center gap-1.5">
                      <span className="text-[11px] text-mist whitespace-nowrap">Cartons/pallet</span>
                      <input
                        type="number"
                        min="1"
                        className="cell-input font-mono text-[11px] !w-14 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  )}
                  {(productType === 'pouch' || productType === 'bag') && (
                    <label className="inline-flex items-center gap-1.5">
                      <span className="text-[11px] text-mist whitespace-nowrap">Pcs/carton</span>
                      <input
                        type="number"
                        min="1"
                        className="cell-input font-mono text-[11px] !w-16 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  <label className="inline-flex items-center gap-1.5">
                    <span className="text-[11px] text-mist whitespace-nowrap">Stretch layers</span>
                    <input
                      type="number"
                      min="1"
                      className="cell-input font-mono text-[11px] !w-12 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
              </div>
              <div className="structure-grid__cell text-mist text-[10px]" role="cell">
                —
              </div>
              {showStructureCosts && (
                <>
                  <EmptyCell />
                  <EmptyCell />
                </>
              )}
              {showLayerControlsCol && <EmptyCell />}
            </div>
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
                `${line.label}`,
                `Qty default (calculated): ${calcQty.toFixed(qtyDecimals)} ${line.qtyUnit}`,
                unitPriceDisplay
                  ? `Unit ${displayCurrency} ${unitPriceDisplay}/${line.priceUnit ?? 'u'}`
                  : 'Unit price missing — sync PACKAGING or enter price',
                `Job cost → $/kg ${usdToDisplayPrecise(line.costPerKgUsd, fxRate).toFixed(4)}, $/m² ${usdToDisplayPrecise(line.costPerM2Usd, fxRate).toFixed(4)}`,
              ].join('\n');
              return (
                <div key={line.role} className="structure-grid__row bg-slate/10" role="row">
                  <EmptyCell />
                  <div
                    className="structure-grid__cell py-1.5"
                    style={{ gridColumn: '2 / 6' }}
                    role="cell"
                  >
                    <div
                      className="grid w-full items-center gap-x-3"
                      style={{
                        gridTemplateColumns: '7.5rem minmax(8rem, auto) minmax(9rem, 1fr)',
                      }}
                    >
                      <span className="text-[11px] text-navy font-medium truncate" title={line.label}>
                        {line.label}
                        {line.needsReview ? ' · review' : ''}
                      </span>
                      <label
                        className="inline-flex items-center gap-1.5 shrink-0"
                        title={priceTip}
                      >
                        <input
                          type="number"
                          min="0"
                          step={qtyStep}
                          aria-label={`${line.label} quantity`}
                          className="cell-input font-mono text-[11px] text-right !w-[4.75rem] !max-w-[4.75rem] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={Number(line.qty.toFixed(qtyDecimals))}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setQtyOverride(
                              line.role,
                              Number.isFinite(v) ? v : 0,
                              calcQty
                            );
                          }}
                          onFocus={selectOnFocus}
                          disabled={!canConfigure}
                        />
                        <span className="text-[10px] text-mist shrink-0 whitespace-nowrap">
                          {line.qtyUnit}
                        </span>
                      </label>
                      <label
                        className="inline-flex items-center gap-1.5 min-w-0 justify-end sm:justify-start"
                        title={priceTip}
                      >
                        <span className="text-[10px] text-mist shrink-0">{displayCurrency}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          aria-label={`${line.label} unit price`}
                          className="cell-input font-mono text-[11px] text-right !w-[4.5rem] !max-w-[4.5rem] shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={unitPriceDisplay}
                          placeholder="—"
                          onChange={(e) => setOverride(line.role, parseFloat(e.target.value) || 0)}
                          onFocus={selectOnFocus}
                          disabled={!canConfigure}
                        />
                        <span className="text-[10px] text-mist shrink-0 whitespace-nowrap">
                          /{line.priceUnit ?? 'u'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="structure-grid__cell text-mist text-[10px]" role="cell">
                    —
                  </div>
                  <CostCells
                    show={showStructureCosts}
                    perKg={line.costPerKgUsd}
                    perM2={line.costPerM2Usd}
                    fxRate={fxRate}
                    title={priceTip}
                  />
                  {showLayerControlsCol && <EmptyCell />}
                </div>
              );
            })}
        </>
      )}

      <div className="structure-grid__row bg-slate/10" role="row">
        <EmptyCell />
        <div className="structure-grid__cell" role="cell">
          <TypeBadge label="Prepress" tone="prepress" />
        </div>
        <div className="structure-grid__cell text-mist text-xs" role="cell">
          —
        </div>
        <div className="structure-grid__cell" role="cell">
          <SummaryToggle
            expanded={prepressExpanded}
            label="Prepress"
            onToggle={() => onPrepressExpandedChange(!prepressExpanded)}
          />
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
      {prepressExpanded && (
        <div className="structure-grid__row bg-slate/10" role="row">
          <div
            className="structure-grid__cell py-2 text-xs text-mist pl-4"
            style={{ gridColumn: '1 / -1' }}
            role="cell"
          >
            Coming soon
          </div>
        </div>
      )}
    </>
  );
}
