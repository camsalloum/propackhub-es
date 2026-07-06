import { useCallback, useEffect, useMemo } from 'react';
import { RollFlatBlank } from './RollFlatBlank';
import { RollSchematic } from './RollSchematic';
import { RollSpecFields } from '../continuousWeb/RollSpecFields';
import { WebInputField } from '../continuousWeb/WebInputField';
import {
  ROLL_CONFIGURATOR,
  rollFieldValuesFromDimensions,
} from '../../lib/rollConfiguratorCatalog';
import {
  rollDrawDimsFromFields,
  rollFlatWebLabel,
  rollPieceAreaCm2,
  rollRepeatAreaCm2,
} from '../../lib/rollDrawDims';
import {
  CORE_INSIDE_MM_BY_INCH,
  type CoreInchPreset,
  patchNetFilmWeightKg,
  patchRollOdMm,
  rollSpecFromDimensions,
  seedRollSpecPatch,
} from '../../lib/rollSpec';

export function RollConfigurator({
  dimensions,
  onDimensionsChange,
  disabled = false,
  totalGsm = 50,
  filmDensityGcm3 = 1,
  isLabels = false,
  continuousWeb = false,
}: {
  dimensions: Record<string, number | undefined>;
  onDimensionsChange: (patch: Record<string, number>) => void;
  disabled?: boolean;
  totalGsm?: number;
  filmDensityGcm3?: number;
  isLabels?: boolean;
  continuousWeb?: boolean;
}) {
  const fieldVals = useMemo(
    () => rollFieldValuesFromDimensions(dimensions, { isLabels, continuousWeb }),
    [dimensions, isLabels, continuousWeb]
  );
  const hasCutoffRepeat = fieldVals.CO > 0;
  const structure = useMemo(
    () => ({ totalGsm: Math.max(1, totalGsm), filmDensityGcm3: Math.max(0.01, filmDensityGcm3) }),
    [totalGsm, filmDensityGcm3]
  );

  const rollSpec = useMemo(
    () =>
      rollSpecFromDimensions(dimensions, structure, fieldVals.RW, fieldVals.CO, fieldVals.PPC),
    [dimensions, structure, fieldVals.RW, fieldVals.CO, fieldVals.PPC]
  );

  const drawDims = useMemo(() => rollDrawDimsFromFields(fieldVals, rollSpec), [fieldVals, rollSpec]);

  useEffect(() => {
    const needsUps = dimensions.numberOfUps == null || dimensions.numberOfUps < 1;
    const needsTrim = dimensions.extraPrintingTrimMm == null;
    const specPatch = seedRollSpecPatch(dimensions, fieldVals.RW, structure.totalGsm, structure.filmDensityGcm3);
    const patch = {
      ...(needsUps ? { numberOfUps: 1 } : {}),
      ...(needsTrim ? { extraPrintingTrimMm: 0 } : {}),
      ...specPatch,
    };
    if (Object.keys(patch).length > 0) onDimensionsChange(patch);
  }, [
    dimensions.numberOfUps,
    dimensions.extraPrintingTrimMm,
    dimensions.coreInsideDiameterMm,
    dimensions.coreThicknessMm,
    dimensions.requiredRollWeightKg,
    dimensions.rollOutsideDiameterMm,
    dimensions.rollSpecOdDriven,
    fieldVals.RW,
    structure.totalGsm,
    structure.filmDensityGcm3,
    onDimensionsChange,
  ]);

  const handleFieldChange = useCallback(
    (fieldId: string, value: number) => {
      const fieldDef = ROLL_CONFIGURATOR.fields.find((f) => f.id === fieldId);
      if (!fieldDef) return;
      const v =
        fieldId === 'PPC'
          ? Math.max(1, Math.round(value))
          : fieldId === 'CO'
            ? Math.max(0, value)
            : value;
      const patch: Record<string, number> = { [fieldDef.dimensionKey]: v };
      if (fieldId === 'CO' && v <= 0) patch.piecesPerCut = 1;
      onDimensionsChange(patch);
    },
    [onDimensionsChange]
  );

  const coreInsideMm = dimensions.coreInsideDiameterMm ?? CORE_INSIDE_MM_BY_INCH[6];
  const coreThicknessMm = dimensions.coreThicknessMm ?? 12;

  return (
    <div className="w-full rounded-lg border border-border bg-surface-raised overflow-hidden shadow-sm">
      <div className="px-4 pt-3 pb-2 text-center border-b border-border bg-surface-sunken">
        <p className="text-xs font-medium text-text-secondary">
          Adjust the highlighted dimensions (mm) — defaults are pre-filled
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-3 px-4 py-3 border-b border-slate bg-slate/25">
        {ROLL_CONFIGURATOR.fields
          .filter((f) => hasCutoffRepeat || f.id !== 'PPC')
          .map((f) => (
          <WebInputField
            key={f.id}
            idPrefix="roll"
            field={f}
            value={fieldVals[f.id]}
            onChange={handleFieldChange}
            disabled={disabled}
          />
        ))}
        <RollSpecFields
          idPrefix="roll"
          coreInsideMm={coreInsideMm}
          coreThicknessMm={coreThicknessMm}
          rollOdMm={rollSpec.rollOutsideDiameterMm}
          netFilmWeightKg={rollSpec.filmOnRollWeightKg}
          rollSpec={rollSpec}
          hasCutoffRepeat={hasCutoffRepeat}
          disabled={disabled}
          onCoreInchChange={(inch: CoreInchPreset) =>
            onDimensionsChange({ coreInsideDiameterMm: CORE_INSIDE_MM_BY_INCH[inch] })
          }
          onCoreThicknessChange={(mm) => onDimensionsChange({ coreThicknessMm: Math.max(0, mm) })}
          onOdChange={(mm) => onDimensionsChange(patchRollOdMm(mm, rollSpec.coreOdMm))}
          onNetFilmWeightChange={(kg) => onDimensionsChange(patchNetFilmWeightKg(kg))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 bg-[#f8f9fb] divide-y lg:divide-y-0 lg:divide-x divide-slate">
        <div className="flex flex-col min-h-[360px]">
          <p className="px-3 pt-2 text-[11px] font-semibold text-navy/70 text-center">Roll — wound view</p>
          <div className="flex-1 min-h-[320px]">
            <RollSchematic dims={drawDims} />
          </div>
        </div>
        <div className="flex flex-col min-h-[360px]">
          <p className="px-3 pt-2 text-[11px] font-semibold text-navy/70 text-center">Roll — flat web</p>
          <div className="flex-1 min-h-[320px]">
            <RollFlatBlank dims={drawDims} />
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate bg-slate/25 text-[11px] text-mist">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
            <span className="font-semibold text-navy/70">Live</span>
          </span>
          {!hasCutoffRepeat && (
            <span>
              <span className="font-semibold text-navy/70">Mode:</span> continuous web (no cut-off)
            </span>
          )}
          {hasCutoffRepeat && (
            <span>
              <span className="font-semibold text-navy/70">Repeat area:</span> {rollRepeatAreaCm2(drawDims)}
            </span>
          )}
          {hasCutoffRepeat && drawDims.PPC > 1 && (
            <span>
              <span className="font-semibold text-navy/70">Per lane:</span> {rollPieceAreaCm2(drawDims)}
            </span>
          )}
          <span>
            <span className="font-semibold text-navy/70">Flat web:</span> {rollFlatWebLabel(drawDims)}
          </span>
        </div>
        <p className="mt-1 leading-snug text-mist/90">
          {hasCutoffRepeat
            ? 'Reel width is the wound web (cross-direction). Cut-off is the repeat along the web. Net film weight or roll OD drive length and pieces; total roll weight includes the core.'
            : 'Continuous unprinted web — cut-off 0. Quote by kg, m², LM, or roll; no pieces per roll.'}
        </p>
      </div>
    </div>
  );
}
