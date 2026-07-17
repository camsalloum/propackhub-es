import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../.env') });

async function main() {
  const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await p.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS quotation_format JSONB');
  console.log('quotation_format column ok');
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
