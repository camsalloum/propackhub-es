/**
 * Estimate status — UI vocabulary.
 *
 * DB enum (unchanged): `draft | sent | won | lost`.
 * ES today only distinguishes Draft (in progress) from Saved (committed). Won/Lost
 * are reserved for the MES integration and are hidden behind a feature flag so the
 * code stays put for MES wiring but does not ship to users yet.
 */

export type EstimateStatus = 'draft' | 'sent' | 'won' | 'lost';

/**
 * MES Outcome (Mark Won / Mark Lost) — flag-gated. When MES wires the
 * sales-outcome flow it can flip this on via env, and the editor + dashboard
 * tiles re-appear without code changes elsewhere.
 */
export const MES_OUTCOME_ENABLED: boolean =
  (import.meta.env?.VITE_ENABLE_MES_OUTCOME as string | undefined) === 'true';

/** True when the estimate is still a working draft. */
export function isDraftStatus(status: string | null | undefined): boolean {
  return status === 'draft' || status == null;
}

/** User-facing label. Won/Lost remain available for the MES integration. */
export function estimateStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'won':
      return MES_OUTCOME_ENABLED ? 'Won' : 'Saved';
    case 'lost':
      return MES_OUTCOME_ENABLED ? 'Lost' : 'Saved';
    case 'sent':
      return 'Saved';
    case 'draft':
    default:
      return 'Draft';
  }
}

export function estimateStatusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'won':
      return MES_OUTCOME_ENABLED ? 'badge-won' : 'badge-quote';
    case 'lost':
      return MES_OUTCOME_ENABLED ? 'badge-lost' : 'badge-quote';
    case 'sent':
      return 'badge-quote';
    case 'draft':
    default:
      return 'badge-draft';
  }
}

/**
 * Filter dropdown options for the Estimates list. Won/Lost only appear when the
 * MES outcome flag is on; until then the list is filtered Draft vs Saved.
 */
export const ESTIMATE_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'sent', label: 'Saved' },
  ...(MES_OUTCOME_ENABLED
    ? ([
        { value: 'won', label: 'Won' },
        { value: 'lost', label: 'Lost' },
      ] as const)
    : ([] as const)),
] as const;
