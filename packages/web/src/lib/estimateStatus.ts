/** UI labels for estimate.status — DB may still use draft/sent; users think in quotes + PDF. */

export type EstimateStatus = 'draft' | 'sent' | 'won' | 'lost';

/** User-facing label (never show raw "draft"). */
export function estimateStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'won':
      return 'Won';
    case 'lost':
      return 'Lost';
    case 'sent':
    case 'draft':
    default:
      return 'Quote';
  }
}

export function estimateStatusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'won':
      return 'badge-won';
    case 'lost':
      return 'badge-lost';
    default:
      return 'badge-quote';
  }
}

/** Filter dropdown options for Estimates list. */
export const ESTIMATE_STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Quotes' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
] as const;
