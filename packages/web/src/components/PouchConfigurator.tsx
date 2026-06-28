import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EstimateDimensions } from '@es/engine';
import { PouchSchematic } from './PouchSchematic';
import { PouchFlatBlank } from './PouchFlatBlank';
import {
  POUCH_CONFIGURATOR_CATALOG,
  pouchFieldValuesFromDimensions,
  configuratorTypeForPouchSubtype,
  type PouchConfiguratorField,
  type PouchConfiguratorConfig,
} from '../lib/pouchConfiguratorCatalog';
import {
  pouchDrawDimsFromFields,
  pouchFaceAreaCm2,
  pouchFlatSheetLabel,
  pouchConstructionNote,
} from '../lib/pouchDrawDims';

function PouchInputField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: PouchConfiguratorField;
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
        htmlFor={`pouch-${field.id}`}
        className="text-[11px] font-semibold text-navy/80 tracking-wide select-none truncate text-center"
        title={field.hint}
      >
        {field.label}
      </label>
      <div className="flex border border-accent/40 rounded-md overflow-hidden bg-accent-soft focus-within:border-accent focus-within:ring-2 focus-within:ring-focus-ring/30 transition-shadow">
        <input
          id={`pouch-${field.id}`}
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
 * Pouch dimensions — replaces spec-row width/height/gusset when a pouch subtype
 * is selected. Sister to BagConfigurator.
 *
 * Layout: input row → finished schematic + flat-blank die-line → status row.
 * Gauge/GSM come from the Structure totals only (not displayed here).
 */
export function PouchConfigurator({
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
  const configType = configuratorTypeForPouchSubtype(productSubtype);
  const config: PouchConfiguratorConfig | null = configType ? POUCH_CONFIGURATOR_CATALOG[configType] : null;

  const fieldVals = useMemo(
    () => (config ? pouchFieldValuesFromDimensions(config, dimensions) : {}),
    [config, dimensions]
  );

  const drawDims = useMemo(() => pouchDrawDimsFromFields(fieldVals), [fieldVals]);

  // Engine-shaped dimensions for the flat-blank die-line — mirrors how
  // BagConfigurator builds engineDims: map each visible field to its persisted
  // key, carry through any other keys, and tag pouchSubtype so the engine
  // resolves the same blank the cost is based on.
  const engineDims = useMemo<EstimateDimensions>(() => {
    const d: Record<string, unknown> = { ...dimensions, productType: 'pouch', pouchSubtype: configType };
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

  return (
    <div className="w-full rounded-lg border border-border bg-surface-raised overflow-hidden shadow-sm">
      {/* Centered header */}
      <div className="px-4 pt-3 pb-2 text-center border-b border-border bg-surface-sunken">
        <p className="text-xs font-medium text-navy/70">
          Adjust the highlighted dimensions (mm) — defaults are pre-filled
        </p>
      </div>

      {/* Dimension inputs */}
      <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-3 px-4 py-3 border-b border-slate bg-slate/25">
        {config.fields.map((f) => (
          <PouchInputField
            key={f.id}
            field={f}
            value={fieldVals[f.id]}
            onChange={handleFieldChange}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Two-up view: finished pouch + flat-blank die-line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 bg-[#f8f9fb] divide-y lg:divide-y-0 lg:divide-x divide-slate">
        <div className="flex flex-col min-h-[360px]">
          <div className="flex-1 min-h-[320px]">
            <PouchSchematic type={configType} vals={fieldVals} />
          </div>
        </div>
        <div className="flex flex-col min-h-[360px]">
          <div className="flex-1 min-h-[320px]">
            <PouchFlatBlank type={configType} dims={engineDims} />
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
            <span className="font-semibold text-navy/70">Face area:</span> {pouchFaceAreaCm2(drawDims)}
          </span>
          <span>
            <span className="font-semibold text-navy/70">Flat sheet:</span> {pouchFlatSheetLabel(drawDims, configType)}
          </span>
        </div>
        <p className="mt-1 leading-snug text-mist/90">
          {pouchConstructionNote(configType)}. Flat blank = the film each pouch is cut from (drives weight &amp; cost).
          Bleed, register marks, and machine allowances are accounted for in the waste calculation.
        </p>
      </div>
    </div>
  );
}
