export interface SummaryEstimate {
  id: string;
  quoteId?: string | null;
  refNumber: string;
  jobName?: string;
  skuLabel?: string | null;
  brand?: string | null;
  customerName?: string | null;
  status: 'draft' | 'sent' | 'won' | 'lost' | string;
  totalPrice: number;
  displayCurrency?: string;
  createdAt: string;
  daysLeft?: number;
  validUntil?: string | null;
}

export interface RecentPackage {
  quoteId: string | null;
  refNumber: string;
  name?: string | null;
  customerName?: string | null;
  status: string;
  createdAt: string;
  totalPrice: number;
  displayCurrency?: string;
  estimateCount: number;
  estimates: SummaryEstimate[];
}

export interface DashboardSummary {
  estimatesThisMonth: number;
  drafts: number;
  sent: number;
  won: number;
  recent: SummaryEstimate[];
  recentPackages?: RecentPackage[];
  expiringProposals: SummaryEstimate[];
}
