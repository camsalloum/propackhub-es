import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EstimateDimensions, PouchAccessorySelection } from '@es/engine';
import { PouchSchematic } from './PouchSchematic';
import { PouchFlatBlank } from './PouchFlatBlank';
import {
  POUCH_CONFIGURATOR_CATALOG,
  pouchFieldValuesFromDimensions,
  configuratorTypeForPouchSubtype,
  accessoriesForPouchType,
  POUCH_ACCESSORY_META,
  type PouchConfiguratorField,
  type PouchConfiguratorConfig,
  type PouchAccessoryKind,
} from '../lib/pouchConfiguratorCatalog';
import {
  pouchDrawDimsFromFields,
  pouchFaceAreaCm2,
  pouchFlatSheetLabel,
  pouchConstructionNote,
} from '../lib/pouchDrawDims';
import { selectOnFocus } from '../lib/inputs';

/** Light shape of an accessory material row used to populate dropdowns + snapshot rates. */
export interface AccessoryMaterialOption {
  id: string;
  name: string;
  accessoryKind?: string | null;
  costPerMeterUsd?: number | null;
  costPerPieceUsd?: number | null;
  weightGramPerMeter?: number | null;
  weightGramPerPiece?: number | null;
  /** Substrate fields — used for the window patch (priced as a film: µ × density × $/kg). */
  density?: number | null;
  costPerKgUsd?: number | null;
}

/** Default window-patch film thickness (µ) when first added. */
const DEFAULT_WINDOW_PATCH_MICRON = 30;

