import 'dotenv/config';
import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Clean up duplicate processes (keep oldest row per estimate+process_key)
await pool.query(`
  DELETE FROM processes
  WHERE id IN (
    SELECT p1.id FROM processes p1
    INNER JOIN processes p2
      ON p1.estimate_id = p2.estimate_id
      AND p1.process_key = p2.process_key
      AND p1.created_at > p2.created_at
  )
`);
console.log('✅ Cleaned up duplicate processes');

// Re-check
const p = await pool.query(`SELECT e.job_name, p.name, p.process_key, p.enabled FROM processes p JOIN estimates e ON p.estimate_id = e.id ORDER BY e.job_name`);
for (const r of p.rows) {
  console.log(`  ${r.job_name} → ${r.name} (key=${r.process_key})`);
}
console.log(`Total: ${p.rows.length} processes`);

// Check which estimates still have 0 processes
const zero = await pool.query(`SELECT e.job_name FROM estimates e WHERE NOT EXISTS (SELECT 1 FROM processes p WHERE p.estimate_id = e.id)`);
if (zero.rows.length > 0) {
  console.log(`\nEstimates with 0 processes (${zero.rows.length}):`);
  for (const r of zero.rows) console.log(`  ${r.job_name}`);
} else {
  console.log('\n✅ All estimates have processes');
}
await pool.end();
