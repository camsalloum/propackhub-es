import { SUBSTRATE_FAMILY_TABS } from '../../lib/substratePbTaxonomy';

type Props = {
  activeId: string;
  onChange: (id: string) => void;
  countsByFamily: Record<string, number>;
};

export function SubstrateFamilyNav({ activeId, onChange, countsByFamily }: Props) {
  return (
    <div className="flex gap-1 px-3 py-2 border-b border-border bg-surface-raised overflow-x-auto">
      {SUBSTRATE_FAMILY_TABS.map((tab) => {
        const count = countsByFamily[tab.id] ?? 0;
        if (count === 0) return null;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-micro ease-micro shrink-0 ${
              activeId === tab.id ? 'bg-navy/10 text-navy' : 'text-mist hover:bg-slate hover:text-ink'
            }`}
          >
            {tab.label}
            <span className="ml-1 opacity-60">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
