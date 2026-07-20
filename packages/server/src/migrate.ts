/**
 * Standalone migration runner for production deploys.
 * Usage: node dist/migrate.js  (after npm run build --workspace=packages/server)
 */
import 'dotenv/config';
import { Pool } from 'pg';
import { runMigrations } from './db/index.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString, max: 1 });

try {
  await runMigrations(pool);
  console.log('✓ All migrations complete');
} catch (err) {
  console.error('✗ Migration failed:', err);
  process.exit(1);
} finally {
  await pool.end();
}
