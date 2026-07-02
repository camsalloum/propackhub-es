/**
 * Migration: add process_key and process_quantity columns to processes table.
 * Run: npx tsx scripts/add-process-key-quantity.ts
 */
import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Add process_key column (nullable — backfill from name)
    await pool.query(`
      ALTER TABLE processes
      ADD COLUMN IF NOT EXISTS process_key VARCHAR(255);
    `);
    console.log('✅ Added process_key column');

    // Add process_quantity column (default 1)
    await pool.query(`
      ALTER TABLE processes
      ADD COLUMN IF NOT EXISTS process_quantity INTEGER NOT NULL DEFAULT 1;
    `);
    console.log('✅ Added process_quantity column');

    // Backfill process_key from name for existing rows
    await pool.query(`
      UPDATE processes
      SET process_key = LOWER(REPLACE(TRIM(name), ' ', '_'))
      WHERE process_key IS NULL;
    `);
    console.log('✅ Backfilled process_key from name');

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
