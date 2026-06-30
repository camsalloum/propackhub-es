/**
 * One-time cleanup: purge accumulated estimates (e.g. drafts auto-created by the
 * old template-instantiate-on-pick behaviour).
 *
 * Usage:
 *   npm run db:purge-estimates            # deletes draft estimates (default, safe)
 *   npm run db:purge-estimates -- --all   # deletes ALL estimates (clean slate)
 *
 * Deleting an estimate cascades to its layers, slabs, processes, proposals and
 * cost snapshots via ON DELETE CASCADE. This is destructive and irreversible.
 * In production it refuses to run unless --force is passed.
 */
import 'dotenv/config';
import { Pool } from 'pg';

const ALL = process.argv.includes('--all');
const FORCE = process.argv.includes('--force') || process.env.FORCE === '1';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

try {
  if (process.env.NODE_ENV === 'production' && !FORCE) {
    console.error('✗ Refusing to purge estimates in production without --force');
    process.exit(1);
  }

  const counts = await pool.query<{ status: string; n: number }>(
    'SELECT status, count(*)::int AS n FROM estimates GROUP BY status ORDER BY status'
  );
  let total = 0;
  console.log('Estimates currently in the database:');
  for (const r of counts.rows) {
    console.log(`  ${r.status}: ${r.n}`);
    total += Number(r.n);
  }
  console.log(`  total: ${total}`);

  if (total === 0) {
    console.log('Nothing to delete.');
    process.exit(0);
  }

  // Children (layers/slabs/processes/proposals/estimation_costs) cascade on delete.
  const result = ALL
    ? await pool.query('DELETE FROM estimates')
    : await pool.query(`DELETE FROM estimates WHERE status = 'draft'`);

  console.log(
    `✓ Deleted ${result.rowCount} estimate(s) [${ALL ? 'ALL statuses' : "status='draft'"}]. Child rows cascaded.`
  );
} catch (err) {
  console.error('✗ Purge failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
