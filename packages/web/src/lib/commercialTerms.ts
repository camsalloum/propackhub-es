/** Shared commercial term options (quote + estimate UI). */

export const DELIVERY_TERM_OPTIONS = [
  'EXW',
  'FOB',
  'CIF',
  'CFR',
  'DAP',
  'DDP',
  'Other',
] as const;

export type DeliveryTermOption = (typeof DELIVERY_TERM_OPTIONS)[number];

/** Common PEBI / CRM payment terms (Interplast lookups). */
export const COMMON_PAYMENT_TERM_OPTIONS = [
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
  'Due on Receipt',
  'Prepaid',
] as const;

export function paymentTermSelectOptions(current?: string | null): string[] {
  const set = new Set<string>(COMMON_PAYMENT_TERM_OPTIONS);
  const trimmed = current?.trim();
  if (trimmed) set.add(trimmed);
  return Array.from(set);
}
