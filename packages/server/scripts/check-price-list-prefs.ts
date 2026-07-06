import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const col = await pool.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'price_list_display_prefs'"
);
console.log('column exists:', col.rows.length > 0);
const rows = await pool.query(
  "SELECT ref_number, price_list_display_prefs, updated_at FROM quotes ORDER BY updated_at DESC LIMIT 5"
);
for (const r of rows.rows) {
  console.log(r.ref_number, r.price_list_display_prefs);
}
await pool.end();
