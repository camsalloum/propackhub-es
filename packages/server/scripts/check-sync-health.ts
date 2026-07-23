/**
 * CLI: report PACKAGING/CONSUMABLES rows with missing/$0 unit prices.
 *
 * Usage:
 *   npm run db:check-sync-health --workspace=packages/server
 *   npx tsx scripts/check-sync-health.ts --tenant-code interplast
 *   npx tsx scripts/check-sync-health.ts --fail   # exit 1 if any unpriced
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { closeDatabase, getDatabase, initializeDatabase, schema } from '../src/db';
import {
  getTenantSyncHealth,
  listCompanyTenantsSyncHealth,
} from '../src/services/sync-health';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

async function main() {
  const fail = process.argv.includes('--fail');
  const tenantCode = arg('--tenant-code');
  const tenantId = arg('--tenant-id');

  await initializeDatabase();

  let reports;
  if (tenantId) {
    const one = await getTenantSyncHealth(tenantId);
    reports = one ? [one] : [];
  } else if (tenantCode) {
    const db = getDatabase();
    const [row] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.platformCompanyCode, tenantCode.toLowerCase()))
      .limit(1);
    if (!row) {
      console.error(JSON.stringify({ ok: false, reason: `tenant code "${tenantCode}" not found` }));
      process.exit(1);
    }
    const one = await getTenantSyncHealth(row.id);
    reports = one ? [one] : [];
  } else {
    reports = await listCompanyTenantsSyncHealth();
  }

  const unhealthy = reports.filter((r) => !r.healthy);
  const summary = {
    ok: unhealthy.length === 0,
    tenantsChecked: reports.length,
    unhealthyCount: unhealthy.length,
    tenants: reports.map((r) => ({
      tenantId: r.tenantId,
      name: r.tenantName,
      platformCompanyCode: r.platformCompanyCode,
      healthy: r.healthy,
      packaging: { total: r.packagingTotal, unpriced: r.packagingUnpriced },
      consumables: { total: r.consumablesTotal, unpriced: r.consumablesUnpriced },
      unpricedKeys: r.unpriced.map((u) => u.platformMasterKey || u.name),
    })),
  };

  console.log(JSON.stringify(summary, null, 2));
  await closeDatabase();

  if (fail && !summary.ok) {
    console.error(
      '\nSync health FAILED — re-sync PACKAGING/CONSUMABLES from PEBI:\n  npm run db:sync-materials-pebi --workspace=packages/server'
    );
    process.exit(1);
  }
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
