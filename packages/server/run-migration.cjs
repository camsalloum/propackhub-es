const pg = require('pg');
const fs = require('fs');
const path = require('path');
const c = new pg.Client({ connectionString: 'postgresql://es_user:es_password@localhost:5432/estimation_studio' });

async function run() {
  await c.connect();
  const sql = fs.readFileSync(path.join(__dirname, 'migrate-estimates.sql'), 'utf8');
  await c.query(sql);
  console.log('Migration complete!');
  
  // Verify - show all tables and their columns
  const res = await c.query("SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name IN ('tenants','users','estimates','customers','materials','layers','processes','slabs','activity_logs','structure_templates') ORDER BY table_name, ordinal_position;");
  const tables = {};
  res.rows.forEach(r => {
    if (!tables[r.table_name]) tables[r.table_name] = [];
    tables[r.table_name].push(`${r.column_name} (${r.data_type})`);
  });
  Object.keys(tables).sort().forEach(t => {
    console.log(`\n${t}:`);
    tables[t].forEach(c => console.log(`  ${c}`));
  });
  await c.end();
}

run().catch(e => { console.error(e); process.exit(1); });