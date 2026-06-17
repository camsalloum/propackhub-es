const pg = require('pg');
const fs = require('fs');
const path = require('path');
const c = new pg.Client({ connectionString: 'postgresql://es_user:es_password@localhost:5432/estimation_studio' });

async function run() {
  await c.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'migrate-estimates.sql'), 'utf8');
  await c.query(sql);
  console.log('Migration complete!');
  
  // Verify
  const res = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='estimates' ORDER BY ordinal_position;");
  console.log('Columns after migration:');
  res.rows.forEach(r => console.log('  ' + r.column_name));
  await c.end();
}

run().catch(e => { console.error(e); process.exit(1); });