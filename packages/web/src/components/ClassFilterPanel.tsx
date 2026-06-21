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

export function FilterCell({
  label,
  active,
  disabled,
  wide,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium border transition-all select-none',
        wide ? 'col-span-full w-full' : '',
        active
          ? 'bg-gold text-white border-gold shadow-sm'
          : disabled
            ? 'border-border text-mist/40 bg-white cursor-default'
            : 'bg-white border-border text-ink hover:border-gold/40',
      ]
        .join(' ')
        .trim()}
    >
      {label}
    </button>
  );
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
  title = 'Filter by structure',
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
    <div className="card mb-6">
      <h2 className="text-sm font-semibold text-navy mb-3">{title}</h2>
      <div className="space-y-2">
        <FilterCell label="All" active={isAllActive} disabled={false} wide onClick={onReset} />
        <div className="grid grid-cols-2 gap-2">
          {CLASS_FILTER_ROWS.material.map(({ label, value }) => (
            <FilterCell
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
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CLASS_FILTER_ROWS.print.map(({ label, value }) => (
            <FilterCell
              key={label}
              label={label}
              active={filter.isPrinted === value}
              disabled={countWithFilter({ isPrinted: value }) === 0}
              onClick={() => onTogglePrinted(value)}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CLASS_FILTER_ROWS.structure.map(({ label, value }) => (
            <FilterCell
              key={value}
              label={label}
              active={filter.structure === value}
              disabled={countWithFilter({ structure: value }) === 0}
              onClick={() => onToggleStructure(value)}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-mist mt-3">{countLabel}</p>
    </div>
  );
}
