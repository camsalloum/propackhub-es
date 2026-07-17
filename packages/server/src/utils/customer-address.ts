/** Format customer postal address for quotation PDF / display. */
export function formatCustomerAddress(customer: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}): string | null {
  const line1 = customer.addressLine1?.trim() || '';
  const line2 = customer.addressLine2?.trim() || '';
  const cityState = [customer.city?.trim(), customer.state?.trim()].filter(Boolean).join(', ');
  const postal = customer.postalCode?.trim() || '';
  const cityLine = [cityState, postal].filter(Boolean).join(' ');
  const country = customer.country?.trim() || '';
  const parts = [line1, line2, cityLine, country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export type CustomerCommercialDefaults = {
  paymentTerms: string | null;
  deliveryTerm: string | null;
};

/** Prefill quote commercial fields from synced / master customer. */
export function commercialDefaultsFromCustomer(customer: {
  paymentTerms?: string | null;
} | null | undefined): CustomerCommercialDefaults {
  return {
    paymentTerms: customer?.paymentTerms?.trim() || null,
    deliveryTerm: 'EXW',
  };
}
