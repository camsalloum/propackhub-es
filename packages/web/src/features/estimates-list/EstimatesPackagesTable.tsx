import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import {
  estimateStatusBadgeClass,
  estimateStatusLabel,
} from '../../lib/estimateStatus';
import { formatSalePricePerKgDisplay } from '../../lib/currency';
import type { EstimateListRow, EstimatePackageGroup } from './types';

function estimateOpenPath(e: { id: string; quoteId?: string | null }): string {
  return e.quoteId ? `/quotes/${e.quoteId}/estimates/${e.id}` : `/estimate/${e.id}`;
}

function packageOpenPath(pkg: EstimatePackageGroup): string {
  if (pkg.quoteId) {
    const first = pkg.estimates[0];
    return first ? `/quotes/${pkg.quoteId}/estimates/${first.id}` : `/quotes/${pkg.quoteId}`;
  }
  const first = pkg.estimates[0];
  return first ? estimateOpenPath(first) : '/estimates';
}

function estimateDisplayName(e: EstimateListRow): string {
  return e.skuLabel?.trim() || e.jobName?.trim() || e.refNumber || 'Estimate';
}

function packageStatusLabel(status: string): string {
  if (status === 'saved') return 'Saved';
  if (status === 'archived') return 'Archived';
  if (status === 'draft') return 'Draft';
  if (status === 'sent') return 'Sent';
  return estimateStatusLabel(status);
}

function packageStatusBadgeClass(status: string): string {
  if (status === 'saved' || status === 'sent') return 'badge-quote';
  if (status === 'archived') return 'badge-lost';
  if (status === 'draft') return 'badge-draft';
  return estimateStatusBadgeClass(status);
}

type Props = {
  packages: EstimatePackageGroup[];
  requotingId: string | null;
  onOpen: (path: string) => void;
  onRequote: (estimateId: string) => void;
  onDelete: (est: EstimateListRow, anchor: DOMRect) => void;
};

export function EstimatesPackagesTable({
  packages,
  requotingId,
  onOpen,
  onRequote,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <>
      <div className="space-y-3 md:hidden">
        {packages.map((pkg) => {
          const multi = pkg.estimateCount > 1;
          const isOpen = expanded[pkg.key] === true;
          return (
            <div key={pkg.key} data-interactive="true" className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-mist">
                    {pkg.refNumber}
                    {multi ? (
                      <span className="text-mist ml-2">{pkg.estimateCount} estimates</span>
                    ) : null}
                  </p>
                  <p className="font-medium truncate">
                    {multi
                      ? pkg.customerName || 'No customer'
                      : estimateDisplayName(pkg.estimates[0]!)}
                  </p>
                  {!multi ? (
                    <p className="text-sm text-mist truncate">
                      {pkg.customerName || 'No customer'}
                    </p>
                  ) : null}
                </div>
                <span className={`badge shrink-0 ${packageStatusBadgeClass(pkg.status)}`}>
                  {packageStatusLabel(pkg.status)}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                {multi ? (
                  <button
                    type="button"
                    className="btn-secondary flex-1 text-sm py-2 inline-flex items-center justify-center gap-1"
                    onClick={() => setExpanded((e) => ({ ...e, [pkg.key]: !isOpen }))}
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {isOpen ? 'Hide' : 'SKUs'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-secondary flex-1 text-center text-sm py-2"
                  onClick={() => onOpen(packageOpenPath(pkg))}
                >
                  Open
                </button>
              </div>
              {multi && isOpen
                ? pkg.estimates.map((e) => (
                    <div key={e.id} className="mt-3 pt-3 border-t border-border">
                      <p className="font-medium text-sm">{estimateDisplayName(e)}</p>
                      <p className="font-mono text-xs text-mist">{e.refNumber}</p>
                      <div className="flex gap-2 mt-2">
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
                          className="btn-secondary text-sm py-2 px-3 text-danger"
                          aria-label={`Delete estimate ${e.refNumber}`}
                          onClick={(ev) =>
                            onDelete(e, ev.currentTarget.getBoundingClientRect())
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                : null}
              {!multi && pkg.estimates[0] ? (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    className="btn-primary flex-1 text-sm py-2 inline-flex items-center justify-center gap-1"
                    disabled={requotingId === pkg.estimates[0].id}
                    onClick={() => onRequote(pkg.estimates[0]!.id)}
                  >
                    {requotingId === pkg.estimates[0].id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Re-quote
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm py-2 px-3 text-danger"
                    aria-label={`Delete estimate ${pkg.estimates[0].refNumber}`}
                    onClick={(ev) =>
                      onDelete(pkg.estimates[0]!, ev.currentTarget.getBoundingClientRect())
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="card hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Ref #</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Job / SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-mist">Price/kg</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-mist">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => {
                const multi = pkg.estimateCount > 1;
                const isOpen = expanded[pkg.key] === true;
                const single = !multi ? pkg.estimates[0] : null;

                return (
                  <Fragment key={pkg.key}>
                    <tr className="border-b border-border last:border-0 hover:bg-slate/50 transition-colors duration-micro ease-micro">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {multi ? (
                            <button
                              type="button"
                              className="p-0.5 text-text-secondary hover:text-text-primary shrink-0"
                              aria-expanded={isOpen}
                              onClick={() =>
                                setExpanded((e) => ({ ...e, [pkg.key]: !isOpen }))
                              }
                            >
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          ) : null}
                          <span className="font-mono text-sm">{pkg.refNumber}</span>
                          {multi ? (
                            <span className="text-mist text-xs ml-1">
                              {pkg.estimateCount} estimates
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {multi ? '—' : estimateDisplayName(single!)}
                      </td>
                      <td className="py-4 px-4">{pkg.customerName || '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`badge ${packageStatusBadgeClass(pkg.status)}`}>
                          {packageStatusLabel(pkg.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {single
                          ? formatSalePricePerKgDisplay(
                              single.salePricePerKg,
                              single.displayCurrency,
                              single.exchangeRateUsdToDisplay
                            )
                          : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="text-gold font-medium text-sm"
                            onClick={() => onOpen(packageOpenPath(pkg))}
                          >
                            Open
                          </button>
                          {single ? (
                            <>
                              <button
                                type="button"
                                className="text-sm text-navy hover:text-gold inline-flex items-center gap-1"
                                disabled={requotingId === single.id}
                                onClick={() => onRequote(single.id)}
                              >
                                {requotingId === single.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                Re-quote
                              </button>
                              <button
                                type="button"
                                className="text-sm text-mist hover:text-danger inline-flex items-center gap-1"
                                aria-label={`Delete estimate ${single.refNumber}`}
                                onClick={(ev) =>
                                  onDelete(single, ev.currentTarget.getBoundingClientRect())
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {multi && isOpen
                      ? pkg.estimates.map((e) => (
                          <tr
                            key={e.id}
                            className="border-b border-border last:border-0 bg-surface-raised/40"
                          >
                            <td className="py-3 px-4 pl-10 font-mono text-sm text-mist">
                              {e.refNumber}
                            </td>
                            <td className="py-3 px-4">{estimateDisplayName(e)}</td>
                            <td className="py-3 px-4 text-mist">—</td>
                            <td className="py-3 px-4">
                              <span className={`badge ${estimateStatusBadgeClass(e.status)}`}>
                                {estimateStatusLabel(e.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {formatSalePricePerKgDisplay(
                                e.salePricePerKg,
                                e.displayCurrency,
                                e.exchangeRateUsdToDisplay
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
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
                                  onClick={(ev) =>
                                    onDelete(e, ev.currentTarget.getBoundingClientRect())
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
