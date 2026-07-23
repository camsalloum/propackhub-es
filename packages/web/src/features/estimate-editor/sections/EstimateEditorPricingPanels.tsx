import { SectionTitle } from '../../../components/SectionTitle';
import { estimateStatusLabel, MES_OUTCOME_ENABLED } from '../../../lib/estimateStatus';
import {
  CostBreakdownCard,
  type CostBreakdownCardProps,
} from '../CostBreakdownCard';

export type SellingPriceRow = {
  text: string;
  title?: string;
};

export type EstimateEditorPricingPanelsProposal = {
  id: string;
  sentAt?: string | null;
  validUntil?: string | null;
};

export type EstimateEditorPricingPanelsProps = {
  activeSection: 'structure' | 'dimensions' | 'slabs';
  canCostBreakdown: boolean;
  sellingPricesByUnit: SellingPriceRow[];
  costBreakdown: CostBreakdownCardProps;
  estimateStatus?: string | null;
  proposals: EstimateEditorPricingPanelsProposal[];
  isPriceCheck: boolean;
  onMarkWon: () => void;
  onMarkLost: () => void;
  onDownloadStoredProposal: (proposalId: string) => void;
};

/** Pricing panels — Selling price + Cost breakdown (hidden on Price list), plus outcome / proposal history. */
export function EstimateEditorPricingPanels({
  activeSection,
  canCostBreakdown,
  sellingPricesByUnit,
  costBreakdown,
  estimateStatus,
  proposals,
  isPriceCheck,
  onMarkWon,
  onMarkLost,
  onDownloadStoredProposal,
}: EstimateEditorPricingPanelsProps) {
  if (!(activeSection !== 'slabs' || MES_OUTCOME_ENABLED || proposals.length > 0)) {
    return null;
  }

  return (
        <div className="mt-8 pt-8 border-t border-border">
          {activeSection !== 'slabs' && (
          <div
            className={`grid grid-cols-1 gap-6 items-stretch ${
              canCostBreakdown ? 'lg:grid-cols-2' : ''
            }`}
          >
            <div
              className="card border-accent/30 h-full min-w-0 flex flex-col"
              style={{
                background:
                  'linear-gradient(135deg, rgb(var(--color-accent-soft)) 0%, rgb(var(--color-surface-raised)) 70%)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <h3 className="font-display font-semibold text-brand shrink-0">Selling price</h3>
              <div className="mt-3 flex-1 min-h-0 flex flex-col justify-between items-start font-display font-bold text-lg text-accent-text tabular tracking-tight text-left leading-snug">
                {sellingPricesByUnit.map((row) => (
                  <p key={row.text} title={row.title}>
                    {row.text}
                  </p>
                ))}
              </div>
            </div>

            {canCostBreakdown && (
              <CostBreakdownCard {...costBreakdown} />
            )}

          </div>
          )}

          {(MES_OUTCOME_ENABLED || proposals.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {MES_OUTCOME_ENABLED && (
                <div className="card">
                  <SectionTitle
                    as="h4"
                    className="font-display font-semibold text-navy mb-3"
                    hint="Track if the customer accepted or declined — only if you use this for reporting."
                  >
                    Outcome
                  </SectionTitle>
                  <div className="flex space-x-2">
                    <button type="button" onClick={onMarkWon} className="btn-success flex-1">Mark Won</button>
                    <button type="button" onClick={onMarkLost} className="btn-danger flex-1">Mark Lost</button>
                  </div>
                  <div className="mt-3 text-sm text-mist">
                    Current: <strong>{estimateStatusLabel(estimateStatus)}</strong>
                  </div>
                </div>
              )}

              {proposals.length > 0 && !isPriceCheck && (
                <div className="card">
                  <h4 className="font-display font-semibold text-navy mb-3">Proposal history</h4>
                  <div className="space-y-2">
                    {proposals.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2 last:border-0">
                        <div>
                          <div>{p.sentAt ? new Date(p.sentAt).toLocaleString() : 'Sent'}</div>
                          {p.validUntil && (
                            <div className="text-xs text-mist">Valid until {new Date(p.validUntil).toLocaleDateString()}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-gold font-medium hover:underline shrink-0"
                          onClick={() => onDownloadStoredProposal(p.id)}
                        >
                          PDF
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
  );
}
