/**
 * Standalone migration runner — executes pending drizzle/ SQL migrations.
 * Usage: npm run db:migrate
 * Safe to re-run: already-applied migrations are skipped.
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { runMigrations } from '../src/db/index.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

try {
  await runMigrations(pool);
  console.log('✓ All migrations complete');
} catch (err) {
  console.error('✗ Migration failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
