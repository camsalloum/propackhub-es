import { useCallback, useEffect, useMemo } from 'react';
import { SleeveFlatBlank } from './SleeveFlatBlank';
import { SleeveSchematic } from './SleeveSchematic';
import { RollSpecFields } from '../continuousWeb/RollSpecFields';
import { WebInputField } from '../continuousWeb/WebInputField';
import {
  SLEEVE_CONFIGURATOR,
  sleeveDimensionsPatchFromFields,
  sleeveFieldValuesFromDimensions,
} from '../../lib/sleeveConfiguratorCatalog';
import {
  sleeveBlankAreaCm2,
  sleeveDrawDimsFromFields,
  sleeveFlatBlankLabel,
  sleeveFormedDiameterLabel,
  sleeveOpenWebWidthMm,
} from '../../lib/sleeveDrawDims';
import {
  CORE_INSIDE_MM_BY_INCH,
  type CoreInchPreset,
  patchNetFilmWeightKg,
  patchRollOdMm,
  rollSpecFromDimensions,
  seedRollSpecPatch,
} from '../../lib/rollSpec';

export function SleeveConfigurator({
  dimensions,
  onDimensionsChange,
  disabled = false,
  totalGsm = 50,
  filmDensityGcm3 = 1,
}: {
  dimensions: Record<string, number | undefined>;
  onDimensionsChange: (patch: Record<string, number>) => void;
  disabled?: boolean;
  totalGsm?: number;
  filmDensityGcm3?: number;
}) {
  const fieldVals = useMemo(() => sleeveFieldValuesFromDimensions(dimensions), [dimensions]);
  const structure = useMemo(
    () => ({ totalGsm: Math.max(1, totalGsm), filmDensityGcm3: Math.max(0.01, filmDensityGcm3) }),
    [totalGsm, filmDensityGcm3]
  );
  const openWebMm = sleeveOpenWebWidthMm(fieldVals.LF);

  const rollSpec = useMemo(
    () => rollSpecFromDimensions(dimensions, structure, openWebMm, fieldVals.CO, 1),
    [dimensions, structure, openWebMm, fieldVals.CO]
  );

  const drawDims = useMemo(() => sleeveDrawDimsFromFields(fieldVals, rollSpec), [fieldVals, rollSpec]);

  useEffect(() => {
    const patch: Record<string, number> = {};
    if (dimensions.numberOfUps == null || dimensions.numberOfUps < 1) patch.numberOfUps = 1;
    if (dimensions.extraPrintingTrimMm == null) patch.extraPrintingTrimMm = 0;
    if (dimensions.piecesPerCut == null || dimensions.piecesPerCut < 1) patch.piecesPerCut = 1;
    if (fieldVals.LF > 0 && (dimensions.reelWidthMm == null || dimensions.reelWidthMm <= 0)) {
      patch.reelWidthMm = fieldVals.LF;
    }
    Object.assign(
      patch,
      seedRollSpecPatch(dimensions, openWebMm, structure.totalGsm, structure.filmDensityGcm3)
    );
    if (Object.keys(patch).length > 0) onDimensionsChange(patch);
  }, [
    dimensions.numberOfUps,
    dimensions.extraPrintingTrimMm,
    dimensions.piecesPerCut,
    dimensions.reelWidthMm,
    dimensions.coreInsideDiameterMm,
    dimensions.coreThicknessMm,
    dimensions.requiredRollWeightKg,
    dimensions.rollOutsideDiameterMm,
    dimensions.rollSpecOdDriven,
    fieldVals.LF,
    openWebMm,
    structure.totalGsm,
    structure.filmDensityGcm3,
    onDimensionsChange,
  ]);

  const handleFieldChange = useCallback(
    (fieldId: string, value: number) => {
      onDimensionsChange(sleeveDimensionsPatchFromFields(fieldId, value, fieldVals));
    },
    [fieldVals, onDimensionsChange]
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
        {SLEEVE_CONFIGURATOR.fields.map((f) => (
          <WebInputField
            key={f.id}
            idPrefix="sleeve"
            field={f}
            value={fieldVals[f.id]}
            onChange={handleFieldChange}
            disabled={disabled}
          />
        ))}
        <RollSpecFields
          idPrefix="sleeve"
          coreInsideMm={coreInsideMm}
          coreThicknessMm={coreThicknessMm}
          rollOdMm={rollSpec.rollOutsideDiameterMm}
          netFilmWeightKg={rollSpec.filmOnRollWeightKg}
          rollSpec={rollSpec}
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
          <p className="px-3 pt-2 text-[11px] font-semibold text-navy/70 text-center">Sleeve — wound film</p>
          <div className="flex-1 min-h-[320px]">
            <SleeveSchematic dims={drawDims} />
          </div>
        </div>
        <div className="flex flex-col min-h-[360px]">
          <p className="px-3 pt-2 text-[11px] font-semibold text-navy/70 text-center">Sleeve — flat blank</p>
          <div className="flex-1 min-h-[320px]">
            <SleeveFlatBlank dims={drawDims} />
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-t border-slate bg-slate/25 text-[11px] text-mist">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
            <span className="font-semibold text-navy/70">Live</span>
          </span>
          <span>
            <span className="font-semibold text-navy/70">Blank area:</span> {sleeveBlankAreaCm2(drawDims)}
          </span>
          <span>
            <span className="font-semibold text-navy/70">Flat blank:</span> {sleeveFlatBlankLabel(drawDims)}
          </span>
          <span>
            <span className="font-semibold text-navy/70">Formed tube:</span> {sleeveFormedDiameterLabel(drawDims)}
          </span>
          <span>
            <span className="font-semibold text-navy/70">Open web:</span> {Math.round(drawDims.openWebWidthMm)} mm
          </span>
        </div>
        <p className="mt-1 leading-snug text-mist/90">
          Lay-flat is the collapsed blank width. Wound view uses open web (2×LF + seam). Reel width follows lay-flat for
          costing.
        </p>
      </div>
    </div>
  );
}
