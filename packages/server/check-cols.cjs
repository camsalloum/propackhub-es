const pg = require('pg');
const c = new pg.Client({ connectionString: 'postgresql://es_user:es_password@localhost:5432/estimation_studio' });
c.connect()
  .then(() => c.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('tenants','users','estimates','customers','materials','layers','processes') ORDER BY table_name, ordinal_position;"))
  .then(r => { r.rows.forEach(r => console.log(r.table_name + ' | ' + r.column_name + ' | ' + r.data_type)); })
  .finally(() => c.end());