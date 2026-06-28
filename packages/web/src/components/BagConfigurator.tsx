import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EstimateDimensions } from '@es/engine';
import { BagSchematic } from './BagSchematic';
import { BagFlatBlank } from './BagFlatBlank';
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
        className="text-[11px] font-semibold text-navy/80 tracking-wide select-none truncate text-center"
        title={field.hint}
      >
        {field.label}
      </label>
      <div className="flex border border-accent/40 rounded-md overflow-hidden bg-accent-soft focus-within:border-accent focus-within:ring-2 focus-within:ring-focus-ring/30 transition-shadow">
        <input
          id={`bag-${field.id}`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          disabled={disabled}
          className="border-none outline-none w-[4.75rem] px-2 py-1.5 text-sm font-semibold text-brand tabular-nums text-center bg-accent-soft focus:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-raised"
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
        <span className="bg-accent/15 border-l border-accent/40 px-2 py-1.5 text-[11px] font-semibold text-accent-text flex items-center">
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
}: {
  productSubtype: string | null | undefined;
  dimensions: Record<string, number | undefined>;
  onDimensionsChange: (patch: Record<string, number>) => void;
  disabled?: boolean;
}) {
  const configType = configuratorTypeForBagSubtype(productSubtype);
  const config: BagConfiguratorConfig | null = configType ? BAG_CONFIGURATOR_CATALOG[configType] : null;

  const fieldVals = useMemo(
    () => (config ? bagFieldValuesFromDimensions(config, dimensions) : {}),
    [config, dimensions]
  );

  const drawDims = useMemo(() => bagDrawDimsFromFields(fieldVals), [fieldVals]);

  // Engine-shaped dimensions for the flat-blank die-line: map each visible field to its
  // persisted key, carry through non-field keys (bagLoopWelded, etc.), and tag the subtype
  // so the engine resolves the same blank the cost is based on.
  const engineDims = useMemo<EstimateDimensions>(() => {
    const d: Record<string, unknown> = { ...dimensions, productType: 'bag', bagSubtype: configType };
    if (config) for (const f of config.fields) d[f.dimensionKey] = fieldVals[f.id];
    return d as unknown as EstimateDimensions;
  }, [dimensions, fieldVals, config, configType]);

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

  const isGusseted = configType === 'gusseted';
  const isLoop = configType === 'loop';
  const bottomOn = (fieldVals.G ?? 0) > 0;
  const sideOn = (fieldVals.SG ?? 0) > 0;
  const loopWelded = (dimensions.bagLoopWelded ?? 1) !== 0;
  const baseFields = config.fields.filter((f) => f.id !== 'G' && f.id !== 'SG');
  const bgField = config.fields.find((f) => f.id === 'G');
  const sgField = config.fields.find((f) => f.id === 'SG');

  const toggleGusset = (fieldId: 'G' | 'SG', on: boolean) => {
    // Logical default depths loaded into the field when a gusset is ticked on.
    const def = fieldId === 'G' ? 120 : 80; // bottom 120 mm, side 80 mm per side
    handleFieldChange(fieldId, on ? def : 0);
  };

  return (
    <div className="w-full rounded-lg border border-border bg-surface-raised overflow-hidden shadow-sm">
      {/* Centered header — bag type already shown in the dropdown above, so not repeated here */}
      <div className="px-4 pt-3 pb-2 text-center border-b border-border bg-surface-sunken">
        <p className="text-xs font-medium text-text-secondary">
          Adjust the highlighted dimensions (mm) — defaults are pre-filled
        </p>
      </div>

      {/* Dimension inputs — replaces old Job details width/height/gusset columns */}
      <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-3 px-4 py-3 border-b border-slate bg-slate/25">
        {isGusseted ? (
          <>
            {baseFields.map((f) => (
              <BagInputField
                key={f.id}
                field={f}
                value={fieldVals[f.id]}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            ))}
            {/* Gusset selector: bottom / side / both / none */}
            <div className="flex flex-col gap-1 justify-end">
              <span className="text-[11px] font-semibold text-navy/80 tracking-wide select-none text-center">Gussets</span>
              <div className="flex items-center gap-3 h-[34px]">
                <label className="flex items-center gap-1.5 text-xs font-medium text-navy cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-gold w-3.5 h-3.5"
                    checked={bottomOn}
                    disabled={disabled}
                    onChange={(e) => toggleGusset('G', e.target.checked)}
                  />
                  Bottom
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-navy cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-gold w-3.5 h-3.5"
                    checked={sideOn}
                    disabled={disabled}
                    onChange={(e) => toggleGusset('SG', e.target.checked)}
                  />
                  Side
                </label>
              </div>
            </div>
            {bottomOn && bgField && (
              <BagInputField
                field={bgField}
                value={fieldVals.G}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            )}
            {sideOn && sgField && (
              <BagInputField
                field={sgField}
                value={fieldVals.SG}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            )}
          </>
        ) : (
          <>
            {config.fields.map((f) => (
              <BagInputField
                key={f.id}
                field={f}
                value={fieldVals[f.id]}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            ))}
            {isLoop && (
              <div className="flex flex-col gap-1 justify-end">
                <span className="text-[11px] font-semibold text-navy/80 tracking-wide select-none text-center" title="Welded strip adds handle film; die-cut handles are punched from the body (no extra film)">
                  Handle
                </span>
                <select
                  className="border border-accent/40 rounded-md bg-accent-soft px-2 py-1.5 text-sm font-semibold text-brand h-[34px] focus:border-accent focus:ring-2 focus:ring-focus-ring/30 outline-none disabled:opacity-50"
                  value={loopWelded ? 'welded' : 'diecut'}
                  disabled={disabled}
                  onChange={(e) => onDimensionsChange({ bagLoopWelded: e.target.value === 'welded' ? 1 : 0 })}
                >
                  <option value="welded">Welded strip</option>
                  <option value="diecut">Die-cut</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Views: finished bag + flat blank die-line (two-up, stacks on narrow screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 bg-[#f8f9fb] divide-y lg:divide-y-0 lg:divide-x divide-slate">
        <div className="flex flex-col min-h-[360px]">
          <div className="flex-1 min-h-[320px]">
            <BagSchematic type={configType} vals={fieldVals} />
          </div>
        </div>
        <div className="flex flex-col min-h-[360px]">
          <div className="flex-1 min-h-[320px]">
            <BagFlatBlank type={configType} dims={engineDims} />
          </div>
        </div>
      </div>

      {/* Status (Live row) */}
      <div className="px-4 py-2 border-t border-slate bg-slate/25 text-[11px] text-mist">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
            <span className="font-semibold text-navy/70">Live</span>
          </span>
          <span>
            <span className="font-semibold text-navy/70">Face area:</span> {bagFaceAreaCm2(drawDims)}
          </span>
          <span>
            <span className="font-semibold text-navy/70">Flat sheet:</span> {bagFlatSheetLabel(drawDims, configType)}
          </span>
        </div>
        <p className="mt-1 leading-snug text-mist/90">
          Flat blank = the film each bag is cut from (drives weight &amp; cost). Bleed, register marks,
          knife &amp; machine allowances are excluded from this blank and accounted for in the waste calculation.
        </p>
      </div>
    </div>
  );
}
