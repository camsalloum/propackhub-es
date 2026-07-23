import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import {
  estimateStatusBadgeClass,
  estimateStatusLabel,
} from '../../lib/estimateStatus';
import { formatSalePricePerKgDisplay } from '../../lib/currency';
import type { EstimateListRow } from './types';

function estimateOpenPath(e: { id: string; quoteId?: string | null }): string {
  return e.quoteId ? `/quotes/${e.quoteId}/estimates/${e.id}` : `/estimate/${e.id}`;
}

type Props = {
  estimates: EstimateListRow[];
  requotingId: string | null;
  onOpen: (path: string) => void;
  onRequote: (estimateId: string) => void;
  onDelete: (est: EstimateListRow, anchor: DOMRect) => void;
};

export function EstimatesFlatList({
  estimates,
  requotingId,
  onOpen,
  onRequote,
  onDelete,
}: Props) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {estimates.map((e) => (
          <div key={e.id} data-interactive="true" className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-xs text-mist">{e.refNumber}</p>
                <p className="font-medium truncate">{e.jobName || 'Untitled'}</p>
                <p className="text-sm text-mist truncate">{e.customerName || 'No customer'}</p>
              </div>
              <span className={`badge shrink-0 ${estimateStatusBadgeClass(e.status)}`}>
                {estimateStatusLabel(e.status)}
              </span>
            </div>
            <p className="mt-2 text-gold font-display font-semibold">
              {formatSalePricePerKgDisplay(
                e.salePricePerKg,
                e.displayCurrency,
                e.exchangeRateUsdToDisplay
              )}
            </p>
            <div className="flex gap-2 mt-3">
              <Link
                to={estimateOpenPath(e)}
                onClick={(ev) => {
                  ev.preventDefault();
                  onOpen(estimateOpenPath(e));
                }}
                className="btn-secondary flex-1 text-center text-sm py-2"
              >
                Open
              </Link>
              <button
                type="button"
                className="btn-primary flex-1 text-sm py-2 inline-flex items-center justify-center gap-1"
                disabled={requotingId === e.id}
                onClick={() => onRequote(e.id)}
              >
                {requotingId === e.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Re-quote
              </button>
              <button
                type="button"
                className="btn-secondary text-sm py-2 px-3 inline-flex items-center justify-center text-danger"
                aria-label={`Delete estimate ${e.refNumber}`}
                onClick={(ev) => onDelete(e, ev.currentTarget.getBoundingClientRect())}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Ref #</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Job</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Price/kg</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-mist">Actions</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-border last:border-0 hover:bg-slate/50 transition-colors duration-micro ease-micro"
                >
                  <td className="py-4 px-4 font-mono text-sm">{e.refNumber}</td>
                  <td className="py-4 px-4">{e.jobName || '—'}</td>
                  <td className="py-4 px-4">{e.customerName || '—'}</td>
                  <td className="py-4 px-4">
                    <span className={`badge ${estimateStatusBadgeClass(e.status)}`}>
                      {estimateStatusLabel(e.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {formatSalePricePerKgDisplay(
                      e.salePricePerKg,
                      e.displayCurrency,
                      e.exchangeRateUsdToDisplay
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={estimateOpenPath(e)}
                        onClick={(ev) => {
                          ev.preventDefault();
                          onOpen(estimateOpenPath(e));
                        }}
                        className="text-gold font-medium text-sm"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        className="text-sm text-navy hover:text-gold inline-flex items-center gap-1"
                        disabled={requotingId === e.id}
                        onClick={() => onRequote(e.id)}
                      >
                        {requotingId === e.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Re-quote
                      </button>
                      <button
                        type="button"
                        className="text-sm text-mist hover:text-danger inline-flex items-center gap-1"
                        aria-label={`Delete estimate ${e.refNumber}`}
                        onClick={(ev) => onDelete(e, ev.currentTarget.getBoundingClientRect())}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
