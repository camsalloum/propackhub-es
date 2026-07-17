import {
  ASSUMPTION_CATEGORY_LABELS,
  ASSUMPTION_EDIT_LABELS,
  ESTIMATION_ASSUMPTIONS,
  type AssumptionCategory,
  type EstimationAssumption,
} from '@es/engine';

const CATEGORY_ORDER: AssumptionCategory[] = [
  'packaging',
  'consumables',
  'solvent',
  'geometry',
];

function byCategory(cat: AssumptionCategory): EstimationAssumption[] {
  return ESTIMATION_ASSUMPTIONS.filter((a) => a.category === cat);
}

function EditBadge({ editability }: { editability: EstimationAssumption['editability'] }) {
  const tone =
    editability === 'fixed'
      ? 'bg-mist/15 text-mist'
      : editability === 'master_data'
        ? 'bg-gold/15 text-gold'
        : 'bg-slate text-navy';
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-md whitespace-nowrap ${tone}`}>
      {ASSUMPTION_EDIT_LABELS[editability]}
    </span>
  );
}

/**
 * Read-only catalog of engine assumptions for admins / owners.
 * Values that are job-specific stay on the estimate; this page explains the rules.
 */
export function EstimationAssumptionsPanel() {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-navy">Estimation assumptions</h2>
        <p className="text-xs text-mist mt-1 max-w-3xl">
          Rules the costing engine uses that are easy to forget. Hover tips on the estimate show
          the live numbers; this page is the reference for formulas and defaults.
        </p>
      </div>
      <div className="divide-y divide-border">
        {CATEGORY_ORDER.map((cat) => {
          const rows = byCategory(cat);
          if (rows.length === 0) return null;
          return (
            <section key={cat} className="px-4 py-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-mist mb-3">
                {ASSUMPTION_CATEGORY_LABELS[cat]}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-mist border-b border-border">
                      <th className="py-2 pr-3 font-medium w-[12rem]">Item</th>
                      <th className="py-2 pr-3 font-medium">Formula / rule</th>
                      <th className="py-2 pr-3 font-medium w-[11rem]">Default</th>
                      <th className="py-2 font-medium w-[10rem]">Where to change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 align-top">
                        <td className="py-2.5 pr-3 font-medium text-navy">{row.title}</td>
                        <td className="py-2.5 pr-3 text-ink">
                          <div className="font-mono text-[11px] leading-snug whitespace-pre-wrap">
                            {row.formula}
                          </div>
                          {row.notes && (
                            <div className="text-[11px] text-mist mt-1">{row.notes}</div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-navy whitespace-pre-wrap">
                          {row.defaultDisplay}
                        </td>
                        <td className="py-2.5">
                          <EditBadge editability={row.editability} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
