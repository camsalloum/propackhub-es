import { useCallback, useMemo } from 'react';
import { BagSchematic } from './BagSchematic';
import {
  BAG_CONFIGURATOR_CATALOG,
  bagFieldValuesFromDimensions,
  configuratorTypeForBagSubtype,
  dimensionsPatchFromBagFields,
  type BagConfiguratorField,
  type BagConfiguratorConfig,
} from '../lib/bagConfiguratorCatalog';
import {
  BAG_SVG_VH,
  BAG_SVG_VW,
  bagFieldsWithoutAnchors,
  computeBagDimAnchors,
} from '../lib/bagSchematicLayout';

const fieldClass = 'input input-compact w-full min-w-0 text-center tabular-nums';
const labelClass = 'block text-xs font-medium text-navy mb-1 text-center truncate px-0.5';

function BagDimField({
  field,
  value,
  onChange,
  disabled,
  compact = false,
}: {
  field: BagConfiguratorField;
  value: number;
  onChange: (fieldId: string, value: number) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'min-w-[7.5rem]' : 'min-w-0'}>
      <label className={labelClass} title={field.hint}>
        {field.label} ({field.unit})
      </label>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={0.1}
        disabled={disabled}
        className={fieldClass}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(field.id, n);
        }}
      />
    </div>
  );
}

/**
 * Bag dimensions UI — replaces the spec-row width/height/gusset fields when a bag subtype is selected.
 * Film thickness / GSM come from Structure web totals, not here.
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

  const fieldById = useMemo(() => {
    const map = new Map<string, BagConfiguratorField>();
    config?.fields.forEach((f) => map.set(f.id, f));
    return map;
  }, [config]);

  const anchors = useMemo(
    () => (configType ? computeBagDimAnchors(configType, fieldVals) : []),
    [configType, fieldVals]
  );

  const anchoredIds = useMemo(() => new Set(anchors.map((a) => a.fieldId)), [anchors]);

  const fallbackFieldIds = useMemo(
    () =>
      config
        ? bagFieldsWithoutAnchors(
            config.fields.map((f) => f.id),
            anchoredIds
          )
        : [],
    [config, configType, anchoredIds]
  );

  const handleFieldChange = useCallback(
    (fieldId: string, value: number) => {
      if (!config) return;
      const nextVals = { ...fieldVals, [fieldId]: value };
      onDimensionsChange(dimensionsPatchFromBagFields(config, nextVals));
    },
    [config, fieldVals, onDimensionsChange]
  );

  if (!config || !configType) return null;

  return (
    <div className="w-full">
      <p className="text-xs text-mist mb-2 text-center sm:text-left">
        {config.desc}
        <span className="text-mist/80"> — Gauge &amp; GSM from Structure totals.</span>
      </p>

      <div
        className="relative w-full max-w-3xl mx-auto rounded-lg border border-slate bg-white overflow-visible"
        style={{ aspectRatio: `${BAG_SVG_VW} / ${BAG_SVG_VH}`, minHeight: '280px' }}
      >
        <BagSchematic type={configType} vals={fieldVals} />

        {/* Full-size inputs positioned on the schematic at dimension anchors */}
        <div className="absolute inset-0">
          {anchors.map((anchor) => {
            const field = fieldById.get(anchor.fieldId);
            if (!field) return null;
            const leftPct = (anchor.x / BAG_SVG_VW) * 100;
            const topPct = (anchor.y / BAG_SVG_VH) * 100;
            return (
              <div
                key={anchor.fieldId}
                className="absolute z-10 w-[8.5rem] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              >
                <div className="rounded-md border border-slate bg-white/95 px-1.5 py-1 shadow-sm">
                  <BagDimField
                    field={field}
                    value={fieldVals[anchor.fieldId]}
                    onChange={handleFieldChange}
                    disabled={disabled}
                    compact
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {fallbackFieldIds.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-2 max-w-3xl mx-auto">
          {fallbackFieldIds.map((id) => {
            const field = fieldById.get(id);
            if (!field) return null;
            return (
              <BagDimField
                key={id}
                field={field}
                value={fieldVals[id]}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
