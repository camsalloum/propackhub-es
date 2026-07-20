/** Tenant quotation PDF field visibility — shared defaults. */

export const QUOTATION_FORMAT_VERSION = 1;

export type QuotationFieldKey =
  | 'date'
  | 'customerName'
  | 'attn'
  | 'address'
  | 'tel'
  | 'email'
  | 'quoteRef'
  | 'currency'
  | 'validity'
  | 'deliveryTerm'
  | 'paymentTerms'
  | 'rfqNumber'
  | 'quoteName'
  | 'remarks'
  | 'salesperson'
  | 'termsBlock';

export type QuotationFieldVisibility = 'show' | 'hide';

export type QuotationFormatPrefs = {
  v: typeof QUOTATION_FORMAT_VERSION;
  /** Table header fill — lighter industrial blue by default */
  tableHeaderColor?: string;
  fields: Record<QuotationFieldKey, QuotationFieldVisibility>;
};

export const QUOTATION_FIELD_META: Array<{
  key: QuotationFieldKey;
  label: string;
  group: 'customer' | 'commercial' | 'document';
}> = [
  { key: 'date', label: 'Date', group: 'document' },
  { key: 'quoteRef', label: 'Quote reference', group: 'document' },
  { key: 'rfqNumber', label: 'Customer RFQ / PO ref', group: 'document' },
  { key: 'quoteName', label: 'Quote / job title', group: 'document' },
  { key: 'currency', label: 'Currency', group: 'document' },
  { key: 'validity', label: 'Validity', group: 'document' },
  { key: 'customerName', label: 'Customer name (M/S)', group: 'customer' },
  { key: 'attn', label: 'Attention / contact', group: 'customer' },
  { key: 'address', label: 'Address', group: 'customer' },
  { key: 'tel', label: 'Telephone', group: 'customer' },
  { key: 'email', label: 'Email', group: 'customer' },
  { key: 'deliveryTerm', label: 'Delivery / shipment terms', group: 'commercial' },
  { key: 'paymentTerms', label: 'Payment terms', group: 'commercial' },
  { key: 'remarks', label: 'Remarks', group: 'commercial' },
  { key: 'salesperson', label: 'Salesperson', group: 'commercial' },
  // termsBlock kept on QuotationFieldKey for saved prefs; not offered in Settings (PDF omits T&C).
];

export const DEFAULT_QUOTATION_FORMAT: QuotationFormatPrefs = {
  v: QUOTATION_FORMAT_VERSION,
  tableHeaderColor: '#3D6B9F',
  fields: {
    date: 'show',
    customerName: 'show',
    attn: 'show',
    address: 'show',
    tel: 'show',
    email: 'show',
    quoteRef: 'show',
    currency: 'show',
    validity: 'show',
    deliveryTerm: 'show',
    paymentTerms: 'show',
    rfqNumber: 'hide',
    quoteName: 'show',
    remarks: 'show',
    salesperson: 'hide',
    termsBlock: 'hide',
  },
};

export function parseQuotationFormat(raw: unknown): QuotationFormatPrefs {
  if (raw == null || typeof raw !== 'object') {
    return structuredClone(DEFAULT_QUOTATION_FORMAT);
  }
  const r = raw as Partial<QuotationFormatPrefs>;
  const fields = { ...DEFAULT_QUOTATION_FORMAT.fields };
  if (r.fields && typeof r.fields === 'object') {
    for (const meta of QUOTATION_FIELD_META) {
      const v = (r.fields as Record<string, unknown>)[meta.key];
      if (v === 'show' || v === 'hide') fields[meta.key] = v;
    }
  }
  const color =
    typeof r.tableHeaderColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(r.tableHeaderColor)
      ? r.tableHeaderColor
      : DEFAULT_QUOTATION_FORMAT.tableHeaderColor;
  return {
    v: QUOTATION_FORMAT_VERSION,
    tableHeaderColor: color,
    fields,
  };
}

export function fieldVisible(
  prefs: QuotationFormatPrefs,
  key: QuotationFieldKey
): boolean {
  return prefs.fields[key] === 'show';
}
