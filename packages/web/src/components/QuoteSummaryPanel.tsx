import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import {
  DELIVERY_TERM_OPTIONS,
  paymentTermSelectOptions,
} from '../lib/commercialTerms';

type Props = {
  quoteId: string;
  locked?: boolean;
  rfqNumber?: string | null;
  deliveryTerm?: string | null;
  paymentTerms?: string | null;
  remarks?: string | null;
  validUntil?: string | null;
  onUpdated?: () => void;
};

function deliveryTermSelectOptions(current?: string | null): string[] {
  const set = new Set<string>(DELIVERY_TERM_OPTIONS);
  const trimmed = current?.trim();
  if (trimmed) set.add(trimmed);
  return Array.from(set);
}

export default function QuoteSummaryPanel({
  quoteId,
  locked = false,
  rfqNumber: initialRfq,
  deliveryTerm: initialDelivery,
  paymentTerms: initialPayment,
  remarks: initialRemarks,
  validUntil,
  onUpdated,
}: Props) {
  const [rfqNumber, setRfqNumber] = useState(initialRfq ?? '');
  const [deliveryTerm, setDeliveryTerm] = useState(initialDelivery ?? 'EXW');
  const [paymentTerms, setPaymentTerms] = useState(initialPayment ?? '');
  const [remarks, setRemarks] = useState(initialRemarks ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRfqNumber(initialRfq ?? '');
    setDeliveryTerm(initialDelivery ?? 'EXW');
    setPaymentTerms(initialPayment ?? '');
    setRemarks(initialRemarks ?? '');
  }, [initialRfq, initialDelivery, initialPayment, initialRemarks]);

  const save = useCallback(
    async (patch?: {
      rfqNumber?: string;
      deliveryTerm?: string;
      paymentTerms?: string;
      remarks?: string;
    }) => {
      if (locked || saving) return;
      setSaving(true);
      const nextRfq = patch?.rfqNumber ?? rfqNumber;
      const nextDelivery = patch?.deliveryTerm ?? deliveryTerm;
      const nextPayment = patch?.paymentTerms ?? paymentTerms;
      const nextRemarks = patch?.remarks ?? remarks;
      try {
        await apiClient.updateQuote(quoteId, {
          rfqNumber: nextRfq.trim() || null,
          deliveryTerm: nextDelivery.trim() || null,
          paymentTerms: nextPayment.trim() || null,
          remarks: nextRemarks.trim() || null,
        });
        onUpdated?.();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save quote terms');
      } finally {
        setSaving(false);
      }
    },
    [locked, saving, quoteId, rfqNumber, deliveryTerm, paymentTerms, remarks, onUpdated]
  );

  const validLabel = validUntil
    ? new Date(validUntil).toLocaleDateString()
    : null;

  const showRfq = Boolean(rfqNumber.trim());
  const deliveryOptions = deliveryTermSelectOptions(deliveryTerm);
  const paymentOptions = paymentTermSelectOptions(paymentTerms);

  return (
    <div className="card py-3 px-4 sm:px-5">
      <div className="flex flex-wrap items-end gap-3">
        {showRfq && (
          <label className="flex flex-col gap-1 text-xs text-mist min-w-[8rem]">
            RFQ number
            <input
              type="text"
              className="input input-compact text-sm w-full min-w-[8rem]"
              value={rfqNumber}
              disabled={locked}
              onChange={(e) => setRfqNumber(e.target.value)}
              onBlur={() => void save()}
            />
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-mist min-w-[5rem]">
          Incoterm
          <select
            className="input input-compact text-sm w-24"
            value={deliveryTerm || 'EXW'}
            disabled={locked}
            onChange={(e) => {
              const next = e.target.value;
              setDeliveryTerm(next);
              void save({ deliveryTerm: next });
            }}
          >
            {deliveryOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist flex-1 min-w-[8rem]">
          Payment terms
          <select
            className="input input-compact text-sm w-full"
            value={paymentTerms}
            disabled={locked}
            onChange={(e) => {
              const next = e.target.value;
              setPaymentTerms(next);
              void save({ paymentTerms: next });
            }}
          >
            <option value="">—</option>
            {paymentOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {validLabel && (
          <p className="text-xs text-mist pb-1.5 shrink-0">Valid until {validLabel}</p>
        )}
        {saving && <Loader2 className="w-4 h-4 animate-spin text-mist mb-1.5" />}
      </div>
      <label className="flex flex-col gap-1 text-xs text-mist mt-2">
        Remarks
        <textarea
          className="input text-sm w-full min-h-[2.5rem] resize-y"
          rows={2}
          value={remarks}
          disabled={locked}
          onChange={(e) => setRemarks(e.target.value)}
          onBlur={() => void save()}
        />
      </label>
    </div>
  );
}
