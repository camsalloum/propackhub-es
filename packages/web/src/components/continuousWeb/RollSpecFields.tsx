import { useEffect, useState } from 'react';
import { selectOnFocus } from '../../lib/inputs';
import {
  CORE_INSIDE_MM_BY_INCH,
  type CoreInchPreset,
  coreInchFromInsideMm,
  type RollSpecResult,
} from '../../lib/rollSpec';

function EditableField({
  id,
  label,
  unit,
  value,
  onChange,
  disabled,
  step = 0.1,
  min = 0,
  decimals = 2,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  step?: number;
  min?: number;
  decimals?: number;
}) {
  const [draft, setDraft] = useState(() => (Number.isFinite(value) ? String(value) : ''));

  useEffect(() => {
    if (!Number.isFinite(value)) {
      setDraft('');
      return;
    }
    setDraft(decimals === 0 ? String(Math.round(value)) : String(value));
  }, [value, decimals]);

  return (
    <div className="flex flex-col gap-1 min-w-[6.5rem] shrink-0">
      <label htmlFor={id} className="text-[11px] font-semibold text-navy/80 tracking-wide select-none truncate text-center">
        {label}
      </label>
      <div className="flex border border-accent/40 rounded-md overflow-hidden bg-accent-soft focus-within:border-accent focus-within:ring-2 focus-within:ring-focus-ring/30 transition-shadow">
        <input
          id={id}
          type="number"
          inputMode={decimals === 0 ? 'numeric' : 'decimal'}
          min={min}
          step={step}
          disabled={disabled}
          className="border-none outline-none w-[4.75rem] px-2 py-1.5 text-sm font-semibold text-brand tabular-nums text-center bg-accent-soft focus:bg-accent/10 disabled:opacity-50"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(decimals === 0 ? Math.round(n) : n);
          }}
          onBlur={() => {
            const n = parseFloat(draft);
            if (!Number.isFinite(n)) setDraft(Number.isFinite(value) ? String(Math.round(value)) : '');
            else if (decimals === 0) setDraft(String(Math.round(n)));
            else setDraft(Number(n.toFixed(decimals)).toString());
          }}
          onFocus={selectOnFocus}
        />
        <span className="bg-accent/15 border-l border-accent/40 px-2 py-1.5 text-[11px] font-semibold text-accent-text flex items-center">
          {unit}
        </span>
      </div>
    </div>
  );
}

function CalcField({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col gap-1 min-w-[6.5rem] shrink-0">
      <span className="text-[11px] font-semibold text-navy/80 tracking-wide select-none truncate text-center">
        {label}
      </span>
      <div className="flex border border-slate/70 rounded-md overflow-hidden bg-slate/30">
        <span className="w-[4.75rem] px-2 py-1.5 text-sm font-semibold text-navy/75 tabular-nums text-center truncate">
          {value}
        </span>
        <span className="bg-slate/45 border-l border-slate/70 px-2 py-1.5 text-[11px] font-semibold text-navy/55 flex items-center">
          {unit}
        </span>
      </div>
    </div>
  );
}

export function RollSpecFields({
  idPrefix,
  coreInsideMm,
  coreThicknessMm,
  rollOdMm,
  netFilmWeightKg,
  rollSpec,
  hasCutoffRepeat = true,
  disabled,
  onCoreInchChange,
  onCoreThicknessChange,
  onOdChange,
  onNetFilmWeightChange,
}: {
  idPrefix: string;
  coreInsideMm: number;
  coreThicknessMm: number;
  rollOdMm: number;
  netFilmWeightKg: number;
  rollSpec: RollSpecResult;
  hasCutoffRepeat?: boolean;
  disabled?: boolean;
  onCoreInchChange: (inch: CoreInchPreset) => void;
  onCoreThicknessChange: (mm: number) => void;
  onOdChange: (mm: number) => void;
  onNetFilmWeightChange: (kg: number) => void;
}) {
  const coreInch = coreInchFromInsideMm(coreInsideMm);

  return (
    <>
      <EditableField
        id={`${idPrefix}-roll-od`}
        label="Roll OD"
        unit="mm"
        value={Math.round(rollOdMm)}
        onChange={onOdChange}
        disabled={disabled}
        step={1}
        min={Math.round(rollSpec.coreOdMm)}
        decimals={0}
      />
      <EditableField
        id={`${idPrefix}-net-film-weight`}
        label="Net film weight"
        unit="kg"
        value={Math.round(netFilmWeightKg)}
        onChange={onNetFilmWeightChange}
        disabled={disabled}
        step={1}
        min={1}
        decimals={0}
      />
      <div className="flex flex-col gap-1 min-w-[6.5rem] shrink-0">
        <label htmlFor={`${idPrefix}-core-inch`} className="text-[11px] font-semibold text-navy/80 text-center">
          Core ID
        </label>
        <select
          id={`${idPrefix}-core-inch`}
          disabled={disabled}
          value={coreInch}
          onChange={(e) => onCoreInchChange(Number(e.target.value) as CoreInchPreset)}
          className="border border-accent/40 rounded-md px-2 py-1.5 text-sm font-semibold text-brand bg-accent-soft focus:border-accent focus:ring-2 focus:ring-focus-ring/30"
        >
          {(Object.keys(CORE_INSIDE_MM_BY_INCH) as unknown as CoreInchPreset[]).map((inch) => (
            <option key={inch} value={inch}>
              {inch}&quot;
            </option>
          ))}
        </select>
      </div>
      <EditableField
        id={`${idPrefix}-core-thickness`}
        label="Core thickness"
        unit="mm"
        value={coreThicknessMm}
        onChange={onCoreThicknessChange}
        disabled={disabled}
        step={0.5}
        decimals={1}
      />
      <CalcField
        label="Length"
        value={Math.round(rollSpec.filmOnRollLengthM).toLocaleString()}
        unit="m"
      />
      <CalcField
        label="Pieces/roll"
        value={hasCutoffRepeat ? rollSpec.piecesPerRoll.toLocaleString() : '—'}
        unit="pcs"
      />
      <CalcField label="Total roll weight" value={Math.round(rollSpec.totalRollWeightKg).toLocaleString()} unit="kg" />
    </>
  );
}
