/**
 * Pull customers + PET materials after PEBI Oracle/RM cron completes.
 * ES sync is delayed (default 15 min) so PEBI can finish Oracle ingest first.
 * Push: PEBI POST /api/v1/integration/pebi/oracle-push schedules on ES.
 * Poll: watches rm_last_sync + oracle_last_sync (fallback if push missed).
 */
import { Pool } from 'pg';
import axios from 'axios';
import { isNotNull } from 'drizzle-orm';
import { getDatabase, schema } from '../db/index.js';
import { syncCustomersFromPebiForTenant } from './pebi-customer-sync.js';
import { syncPetMaterialsFromPebiForTenant } from './pebi-material-sync.js';
import { log } from '../utils/logger.js';

export type PebiOracleSyncStatus = {
  rmLastSync: { completedAt?: string } | null;
  oracleLastSync: { completedAt?: string } | null;
};

export type PebiOraclePushSource = 'rm' | 'oracle' | 'both';

export type ScheduledSyncInfo = {
  completedAt: string;
  runAt: string;
  delayMs: number;
};

export type PebiOraclePushResult = {
  companyCode: string;
  scheduled: {
    materials?: ScheduledSyncInfo;
    customers?: ScheduledSyncInfo;
  };
};

const DEFAULT_POLL_MS = 60_000;
const DEFAULT_SYNC_DELAY_MS = 15 * 60 * 1000;

type PendingSync = {
  completedAt: string;
  timer: ReturnType<typeof setTimeout>;
};

let lastRmCompletedAt: string | null = null;
let lastOracleCompletedAt: string | null = null;
let lastRmSyncedCompletedAt: string | null = null;
let lastOracleSyncedCompletedAt: string | null = null;
let pendingRm: PendingSync | null = null;
let pendingOracle: PendingSync | null = null;
let watchInitialized = false;
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let startupHandle: ReturnType<typeof setTimeout> | null = null;
let watchRunning = false;
let syncChain: Promise<void> = Promise.resolve();

function getSyncDelayMs(): number {
  const configured = Number(process.env.PEBI_ES_SYNC_DELAY_MS);
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return DEFAULT_SYNC_DELAY_MS;
}

function runAtMsForCompletedAt(completedAt: string): number {
  const completedMs = new Date(completedAt).getTime();
  if (!Number.isFinite(completedMs)) {
    return Date.now() + getSyncDelayMs();
  }
  return completedMs + getSyncDelayMs();
}

function enqueueSync(job: () => Promise<void>): void {
  syncChain = syncChain
    .then(job)
    .catch((err) => {
      log.warn({ err }, 'PEBI delayed sync job failed');
    });
}

function pebiConnectionConfigured(): boolean {
  const authUrl = process.env.PEBI_AUTH_DATABASE_URL?.trim();
  const apiUrl = process.env.PEBI_API_URL?.trim();
  const secret = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();
  const dbUrl = process.env.PEBI_DATABASE_URL?.trim();
  return !!(authUrl || dbUrl || (apiUrl && secret));
}

function isCoordinatorEnabled(): boolean {
  const flag = process.env.PEBI_SYNC_ENABLED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  const legacy = process.env.PEBI_MATERIAL_SYNC_ENABLED?.trim().toLowerCase();
  if (legacy === 'false' || legacy === '0') return false;
  return pebiConnectionConfigured();
}

