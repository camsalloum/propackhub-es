import 'dotenv/config';
import { Pool } from 'pg';
import { eq, sql } from 'drizzle-orm';
import { initializeDatabase, getDatabase, closeDatabase, schema } from '../src/db/index.js';

async function main() {
  await initializeDatabase();
  const db = getDatabase();

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, 'interplast'))
    .limit(1);

  if (!tenant) throw new Error('Interplast tenant not found');
  const tenantId = tenant.id;
  console.log('tenant', tenantId);

  const totals = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT company_name)::int AS distinct_names,
      COUNT(*) FILTER (WHERE external_source = 'pebi')::int AS pebi_linked,
      COUNT(*) FILTER (WHERE external_source IS NULL)::int AS no_external
    FROM customers WHERE tenant_id = ${tenantId}
  `);
  console.log('ES totals:', totals.rows[0]);

  const dupes = await db.execute(sql`
    SELECT company_name, COUNT(*)::int AS cnt
    FROM customers
    WHERE tenant_id = ${tenantId}
    GROUP BY company_name
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC, company_name
    LIMIT 10
  `);
  console.log('ES duplicate names:', dupes.rows);

  const sample = await db.execute(sql`
    SELECT id, company_name, external_id, external_source, created_at
    FROM customers
    WHERE tenant_id = ${tenantId} AND company_name = '050telecom (Mobile Solutions)'
    ORDER BY created_at
  `);
  console.log('ES sample:', sample.rows);

  const dbUrl = process.env.PEBI_DATABASE_URL?.trim();
  if (dbUrl) {
    const pool = new Pool({ connectionString: dbUrl, max: 2 });
    const pebi = await pool.query(
      `SELECT customer_id, display_name, normalized_name, customer_code, last_transaction_date
         FROM fp_customer_unified
        WHERE display_name = $1 ORDER BY customer_id`,
      ['050telecom (Mobile Solutions)']
    );
    console.log('PEBI sample:', pebi.rows);

    const pebiDupes = await pool.query(`
      SELECT display_name, COUNT(*)::int cnt, array_agg(customer_id ORDER BY customer_id) ids
      FROM fp_customer_unified
      WHERE COALESCE(is_merged,false)=false AND COALESCE(is_active,true)=true
      GROUP BY display_name HAVING COUNT(*)>1
      ORDER BY cnt DESC LIMIT 10
    `);
    console.log('PEBI duplicate names:', pebiDupes.rows);
    await pool.end();
  }

  await closeDatabase();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
