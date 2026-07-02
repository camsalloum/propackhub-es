import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseEnvBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const token = raw.trim().toLowerCase();
  if (token === '1' || token === 'true' || token === 'yes' || token === 'on') return true;
  if (token === '0' || token === 'false' || token === 'no' || token === 'off') return false;
  return fallback;
}

export function isTransientDatabaseError(error: unknown): boolean {
  const err = error as { code?: string; message?: string; cause?: unknown };
  const message = String(err?.message ?? '').toLowerCase();
  const code = String(err?.code ?? '').toUpperCase();

  if (
    code === '57P01' || // admin_shutdown
    code === '57P02' || // crash_shutdown
    code === '57P03' || // cannot_connect_now
    code === '53300' || // too_many_connections
    code === '08000' || // connection_exception
    code === '08003' || // connection_does_not_exist
    code === '08006' || // connection_failure
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE'
  ) {
    return true;
  }

  if (
    message.includes('connection terminated unexpectedly') ||
    message.includes('connection terminated due to connection timeout') ||
    message.includes('timeout') ||
    message.includes('server closed the connection') ||
    message.includes('socket hang up') ||
    message.includes('read econNreset'.toLowerCase())
  ) {
    return true;
  }

  const cause = err?.cause as { message?: string } | undefined;
  const causeMessage = String(cause?.message ?? '').toLowerCase();
  return (
    causeMessage.includes('connection terminated unexpectedly') ||
    causeMessage.includes('timeout') ||
    causeMessage.includes('socket hang up')
  );
}

/**
 * Run pending SQL migrations from the drizzle/ folder.
 * Tracks applied migrations in __drizzle_migrations table.
 * Called automatically on boot when NODE_ENV !== 'development'.
 */
export async function runMigrations(pgPool: Pool): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // Works both from src/ (tsx) and from dist/ (compiled)
  const migrationsDir = resolve(__dirname, '../../drizzle');

  if (!existsSync(migrationsDir)) {
    console.warn('⚠  drizzle/ migrations folder not found — skipping migrations');
    return;
  }

  // Ensure tracking table exists
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id          SERIAL PRIMARY KEY,
      tag         VARCHAR(256) NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Load journal
  const journalPath = resolve(migrationsDir, 'meta/_journal.json');
  if (!existsSync(journalPath)) {
    console.warn('⚠  drizzle/meta/_journal.json not found — skipping migrations');
    return;
  }
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries: Array<{ tag: string }>;
  };

  for (const entry of journal.entries) {
    // Check if already applied
    const { rows } = await pgPool.query(
      'SELECT id FROM __drizzle_migrations WHERE tag = $1',
      [entry.tag]
    );
    if (rows.length > 0) continue;

    const sqlPath = resolve(migrationsDir, `${entry.tag}.sql`);
    if (!existsSync(sqlPath)) {
      console.warn(`⚠  Migration file not found: ${sqlPath}`);
      continue;
    }

    const sql = readFileSync(sqlPath, 'utf8');
    console.log(`▶ Applying migration: ${entry.tag}`);
    await pgPool.query(sql);
    await pgPool.query(
      'INSERT INTO __drizzle_migrations (tag) VALUES ($1)',
      [entry.tag]
    );
    console.log(`✓ Migration applied: ${entry.tag}`);
  }
}

export async function initializeDatabase(): Promise<NodePgDatabase<typeof schema>> {
  if (db) return db;

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString: DATABASE_URL,
    max: parseEnvInt('DB_POOL_MAX', 20),
    idleTimeoutMillis: parseEnvInt('DB_IDLE_TIMEOUT_MS', 30000),
    connectionTimeoutMillis: parseEnvInt('DB_CONNECTION_TIMEOUT_MS', 10000),
    keepAlive: parseEnvBool('DB_KEEP_ALIVE', true),
    keepAliveInitialDelayMillis: parseEnvInt('DB_KEEP_ALIVE_INITIAL_DELAY_MS', 10000),
  });

  pool.on('error', (error) => {
    console.error('PostgreSQL pool error:', error);
  });

  db = drizzle(pool, { schema });

  // Test connection
  try {
    await pool.query('SELECT 1');
    console.log('✓ Database connected');
  } catch (error) {
    console.error('✗ Failed to connect to database:', error);
    throw error;
  }

  // Run migrations automatically in non-dev environments
  if (process.env.NODE_ENV !== 'development') {
    await runMigrations(pool);
  }

  return db;
}

export function getDatabase(): NodePgDatabase<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function resetDatabaseConnection(): Promise<NodePgDatabase<typeof schema>> {
  if (pool) {
    try {
      await pool.end();
    } catch (error) {
      console.warn('Database pool close warning during reset:', error);
    }
  }

  pool = null;
  db = null;

  return initializeDatabase();
}

export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    console.log('Database connection closed');
  }
}

export type Database = NodePgDatabase<typeof schema>;
export { schema };
