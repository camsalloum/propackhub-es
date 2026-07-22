import { Fragment, useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronRight } from 'lucide-react';
import { SectionTitle } from '../../components/SectionTitle';
import { Link } from 'react-router-dom';
import {
  estimateStatusBadgeClass,
  estimateStatusLabel,
} from '../../lib/estimateStatus';
import type { RecentPackage, SummaryEstimate } from './types';

function formatMoney(currency: string | undefined, amount: number) {
  return `${currency || 'USD'} ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function packageStatusLabel(status: string): string {
  switch (status) {
    case 'sent':
      return 'Sent';
    case 'saved':
      return 'Saved';
    case 'archived':
      return 'Archived';
    case 'won':
    case 'lost':
      return estimateStatusLabel(status);
    case 'draft':
    default:
      return status === 'draft' ? 'Draft' : estimateStatusLabel(status);
  }
}

function packageStatusBadgeClass(status: string): string {
  if (status === 'saved' || status === 'sent') return 'badge-quote';
  if (status === 'archived') return 'badge-lost';
  if (status === 'draft') return 'badge-draft';
  return estimateStatusBadgeClass(status);
}

function estimateDisplayName(est: SummaryEstimate): string {
  return est.skuLabel?.trim() || est.jobName?.trim() || est.refNumber || 'Estimate';
}

function openPath(pkg: RecentPackage, est?: SummaryEstimate): string {
  if (pkg.quoteId) {
    if (est) return `/quotes/${pkg.quoteId}/estimates/${est.id}`;
    const first = pkg.estimates[0];
    return first ? `/quotes/${pkg.quoteId}/estimates/${first.id}` : `/quotes/${pkg.quoteId}`;
  }
  if (est) return `/estimate/${est.id}`;
  const first = pkg.estimates[0];
  return first ? `/estimate/${first.id}` : '/estimates';
}

export function RecentPackagesTable({
  packages,
  navigate,
}: {
  packages: RecentPackage[];
  navigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (packages.length === 0) return null;

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-6 pb-4">
        <SectionTitle as="h2" className="section-title" hint="Latest packages across your workspace">
          Recent quotes
        </SectionTitle>
        <Link
          to="/estimates"
          className="text-sm text-accent-text font-medium hover:underline inline-flex items-center gap-1"
        >
          View all
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="table-wrap">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Ref #</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Date</th>
              <th className="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => {
              const key = pkg.quoteId ?? pkg.estimates[0]?.id ?? pkg.refNumber;
              const multi = pkg.estimateCount > 1;
              const isOpen = expanded[key] === true;

              return (
                <Fragment key={key}>
                  <tr>
                    <td>
                      <div className="flex items-center gap-1.5 min-w-0">
                        {multi ? (
                          <button
                            type="button"
                            className="p-0.5 text-text-secondary hover:text-text-primary shrink-0"
                            aria-expanded={isOpen}
                            onClick={() =>
                              setExpanded((e) => ({ ...e, [key]: !isOpen }))
                            }
                          >
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        ) : null}
                        <div className="min-w-0">
                          <span className="font-mono text-sm font-medium">{pkg.refNumber}</span>
                          {multi ? (
                            <span className="text-text-secondary text-xs ml-2">
                              {pkg.estimateCount} estimates
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="font-medium">{pkg.customerName || 'Unknown Customer'}</td>
                    <td>
                      <span className={`badge ${packageStatusBadgeClass(pkg.status)}`}>
                        {packageStatusLabel(pkg.status)}
                      </span>
                    </td>
                    <td className="text-text-secondary">
                      {new Date(pkg.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-right font-display font-semibold tabular">
                      {formatMoney(pkg.displayCurrency, pkg.totalPrice)}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => navigate(openPath(pkg))}
                        className="text-sm text-accent-text font-medium hover:underline inline-flex items-center gap-1"
                      >
                        Open
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {multi && isOpen
                    ? pkg.estimates.map((est) => (
                        <tr key={est.id} className="bg-surface-raised/40">
                          <td className="pl-10">
                            <span className="font-medium text-sm">{estimateDisplayName(est)}</span>
                            <span className="text-text-secondary text-xs ml-2 font-mono">
                              {est.refNumber}
                            </span>
                          </td>
                          <td className="text-text-secondary text-sm">—</td>
                          <td>
                            <span className={`badge ${estimateStatusBadgeClass(est.status)}`}>
                              {estimateStatusLabel(est.status)}
                            </span>
                          </td>
                          <td className="text-text-secondary text-sm">
                            {new Date(est.createdAt).toLocaleDateString()}
                          </td>
                          <td className="text-right text-sm tabular">
                            {formatMoney(est.displayCurrency, est.totalPrice)}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => navigate(openPath(pkg, est))}
                              className="text-sm text-accent-text font-medium hover:underline inline-flex items-center gap-1"
                            >
                              Open
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
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
  );
}
