import { useCallback, useEffect, useMemo, useState } from 'react';
import { BagSchematic } from './BagSchematic';
import {
  BAG_CONFIGURATOR_CATALOG,
  bagFieldValuesFromDimensions,
  configuratorTypeForBagSubtype,
  type BagConfiguratorField,
  type BagConfiguratorConfig,
} from '../lib/bagConfiguratorCatalog';
import { bagDrawDimsFromFields, bagFaceAreaCm2, bagFlatSheetLabel } from '../lib/bagDrawDims';

function BagInputField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: BagConfiguratorField;
  value: number;
  onChange: (fieldId: string, value: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(() => (Number.isFinite(value) ? String(value) : ''));

  useEffect(() => {
    setDraft(Number.isFinite(value) ? String(value) : '');
  }, [value]);

  return (
    <div className="flex flex-col gap-1 min-w-[6.5rem] shrink-0">
      <label
        htmlFor={`bag-${field.id}`}
        className="text-[11px] font-semibold text-navy/80 tracking-wide select-none truncate"
        title={field.hint}
      >
        {field.label}
      </label>
      <div className="flex border border-slate rounded-md overflow-hidden bg-white focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20 transition-shadow">
        <input
          id={`bag-${field.id}`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          disabled={disabled}
          className="border-none outline-none w-[4.75rem] px-2 py-1.5 text-sm font-medium text-navy tabular-nums bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(field.id, n);
          }}
          onBlur={() => {
            const n = parseFloat(draft);
            if (!Number.isFinite(n)) {
              setDraft(Number.isFinite(value) ? String(value) : '');
            }
          }}
        />
        <span className="bg-slate/40 border-l border-slate px-2 py-1.5 text-[11px] font-semibold text-mist flex items-center">
          {field.unit}
        </span>
      </div>
    </div>
  );
}

/**
 * Bag dimensions — replaces spec-row width/height/gusset when a bag subtype is selected.
 * Layout: input row → live schematic → status. Gauge/GSM from Structure totals only.
 */
export function BagConfigurator({
  productSubtype,
  dimensions,
  onDimensionsChange,
  disabled = false,
  totalGsm,
  piecesPerKg,
}: {
  productSubtype: string | null | undefined;
  dimensions: Record<string, number | undefined>;
  onDimensionsChange: (patch: Record<string, number>) => void;
  disabled?: boolean;
  /** Total structure GSM from the calculation result (Structure web totals). */
  totalGsm?: number;
  /** Pieces per kg from the calculation result (flat-sheet area × totalGsm). */
  piecesPerKg?: number;
}) {
  const configType = configuratorTypeForBagSubtype(productSubtype);
  const config: BagConfiguratorConfig | null = configType ? BAG_CONFIGURATOR_CATALOG[configType] : null;

  const fieldVals = useMemo(
    () => (config ? bagFieldValuesFromDimensions(config, dimensions) : {}),
    [config, dimensions]
  );

  const drawDims = useMemo(() => bagDrawDimsFromFields(fieldVals), [fieldVals]);

  const handleFieldChange = useCallback(
    (fieldId: string, value: number) => {
      if (!config) return;
      const fieldDef = config.fields.find((f) => f.id === fieldId);
      if (!fieldDef) return;
      onDimensionsChange({ [fieldDef.dimensionKey]: value });
    },
    [config, onDimensionsChange]
  );

  if (!config || !configType) return null;

  return (
    <div className="w-full rounded-lg border border-slate bg-white overflow-hidden shadow-sm">
      {/* Dimension inputs — replaces old Job details width/height/gusset columns */}
      <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-3 px-4 py-3 border-b border-slate bg-slate/25">
        {config.fields.map((f) => (
          <BagInputField
            key={f.id}
            field={f}
            value={fieldVals[f.id]}
            onChange={handleFieldChange}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Live schematic */}
      <div className="bg-[#f8f9fb] min-h-[360px]">
        <BagSchematic type={configType} vals={fieldVals} />
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 border-t border-slate bg-slate/25 text-[11px] text-mist">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
          <span className="font-semibold text-navy/70">Live</span>
        </span>
        <span>
          <span className="font-semibold text-navy/70">Type:</span> {config.label}
        </span>
        <span>
          <span className="font-semibold text-navy/70">Face area:</span> {bagFaceAreaCm2(drawDims)}
        </span>
        <span>
          <span className="font-semibold text-navy/70">Flat sheet:</span> {bagFlatSheetLabel(drawDims, configType)}
        </span>
        <span>
          <span className="font-semibold text-navy/70">Total GSM:</span>{' '}
          {Number.isFinite(totalGsm) && totalGsm && totalGsm > 0 ? (
            <span className="text-navy font-semibold">{totalGsm.toFixed(1)} g/m²</span>
          ) : (
            <span className="text-mist/70 italic">— add layers</span>
          )}
        </span>
        <span>
          <span className="font-semibold text-navy/70">Pcs/kg:</span>{' '}
          {Number.isFinite(piecesPerKg) && piecesPerKg && piecesPerKg > 0 ? (
            <span className="text-navy font-semibold">{piecesPerKg.toFixed(1)}</span>
          ) : (
            <span className="text-mist/70 italic">— needs structure</span>
          )}
        </span>
        <span className="text-mist/90 ml-auto">Film gauge &amp; GSM linked from Structure ↓</span>
      </div>
    </div>
  );
}
