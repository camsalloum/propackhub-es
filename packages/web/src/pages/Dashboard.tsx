// Feature: es-ui-revamp — Dashboard (PREMIUM v2).
// Display-tier typography, NumberTicker, sparklines, staggered entrance.

import { Link } from 'react-router-dom';
import { PlusCircle, FileText, Users, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/api';
import { SkeletonDashboard } from '../components/Skeleton';
import { useEntrance } from '../hooks/useEntrance';
import { useStagger } from '../hooks/useStagger';
import { useViewTransition } from '../hooks/useViewTransition';
import NumberTicker from '../components/NumberTicker';
import Sparkline, { type SparklineTone } from '../components/Sparkline';
import EmptyState from '../components/EmptyState';
import { SectionTitle } from '../components/SectionTitle';
import { MES_OUTCOME_ENABLED } from '../lib/estimateStatus';
import { RecentPackagesTable } from '../features/dashboard/RecentPackagesTable';
import type { DashboardSummary, RecentPackage, SummaryEstimate } from '../features/dashboard/types';

interface StatDef {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: SparklineTone;
  series: (e: SummaryEstimate) => boolean;
  getValue: (s: DashboardSummary) => number;
}

const STAT_DEFS: StatDef[] = [
  {
    key: 'thisMonth',
    label: 'This month',
    icon: FileText,
    tone: 'accent',
    series: () => true,
    getValue: (s) => s.estimatesThisMonth,
  },
  {
    key: 'drafts',
    label: 'Drafts',
    icon: FileText,
    tone: 'warning',
    series: (e) => e.status === 'draft',
    getValue: (s) => s.drafts,
  },
  {
    key: 'sent',
    label: 'Saved',
    icon: TrendingUp,
    tone: 'info',
    series: (e) => e.status === 'sent' || e.status === 'won' || e.status === 'lost',
    getValue: (s) => s.sent + s.won,
  },
  ...(MES_OUTCOME_ENABLED
    ? ([
        {
          key: 'won',
          label: 'Won',
          icon: Users,
          tone: 'success' as SparklineTone,
          series: (e: SummaryEstimate) => e.status === 'won',
          getValue: (s: DashboardSummary) => s.won,
        },
      ] satisfies StatDef[])
    : []),
];

type ResolvedStat = { ok: true; value: number; series: number[] } | { ok: false };

function weeklyBuckets(recent: SummaryEstimate[], predicate: (e: SummaryEstimate) => boolean): number[] {
  const buckets = 8;
  const counts = new Array<number>(buckets).fill(0);
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  for (const e of recent) {
    if (!predicate(e)) continue;
    const t = Date.parse(e.createdAt);
    if (!Number.isFinite(t)) continue;
    const idx = buckets - 1 - Math.floor((now - t) / weekMs);
    if (idx >= 0 && idx < buckets) counts[idx] += 1;
  }
  return counts;
}

function resolveStat(def: StatDef, summary: DashboardSummary | null): ResolvedStat {
  if (!summary) return { ok: false };
  try {
    const raw = def.getValue(summary);
    if (raw == null || typeof raw !== 'number' || !Number.isFinite(raw)) return { ok: false };
    const series = weeklyBuckets(summary.recent ?? [], def.series);
    return { ok: true, value: raw, series };
  } catch {
    return { ok: false };
  }
}

/** Fallback when API has not yet returned recentPackages (older server). */
function packagesFromFlatRecent(recent: SummaryEstimate[]): RecentPackage[] {
  const map = new Map<string, SummaryEstimate[]>();
  for (const est of recent) {
    const key = est.quoteId ? `q:${est.quoteId}` : `e:${est.id}`;
    const list = map.get(key);
    if (list) list.push(est);
    else map.set(key, [est]);
  }
  return [...map.entries()].map(([, estimates]) => {
    const first = estimates[0]!;
    return {
      quoteId: first.quoteId ?? null,
      refNumber: first.refNumber,
      customerName: first.customerName,
      status: first.status,
      createdAt: first.createdAt,
      totalPrice: estimates.reduce((s, e) => s + (e.totalPrice || 0), 0),
      displayCurrency: first.displayCurrency,
      estimateCount: estimates.length,
      estimates,
    };
  });
}

const StatCard = ({
  def,
  summary,
  delay,
}: {
  def: StatDef;
  summary: DashboardSummary | null;
  delay: number;
}) => {
  const { ref } = useEntrance<HTMLDivElement>({ delay, distance: 16 });
  const Icon = def.icon;
  const resolved = resolveStat(def, summary);

  if (!resolved.ok) {
    return (
      <div ref={ref} className="stat-card" role="group" aria-label={`${def.label}: unavailable`}>
        <p className="stat-label">{def.label}</p>
        <p className="mt-3 text-base font-medium text-danger inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Unavailable
        </p>
      </div>
    );
  }

  const trend = (() => {
    const s = resolved.series;
    if (s.length < 4) return null;
    const recent = s.slice(-2).reduce((a, b) => a + b, 0);
    const prior = s.slice(-4, -2).reduce((a, b) => a + b, 0);
    if (prior === 0 && recent === 0) return null;
    if (prior === 0) return { dir: 'up' as const, pct: 100 };
    const pct = Math.round(((recent - prior) / prior) * 100);
    if (pct === 0) return { dir: 'flat' as const, pct: 0 };
    return { dir: pct > 0 ? 'up' as const : 'down' as const, pct: Math.abs(pct) };
  })();

  return (
    <div
      ref={ref}
      className="stat-card"
      data-interactive="true"
      tabIndex={0}
      role="group"
      aria-label={`${def.label}: ${resolved.value}`}
    >
      <div className="stat-icon" aria-hidden="true">
        <Icon className="w-5 h-5" />
      </div>
      <p className="stat-label">{def.label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <p className="stat-value">
          <NumberTicker value={resolved.value} durationMs={1600} />
        </p>
        {trend && (
          <span className={`delta delta-${trend.dir}`} title={`${trend.dir === 'up' ? '+' : trend.dir === 'down' ? '-' : ''}${trend.pct}% vs prior 2 weeks`}>
            {trend.dir === 'up' && '↑'}
            {trend.dir === 'down' && '↓'}
            {trend.dir === 'flat' && '—'}
            {trend.dir !== 'flat' && ` ${trend.pct}%`}
          </span>
        )}
      </div>
      <div className="-mx-1 -mb-1 mt-3">
        <Sparkline data={resolved.series} tone={def.tone} height={56} />
      </div>
    </div>
  );
};

const EntranceCard = ({
  delay,
  className,
  children,
}: {
  delay: number;
  className: string;
  children: React.ReactNode;
}) => {
  const { ref } = useEntrance<HTMLDivElement>({ delay, distance: 16 });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

const Dashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getDelay } = useStagger();
  const navigate = useViewTransition();

  useEffect(() => {
    void fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const sectionDelay = useMemo(() => getDelay(STAT_DEFS.length), [getDelay]);

  const recentPackages = useMemo(() => {
    if (summary?.recentPackages?.length) return summary.recentPackages;
    return packagesFromFlatRecent(summary?.recent ?? []);
  }, [summary]);

  if (loading && !summary) {
    return (
      <div className="max-w-7xl mx-auto">
        <SkeletonDashboard />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="card bg-danger-soft border border-danger/30 max-w-2xl mx-auto">
        <p className="text-danger font-medium">Error loading dashboard</p>
        <p className="text-danger/80 text-sm mt-1">{error}</p>
        <button type="button" className="btn-primary mt-4" onClick={() => void fetchSummary()}>
          Retry
        </button>
      </div>
    );
  }

  const expiring = summary?.expiringProposals ?? [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-10 gap-4">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h1 className="display-title mt-1">Dashboard</h1>
          <p className="text-text-secondary mt-2 text-base max-w-xl">
            Track quotes, conversions, and proposal velocity at a glance. All numbers update live.
          </p>
        </div>
        <Link to="/estimates" className="btn-primary">
          <PlusCircle className="w-5 h-5" />
          <span>New quote</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {STAT_DEFS.map((def, index) => (
          <StatCard key={def.key} def={def} summary={summary} delay={getDelay(index)} />
        ))}
      </div>

      {expiring.length > 0 && (
        <EntranceCard delay={sectionDelay} className="card card-accent mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-warning-soft">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
            <div>
              <SectionTitle as="h2" className="section-title" hint="Within the next 7 days">
                Expiring proposals
              </SectionTitle>
            </div>
          </div>
          <div className="space-y-3">
            {expiring.map((est) => (
              <div
                key={est.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-surface-raised rounded-xl border border-warning/30"
              >
                <div>
                  <span className="font-mono text-sm font-medium">{est.refNumber}</span>
                  <span className="text-text-secondary mx-2">·</span>
                  <span className="font-medium">{est.customerName || 'No customer'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-warning font-semibold">
                    {est.daysLeft === 0 ? 'Expires today' : `${est.daysLeft} day${est.daysLeft === 1 ? '' : 's'} left`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        est.quoteId
                          ? `/quotes/${est.quoteId}/estimates/${est.id}`
                          : `/estimate/${est.id}`
                      )
                    }
                    className="text-sm text-accent-text font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Open
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </EntranceCard>
      )}

      {recentPackages.length > 0 ? (
        <RecentPackagesTable packages={recentPackages} navigate={navigate} />
      ) : (
        <EmptyState
          icon={FileText}
          title="No estimates yet"
          body="Pick a template, configure your stack, and your first cost estimate appears here. Saved quotes show up across the workspace once you create them."
          action={
            <Link to="/estimates" className="btn-primary">
              <PlusCircle className="w-5 h-5" />
              <span>Create first quote</span>
            </Link>
          }
          secondary={
            <>
              Browse the{' '}
              <Link to="/templates" className="text-accent-text hover:underline">
                templates library
              </Link>{' '}
              first if you&apos;re not sure where to start.
            </>
          }
        />
      )}
    </div>
  );
};

export default Dashboard;
