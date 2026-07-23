export type EstimateListRow = {
  id: string;
  quoteId?: string | null;
  quoteRefNumber?: string | null;
  quoteStatus?: string | null;
  quoteName?: string | null;
  refNumber: string;
  jobName?: string | null;
  skuLabel?: string | null;
  customerName?: string | null;
  status: string;
  salePricePerKg?: string | number | null;
  displayCurrency?: string;
  exchangeRateUsdToDisplay?: string | number | null;
  createdAt?: string;
  sortOrder?: number | null;
  sourceTemplateKey?: string | null;
  materialClass?: string | null;
  isPrinted?: boolean | null;
  structureType?: string | null;
};

export type EstimatePackageGroup = {
  key: string;
  quoteId: string | null;
  refNumber: string;
  customerName: string | null;
  status: string;
  estimateCount: number;
  estimates: EstimateListRow[];
};

export type EstimatesListViewMode = 'package' | 'flat';
