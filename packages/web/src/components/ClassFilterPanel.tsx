import type { ClassFilter, TemplateStructureTier } from '../lib/templateCatalog';

export const EMPTY_CLASS_FILTER: ClassFilter = {
  materialClass: null,
  isPrinted: null,
  structure: null,
};

export const CLASS_FILTER_ROWS = {
  material: [
    { label: 'PE', value: 'PE' as const },
    { label: 'Non PE', value: 'Non PE' as const },
  ],
  print: [
    { label: 'Printed', value: true },
    { label: 'Plain', value: false },
  ],
  structure: [
    { label: 'Mono', value: 'mono' as TemplateStructureTier },
    { label: 'Duplex', value: 'duplex' as TemplateStructureTier },
    { label: 'Triplex', value: 'triplex' as TemplateStructureTier },
    { label: 'Quadriplex', value: 'quadriplex' as TemplateStructureTier },
  ],
};

function FilterChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
        active
          ? 'bg-gold text-white border-gold'
          : disabled
            ? 'border-transparent text-mist/40 cursor-default'
            : 'bg-white border-border text-ink hover:border-gold/50',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

/** @deprecated Use FilterChip internally — kept for graph/tests compat */
export function FilterCell({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
  return <FilterChip label={label} active={active} disabled={disabled} onClick={onClick} />;
}

interface ClassFilterPanelProps {
  title?: string;
  filter: ClassFilter;
  isAllActive: boolean;
  countLabel: string;
  onReset: () => void;
  onToggleMaterial: (value: 'PE' | 'Non PE') => void;
  onTogglePrinted: (value: boolean) => void;
  onToggleStructure: (value: TemplateStructureTier) => void;
  countWithFilter: (partial: Partial<ClassFilter>) => number;
}

export function ClassFilterPanel({
  title,
  filter,
  isAllActive,
  countLabel,
  onReset,
  onToggleMaterial,
  onTogglePrinted,
  onToggleStructure,
  countWithFilter,
}: ClassFilterPanelProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {title ? (
          <span className="text-xs font-medium text-mist shrink-0 mr-0.5">{title}</span>
        ) : null}
        <FilterChip label="All" active={isAllActive} disabled={false} onClick={onReset} />
        <span className="text-border select-none hidden sm:inline" aria-hidden>
          |
        </span>
        {CLASS_FILTER_ROWS.material.map(({ label, value }) => (
          <FilterChip
            key={value}
            label={label}
            active={filter.materialClass === value}
            disabled={
              !isAllActive &&
              filter.materialClass !== value &&
              countWithFilter({ materialClass: value }) === 0
            }
            onClick={() => onToggleMaterial(value)}
          />
        ))}
        <span className="text-border select-none hidden sm:inline" aria-hidden>
          |
        </span>
        {CLASS_FILTER_ROWS.print.map(({ label, value }) => (
          <FilterChip
            key={label}
            label={label}
            active={filter.isPrinted === value}
            disabled={countWithFilter({ isPrinted: value }) === 0}
            onClick={() => onTogglePrinted(value)}
          />
        ))}
        <span className="text-border select-none hidden sm:inline" aria-hidden>
          |
        </span>
        {CLASS_FILTER_ROWS.structure.map(({ label, value }) => (
          <FilterChip
            key={value}
            label={label}
            active={filter.structure === value}
            disabled={countWithFilter({ structure: value }) === 0}
            onClick={() => onToggleStructure(value)}
          />
        ))}
      </div>
      <p className="text-xs text-mist shrink-0 sm:pl-2">{countLabel}</p>
    </div>
  );
}
