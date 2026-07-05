import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';

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
  const [deliveryTerm, setDeliveryTerm] = useState(initialDelivery ?? '');
  const [paymentTerms, setPaymentTerms] = useState(initialPayment ?? '');
  const [remarks, setRemarks] = useState(initialRemarks ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRfqNumber(initialRfq ?? '');
    setDeliveryTerm(initialDelivery ?? '');
    setPaymentTerms(initialPayment ?? '');
    setRemarks(initialRemarks ?? '');
  }, [initialRfq, initialDelivery, initialPayment, initialRemarks]);

  const save = useCallback(async () => {
    if (locked || saving) return;
    setSaving(true);
    try {
      await apiClient.updateQuote(quoteId, {
        rfqNumber: rfqNumber.trim() || null,
        deliveryTerm: deliveryTerm.trim() || null,
        paymentTerms: paymentTerms.trim() || null,
        remarks: remarks.trim() || null,
      });
      onUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save quote terms');
    } finally {
      setSaving(false);
    }
  }, [locked, saving, quoteId, rfqNumber, deliveryTerm, paymentTerms, remarks, onUpdated]);

  const validLabel = validUntil
    ? new Date(validUntil).toLocaleDateString()
    : null;

  return (
    <div className="card py-3 px-4 sm:px-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-mist min-w-[8rem]">
          RFQ number
          <input
            type="text"
            className="input input-compact text-sm w-full min-w-[8rem]"
            value={rfqNumber}
            disabled={locked}
            placeholder="Optional"
            onChange={(e) => setRfqNumber(e.target.value)}
            onBlur={() => void save()}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist min-w-[5rem]">
          Incoterm
          <input
            type="text"
            className="input input-compact text-sm w-24"
            value={deliveryTerm}
            disabled={locked}
            onChange={(e) => setDeliveryTerm(e.target.value)}
            onBlur={() => void save()}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mist flex-1 min-w-[8rem]">
          Payment terms
          <input
            type="text"
            className="input input-compact text-sm w-full"
            value={paymentTerms}
            disabled={locked}
            onChange={(e) => setPaymentTerms(e.target.value)}
            onBlur={() => void save()}
          />
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