async function fetchStatusFromAuthDb(): Promise<PebiOracleSyncStatus> {
  const authUrl = process.env.PEBI_AUTH_DATABASE_URL?.trim();
  if (!authUrl) {
    throw new Error('PEBI_AUTH_DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString: authUrl, max: 2 });
  try {
    const { rows } = await pool.query<{ setting_key: string; setting_value: unknown }>(
      `SELECT setting_key, setting_value
         FROM company_settings
        WHERE setting_key IN ('rm_last_sync', 'oracle_last_sync')`
    );

    const byKey = new Map(rows.map((r) => [r.setting_key, r.setting_value]));
    return {
      rmLastSync: (byKey.get('rm_last_sync') as PebiOracleSyncStatus['rmLastSync']) ?? null,
      oracleLastSync:
        (byKey.get('oracle_last_sync') as PebiOracleSyncStatus['oracleLastSync']) ?? null,
    };
  } finally {
    await pool.end();
  }
}

async function fetchStatusFromApi(companyCode: string): Promise<PebiOracleSyncStatus> {
  const apiUrl = process.env.PEBI_API_URL?.trim();
  const secret = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();
  if (!apiUrl || !secret) {
    throw new Error('PEBI_API_URL and PEBI_ES_INTEGRATION_SECRET are required');
  }

  const base = apiUrl.replace(/\/$/, '');
  const { data } = await axios.get<{
    success: boolean;
    rmLastSync: PebiOracleSyncStatus['rmLastSync'];
    oracleLastSync: PebiOracleSyncStatus['oracleLastSync'];
  }>(`${base}/api/integration/es/oracle-sync-status`, {
    headers: {
      'X-PPH-Integration-Key': secret,
      'X-PPH-Company-Code': companyCode,
    },
    timeout: 30_000,
  });

  if (!data?.success) {
    throw new Error('PEBI oracle-sync-status returned unexpected payload');
  }

  return {
    rmLastSync: data.rmLastSync ?? null,
    oracleLastSync: data.oracleLastSync ?? null,
  };
}

export async function fetchPebiOracleSyncStatus(
  companyCode = 'interplast'
): Promise<PebiOracleSyncStatus> {
  const authUrl = process.env.PEBI_AUTH_DATABASE_URL?.trim();
  if (authUrl) {
    return fetchStatusFromAuthDb();
  }
  return fetchStatusFromApi(companyCode);
}

async function syncMaterialsForAllLinkedTenants(): Promise<void> {
  const db = getDatabase();
  const tenants = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(isNotNull(schema.tenants.platformCompanyCode));

  for (const tenant of tenants) {
    try {
      await syncPetMaterialsFromPebiForTenant(tenant.id);
    } catch (err) {
      log.warn({ err, tenantId: tenant.id }, 'PEBI PET material sync failed');
    }
  }
}

async function syncCustomersForAllLinkedTenants(): Promise<void> {
  const db = getDatabase();
  const tenants = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(isNotNull(schema.tenants.platformCompanyCode));

  for (const tenant of tenants) {
    try {
      await syncCustomersFromPebiForTenant(tenant.id);
    } catch (err) {
      log.warn({ err, tenantId: tenant.id }, 'PEBI customer sync failed');
    }
  }
}

function runDelayedSync(kind: 'rm' | 'oracle', completedAt: string): void {
  if (kind === 'rm') {
    if (completedAt === lastRmSyncedCompletedAt) return;
    lastRmSyncedCompletedAt = completedAt;
    pendingRm = null;
    enqueueSync(async () => {
      log.info({ completedAt }, 'PEBI RM delay elapsed — syncing materials to ES');
      await syncMaterialsForAllLinkedTenants();
    });
    return;
  }

  if (completedAt === lastOracleSyncedCompletedAt) return;
  lastOracleSyncedCompletedAt = completedAt;
  pendingOracle = null;
  enqueueSync(async () => {
    log.info({ completedAt }, 'PEBI Oracle delay elapsed — syncing customers to ES');
    await syncCustomersForAllLinkedTenants();
  });
}

function scheduleSourceSync(
  kind: 'rm' | 'oracle',
  completedAt: string
): ScheduledSyncInfo | null {
  if (!completedAt) return null;

  const alreadySynced =
    kind === 'rm'
      ? completedAt === lastRmSyncedCompletedAt
      : completedAt === lastOracleSyncedCompletedAt;

  if (alreadySynced) return null;

  const pending = kind === 'rm' ? pendingRm : pendingOracle;
  if (pending?.completedAt === completedAt) {
    const runAtMs = runAtMsForCompletedAt(completedAt);
    return {
      completedAt,
      runAt: new Date(runAtMs).toISOString(),
      delayMs: Math.max(0, runAtMs - Date.now()),
    };
  }

  if (pending?.timer) clearTimeout(pending.timer);

  const runAtMs = runAtMsForCompletedAt(completedAt);
  const delayMs = Math.max(0, runAtMs - Date.now());
  const runAt = new Date(runAtMs).toISOString();

  const timer = setTimeout(() => runDelayedSync(kind, completedAt), delayMs);

  if (kind === 'rm') {
    pendingRm = { completedAt, timer };
    log.info({ completedAt, runAt, delayMs }, 'PEBI RM → ES material sync scheduled');
  } else {
    pendingOracle = { completedAt, timer };
    log.info({ completedAt, runAt, delayMs }, 'PEBI Oracle → ES customer sync scheduled');
  }

  return { completedAt, runAt, delayMs };
}

function maybeScheduleOverdue(kind: 'rm' | 'oracle', completedAt: string | null): void {
  if (!completedAt) return;
  const alreadySynced =
    kind === 'rm'
      ? completedAt === lastRmSyncedCompletedAt
      : completedAt === lastOracleSyncedCompletedAt;
  if (alreadySynced) return;
  if (Date.now() < runAtMsForCompletedAt(completedAt)) return;
  scheduleSourceSync(kind, completedAt);
}

export async function handlePebiOraclePush(
  companyCode: string,
  source: PebiOraclePushSource
): Promise<PebiOraclePushResult> {
  const result: PebiOraclePushResult = { companyCode, scheduled: {} };

  let status: PebiOracleSyncStatus | null = null;
  try {
    status = await fetchPebiOracleSyncStatus(companyCode);
    if (status.rmLastSync?.completedAt) lastRmCompletedAt = status.rmLastSync.completedAt;
    if (status.oracleLastSync?.completedAt) lastOracleCompletedAt = status.oracleLastSync.completedAt;
    watchInitialized = true;
  } catch (err) {
    log.warn({ err }, 'PEBI oracle-push could not read sync status');
  }

  if ((source === 'rm' || source === 'both') && status?.rmLastSync?.completedAt) {
    const scheduled = scheduleSourceSync('rm', status.rmLastSync.completedAt);
    if (scheduled) result.scheduled.materials = scheduled;
  }

  if ((source === 'oracle' || source === 'both') && status?.oracleLastSync?.completedAt) {
    const scheduled = scheduleSourceSync('oracle', status.oracleLastSync.completedAt);
    if (scheduled) result.scheduled.customers = scheduled;
  }

  log.info({ companyCode, source, scheduled: result.scheduled }, 'PEBI oracle-push scheduled');
  return result;
}

async function watchTick(): Promise<void> {
  if (watchRunning) return;
  watchRunning = true;

  try {
    const status = await fetchPebiOracleSyncStatus();
    const rmAt = status.rmLastSync?.completedAt ?? null;
    const oracleAt = status.oracleLastSync?.completedAt ?? null;

    if (!watchInitialized) {
      lastRmCompletedAt = rmAt;
      lastOracleCompletedAt = oracleAt;
      watchInitialized = true;
      log.info({ rmAt, oracleAt, delayMs: getSyncDelayMs() }, 'PEBI Oracle sync watch baseline');
      maybeScheduleOverdue('rm', rmAt);
      maybeScheduleOverdue('oracle', oracleAt);
      return;
    }

    if (rmAt && rmAt !== lastRmCompletedAt) {
      lastRmCompletedAt = rmAt;
      scheduleSourceSync('rm', rmAt);
    } else {
      maybeScheduleOverdue('rm', rmAt);
    }

    if (oracleAt && oracleAt !== lastOracleCompletedAt) {
      lastOracleCompletedAt = oracleAt;
      scheduleSourceSync('oracle', oracleAt);
    } else {
      maybeScheduleOverdue('oracle', oracleAt);
    }
  } catch (err) {
    log.warn({ err }, 'PEBI Oracle sync watch tick failed');
  } finally {
    watchRunning = false;
  }
}

function clearPendingTimers(): void {
  if (pendingRm?.timer) clearTimeout(pendingRm.timer);
  if (pendingOracle?.timer) clearTimeout(pendingOracle.timer);
  pendingRm = null;
  pendingOracle = null;
}

export function startPebiOracleSyncCoordinator(): void {
  if (!isCoordinatorEnabled()) {
    log.info('PEBI Oracle sync coordinator off (no PEBI connection or PEBI_SYNC_ENABLED=false)');
    return;
  }

  const pollMs =
    Number(process.env.PEBI_ORACLE_SYNC_POLL_MS) ||
    Number(process.env.PEBI_MATERIAL_SYNC_INTERVAL_MS) ||
    DEFAULT_POLL_MS;

  log.info({ pollMs, delayMs: getSyncDelayMs() }, 'PEBI Oracle sync coordinator on');

  startupHandle = setTimeout(() => void watchTick(), 15_000);
  intervalHandle = setInterval(() => void watchTick(), pollMs);
}

export function stopPebiOracleSyncCoordinator(): void {
  if (startupHandle) {
    clearTimeout(startupHandle);
    startupHandle = null;
  }
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  clearPendingTimers();
  watchInitialized = false;
}
