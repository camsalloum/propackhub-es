import {
  CONTAINER_BAND_PLACEMENT_CODE,
  CONTAINER_BAND_PLACEMENT_LABELS,
  CONTAINER_BAND_PLACEMENTS,
  containerBandPlacementFromCode,
  type ContainerBandPlacement,
} from '../../lib/containerBandViz';

export function SleeveBandPlacement({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (code: number) => void;
}) {
  const current = containerBandPlacementFromCode(value);

  return (
    <div className="flex flex-col gap-1 min-w-[11rem] shrink-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-navy/60">Placement</span>
      <div className="inline-flex rounded border border-border overflow-hidden bg-surface-raised">
        {CONTAINER_BAND_PLACEMENTS.map((p: ContainerBandPlacement) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(CONTAINER_BAND_PLACEMENT_CODE[p])}
            className={`px-2 py-1 text-[11px] font-medium transition-colors ${
              current === p
                ? 'bg-brand text-white'
                : 'text-navy/70 hover:bg-slate/60 disabled:opacity-50'
            }`}
          >
            {CONTAINER_BAND_PLACEMENT_LABELS[p]}
          </button>
        ))}
      </div>
    </div>
  );
}
