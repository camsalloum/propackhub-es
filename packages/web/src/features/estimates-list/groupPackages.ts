import type { EstimateListRow, EstimatePackageGroup } from './types';

function packageKey(est: EstimateListRow): string {
  return est.quoteId ? `q:${est.quoteId}` : `e:${est.id}`;
}

/** Group filtered estimate rows by parent quote (PKG). Orphan QT rows stay solo. */
export function groupEstimatesByPackage(estimates: EstimateListRow[]): EstimatePackageGroup[] {
  const grouped = new Map<string, EstimateListRow[]>();
  for (const est of estimates) {
    const key = packageKey(est);
    const list = grouped.get(key);
    if (list) list.push(est);
    else grouped.set(key, [est]);
  }

  const packages: EstimatePackageGroup[] = [];
  for (const [key, rows] of grouped) {
    const ordered = [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const first = ordered[0];
    packages.push({
      key,
      quoteId: first?.quoteId ?? null,
      refNumber: first?.quoteRefNumber || first?.refNumber || '—',
      customerName: first?.customerName ?? null,
      status: first?.quoteStatus || first?.status || 'draft',
      estimateCount: ordered.length,
      estimates: ordered,
    });
  }

  packages.sort((a, b) => {
    const ta = a.estimates[0]?.createdAt ? new Date(a.estimates[0].createdAt).getTime() : 0;
    const tb = b.estimates[0]?.createdAt ? new Date(b.estimates[0].createdAt).getTime() : 0;
    return tb - ta;
  });

  return packages;
}
