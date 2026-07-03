import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const sql = readFileSync(path.join(__dirname, 'schema-patches.sql'), 'utf8');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    // PG: new enum values must commit before use in UPDATE (55P04)
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE material_price_source ADD VALUE IF NOT EXISTS 'platform';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    // Third Manufacturing & Operating method: fixed CoRM per product group.
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE operating_cost_method ADD VALUE IF NOT EXISTS 'fixed_per_group';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      UPDATE materials SET price_source = 'platform' WHERE price_source = 'excel';
    `);
    await client.query(sql);
    console.log('Schema patches applied');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