/** Friendly names for the view captions. */
const POUCH_TYPE_LABEL: Record<string, string> = {
  'three-side-seal': '3-Side Seal Pouch',
  'center-seal': 'Center-Seal Pouch',
  'four-side-seal': '4-Side Seal Pouch',
  'stand-up': 'Stand-up Pouch',
  'side-gusset': 'Side-Gusset Pouch',
  'flat-bottom': 'Flat-Bottom Pouch',
};

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
          onFocus={selectOnFocus}
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
  accessories = [],
  onAccessoriesChange,
  accessoryMaterials = [],
  disabled = false,
}: {
  productSubtype: string | null | undefined;
  dimensions: Record<string, number | undefined>;
  onDimensionsChange: (patch: Record<string, number>) => void;
  accessories?: PouchAccessorySelection[];
  onAccessoriesChange?: (next: PouchAccessorySelection[]) => void;
  accessoryMaterials?: AccessoryMaterialOption[];
  disabled?: boolean;
}) {
  const configType = configuratorTypeForPouchSubtype(productSubtype);
  const config: PouchConfiguratorConfig | null = configType ? POUCH_CONFIGURATOR_CATALOG[configType] : null;

  const fieldVals = useMemo(
    () => (config ? pouchFieldValuesFromDimensions(config, dimensions) : {}),
    [config, dimensions]
  );

  const drawDims = useMemo(() => pouchDrawDimsFromFields(fieldVals), [fieldVals]);

  const applicableAccessories = useMemo(() => accessoriesForPouchType(configType), [configType]);

  const materialsByKind = useMemo(() => {
    const map: Record<string, AccessoryMaterialOption[]> = {};
    for (const m of accessoryMaterials) {
      const k = (m.accessoryKind || '').toLowerCase();
      if (!k) continue;
      (map[k] ||= []).push(m);
    }
    return map;
  }, [accessoryMaterials]);

  const selectionFor = useCallback(
    (kind: PouchAccessoryKind): PouchAccessorySelection | undefined =>
      accessories.find((a) => a.kind === kind && a.enabled !== false),
    [accessories]
  );

  /** Build a selection that snapshots the chosen material's rates. */
  const buildSelection = useCallback(
    (kind: PouchAccessoryKind, materialId: string | undefined, prev?: PouchAccessorySelection): PouchAccessorySelection => {
      const mat = accessoryMaterials.find((m) => m.id === materialId);
      const base: PouchAccessorySelection = { kind, enabled: true, materialId, count: prev?.count ?? 1 };
      if (kind === 'zipper') {
        base.costPerMeterUsd = mat?.costPerMeterUsd ?? undefined;
        base.weightGramPerMeter = mat?.weightGramPerMeter ?? undefined;
      } else if (kind === 'window') {
        base.widthMm = prev?.widthMm ?? 60;
        base.heightMm = prev?.heightMm ?? 80;
        base.windowPosXPct = prev?.windowPosXPct ?? 50;
        base.windowPosYPct = prev?.windowPosYPct ?? 50;
        // Window patch is a clear film cut from any substrate. Price/weigh it as a
        // film: gsm = µ × density; $/m² = gsm/1000 × $/kg; weight g/m² = gsm.
        const micron = prev?.patchMicronMm ?? DEFAULT_WINDOW_PATCH_MICRON;
        base.patchMicronMm = micron;
        const density = mat?.density ?? null;
        const costPerKg = mat?.costPerKgUsd ?? null;
        if (density != null && costPerKg != null && micron > 0) {
          const gsm = micron * density;
          base.weightGramPerM2 = gsm;
          base.costPerM2Usd = (gsm / 1000) * costPerKg;
        } else {
          base.weightGramPerM2 = undefined;
          base.costPerM2Usd = undefined;
        }
      } else {
        base.costPerPieceUsd = mat?.costPerPieceUsd ?? undefined;
        base.weightGramPerPiece = mat?.weightGramPerPiece ?? undefined;
      }
      return base;
    },
    [accessoryMaterials]
  );

  const upsertAccessory = useCallback(
    (next: PouchAccessorySelection) => {
      if (!onAccessoriesChange) return;
      const rest = accessories.filter((a) => a.kind !== next.kind);
      onAccessoriesChange([...rest, next]);
    },
    [accessories, onAccessoriesChange]
  );

  const removeAccessory = useCallback(
    (kind: PouchAccessoryKind) => {
      if (!onAccessoriesChange) return;
      onAccessoriesChange(accessories.filter((a) => a.kind !== kind));
    },
    [accessories, onAccessoriesChange]
  );

  const toggleAccessory = useCallback(
    (kind: PouchAccessoryKind, on: boolean) => {
      if (!on) return removeAccessory(kind);
      const first = materialsByKind[kind]?.[0];
      upsertAccessory(buildSelection(kind, first?.id));
    },
    [materialsByKind, buildSelection, upsertAccessory, removeAccessory]
  );

  // Engine-shaped dimensions for the flat-blank die-line — mirrors how
  // BagConfigurator builds engineDims: map each visible field to its persisted
  // key, carry through any other keys, and tag pouchSubtype so the engine
  // resolves the same blank the cost is based on.
  const engineDims = useMemo<EstimateDimensions>(() => {
    const d: Record<string, unknown> = { ...dimensions, productType: 'pouch', pouchSubtype: configType };
    if (config) for (const f of config.fields) d[f.dimensionKey] = fieldVals[f.id];
    if (accessories.length) d.accessories = accessories;
    return d as unknown as EstimateDimensions;
  }, [dimensions, fieldVals, config, configType, accessories]);

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

      {/* Accessories — optional add-ons that add weight & cost (zipper/spout/valve/window/handle) */}
      {onAccessoriesChange && applicableAccessories.length > 0 && (
        <div className="px-4 py-3 border-b border-slate bg-surface-sunken/40">
          <p className="text-[11px] font-semibold text-navy/80 tracking-wide mb-2">
            Accessories <span className="font-normal text-mist">— add resealable / functional features (adds weight &amp; cost)</span>
          </p>
          <div className="flex flex-col gap-2">
            {applicableAccessories.map((kind) => {
              const meta = POUCH_ACCESSORY_META[kind];
              const sel = selectionFor(kind);
              const on = !!sel;
              const opts = materialsByKind[kind] ?? [];
              return (
                <div key={kind} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-navy cursor-pointer select-none min-w-[8.5rem]">
                    <input
                      type="checkbox"
                      className="accent-gold w-3.5 h-3.5"
                      checked={on}
                      disabled={disabled}
                      onChange={(e) => toggleAccessory(kind, e.target.checked)}
                    />
                    {meta.label}
                  </label>
                  {on && (
                    <>
                      {opts.length > 0 ? (
                        <select
                          className="input !min-h-[30px] !py-0.5 !px-2 text-xs max-w-[12rem]"
                          value={sel?.materialId ?? ''}
                          disabled={disabled}
                          onChange={(e) => upsertAccessory(buildSelection(kind, e.target.value || undefined, sel))}
                        >
                          <option value="">— select material —</option>
                          {opts.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[11px] text-warning">No {meta.label.toLowerCase()} material in master data — add one in Raw Materials.</span>
                      )}
                      {(kind === 'spout' || kind === 'valve' || kind === 'handle') && (
                        <label className="flex items-center gap-1 text-[11px] text-mist">
                          Qty
                          <input
                            type="number"
                            min={1}
                            step={1}
                            disabled={disabled}
                            className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-16"
                            value={sel?.count ?? 1}
                            onChange={(e) => upsertAccessory({ ...buildSelection(kind, sel?.materialId, sel), count: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </label>
                      )}
                      {kind === 'window' && (
                        <span className="flex items-center gap-1.5 text-[11px] text-mist">
                          <input
                            type="number" min={0} step={1} disabled={disabled}
                            className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-16"
                            value={sel?.widthMm ?? 60}
                            onChange={(e) => upsertAccessory({ ...buildSelection(kind, sel?.materialId, sel), widthMm: parseFloat(e.target.value) || 0 })}
                          />
                          ×
                          <input
                            type="number" min={0} step={1} disabled={disabled}
                            className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-16"
                            value={sel?.heightMm ?? 80}
                            onChange={(e) => upsertAccessory({ ...buildSelection(kind, sel?.materialId, sel), heightMm: parseFloat(e.target.value) || 0 })}
                          />
                          mm
                          <span className="ml-1">·</span>
                          <input
                            type="number" min={0} step={1} disabled={disabled}
                            title="Patch film thickness"
                            className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-14"
                            value={sel?.patchMicronMm ?? DEFAULT_WINDOW_PATCH_MICRON}
                            onChange={(e) =>
                              upsertAccessory(
                                buildSelection(kind, sel?.materialId, {
                                  ...(sel as PouchAccessorySelection),
                                  patchMicronMm: parseFloat(e.target.value) || 0,
                                })
                              )
                            }
                          />
                          µ
                        </span>
                      )}
                      {kind === 'window' && (
                        <span className="flex items-center gap-1.5 text-[11px] text-mist">
                          pos
                          <input
                            type="number" min={0} max={100} step={1} disabled={disabled}
                            title="Window horizontal position (% of width)"
                            className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-14"
                            value={sel?.windowPosXPct ?? 50}
                            onChange={(e) =>
                              upsertAccessory(
                                buildSelection(kind, sel?.materialId, {
                                  ...(sel as PouchAccessorySelection),
                                  windowPosXPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                                })
                              )
                            }
                          />
                          ×
                          <input
                            type="number" min={0} max={100} step={1} disabled={disabled}
                            title="Window vertical position (% of height)"
                            className="input !min-h-[30px] !py-0.5 !px-2 text-xs w-14"
                            value={sel?.windowPosYPct ?? 50}
                            onChange={(e) =>
                              upsertAccessory(
                                buildSelection(kind, sel?.materialId, {
                                  ...(sel as PouchAccessorySelection),
                                  windowPosYPct: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                                })
                              )
                            }
                          />
                          %
                        </span>
                      )}
                      <span className="text-[10px] text-mist/80 italic">{meta.hint}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-up view: finished pouch + flat-blank die-line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 bg-[#f8f9fb] divide-y lg:divide-y-0 lg:divide-x divide-slate">
        <div className="flex flex-col min-h-[360px]">
          <p className="px-3 pt-2 text-[11px] font-semibold text-navy/70 text-center">
            {POUCH_TYPE_LABEL[configType] ?? configType} — open view
          </p>
          <div className="flex-1 min-h-[320px]">
            <PouchSchematic type={configType} vals={fieldVals} accessories={accessories} />
          </div>
        </div>
        <div className="flex flex-col min-h-[360px]">
          <p className="px-3 pt-2 text-[11px] font-semibold text-navy/70 text-center">
            {POUCH_TYPE_LABEL[configType] ?? configType} — flat blank
          </p>
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
