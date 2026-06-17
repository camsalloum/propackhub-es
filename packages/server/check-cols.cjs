const pg = require('pg');
const c = new pg.Client({ connectionString: 'postgresql://es_user:es_password@localhost:5432/estimation_studio' });
c.connect()
  .then(() => c.query("SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name IN ('tenants','users','estimates','customers','materials','layers','processes','slabs','activity_logs','structure_templates') ORDER BY table_name, ordinal_position;"))
  .then(r => { r.rows.forEach(r => console.log(r.table_name + ' | ' + r.column_name + ' | ' + r.data_type + ' | ' + r.is_nullable + ' | ' + (r.column_default||''))); })
  .finally(() => c.end());