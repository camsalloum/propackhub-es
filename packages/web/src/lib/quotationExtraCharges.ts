/** Extra quotation lines for Dev (separate) and Freight lumps. */

export type QuotationExtraCharge = {
  kind: 'development' | 'freight';
  skuLabel: string;
  /** Main line title */
  description: string;
  /** Secondary detail under the title */
  detail: string | null;
  amount: number;
  currency: string;
};

function isExw(term: string | null | undefined): boolean {
  return String(term ?? '').trim().toUpperCase() === 'EXW';
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Build customer-facing extra charge lines from estimate rows.
 * Development: only when toolingBillingMode === 'separate' and total > 0.
 * Freight: when not EXW and deliveryChargeUsd > 0 (always USD).
 */
export function collectQuotationExtraCharges(
  estimates: Array<{
    skuLabel?: string | null;
    jobName?: string | null;
    refNumber?: string | null;
    toolingBillingMode?: string | null;
    printColorCount?: number | null;
    billableColorCount?: number | null;
    toolingScenario?: string | null;
    costPerColor?: string | number | null;
    developmentTotal?: string | number | null;
    deliveryTerm?: string | null;
    deliveryChargeUsd?: string | number | null;
    displayCurrency?: string | null;
  }>,
  opts?: {
    quoteDeliveryTerm?: string | null;
    resolveBillableColors?: (e: {
      toolingScenario?: string | null;
      printColorCount?: number | null;
      billableColorCount?: number | null;
    }) => number | null;
  }
): QuotationExtraCharge[] {
  const out: QuotationExtraCharge[] = [];
  const quoteTerm = opts?.quoteDeliveryTerm ?? null;

  for (const est of estimates) {
    const sku =
      est.skuLabel?.trim() || est.jobName?.trim() || est.refNumber?.trim() || 'SKU';
    const currency = (est.displayCurrency || 'USD').trim() || 'USD';
    const mode = String(est.toolingBillingMode || 'separate').toLowerCase();

    if (mode === 'separate') {
      let total = num(est.developmentTotal);
      const costPer = num(est.costPerColor);
      let colors =
        opts?.resolveBillableColors?.({
          toolingScenario: est.toolingScenario,
          printColorCount: est.printColorCount,
          billableColorCount: est.billableColorCount,
        }) ?? num(est.printColorCount);

      if ((total == null || total <= 0) && colors != null && costPer != null) {
        total = colors * costPer;
      }
      if (total != null && total > 0) {
        const detail =
          colors != null && costPer != null
            ? `${colors} color${colors === 1 ? '' : 's'} × ${currency} ${costPer.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : null;
        out.push({
          kind: 'development',
          skuLabel: sku,
          description: `Printing plates / cylinders — ${sku}`,
          detail,
          amount: total,
          currency,
        });
      }
    }

    const freight = num(est.deliveryChargeUsd);
    const term = est.deliveryTerm?.trim() || quoteTerm?.trim() || null;
    if (freight != null && freight > 0 && !isExw(term)) {
      out.push({
        kind: 'freight',
        skuLabel: sku,
        description: `Freight${term ? ` (${term})` : ''} — ${sku}`,
        detail: 'Invoiced separately — not included in film prices above',
        amount: freight,
        currency: 'USD',
      });
    }
  }

  return out;
}

export function formatExtraChargeAmount(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const rounded = Math.round(n * 100) / 100;
  return `${currency} ${rounded.toLocaleString(undefined, {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
