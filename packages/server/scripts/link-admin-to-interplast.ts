/**
 * Move platform admin (admin@propackhub.com) onto the Interplast ES tenant
 * so New quote autocomplete shows PEBI-synced customers (~700).
 *
 * Email is globally unique — cannot dual-home the same email.
 * Keeps role=platform_admin. Clears refresh sessions so client must re-login
 * (access JWT embeds the old tenantId until logout).
 *
 *   npm run db:link-admin-interplast --workspace=packages/server
 */
import 'dotenv/config';
import { eq, ilike, and, sql } from 'drizzle-orm';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../src/db/index.js';

const ADMIN_EMAIL =
  process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase() || 'admin@propackhub.com';
const COMPANY_CODE =
  process.env.INTERPLAST_PLATFORM_COMPANY_CODE?.trim() || 'interplast';

async function main() {
  await initializeDatabase();
  const db = getDatabase();

  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, COMPANY_CODE))
    .limit(1);

  if (!tenant) {
    throw new Error(
      `Interplast tenant not found (platform_company_code=${COMPANY_CODE}). Run db:provision-interplast first.`
    );
  }

  const [admin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .limit(1);

  if (!admin) {
    throw new Error(
      `User ${ADMIN_EMAIL} not found. Set ADMIN_SEED_ENABLED=1 and restart API, or register first.`
    );
  }

  if (admin.tenantId === tenant.id) {
    console.log(`OK: ${ADMIN_EMAIL} already on ${tenant.name} (${tenant.id})`);
  } else {
    await db
      .update(schema.users)
      .set({
        tenantId: tenant.id,
        role: 'platform_admin',
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, admin.id));
    console.log(
      `Moved ${ADMIN_EMAIL}: ${admin.tenantId} → ${tenant.id} (${tenant.name}), role=platform_admin`
    );
  }

  const deleted = await db
    .delete(schema.sessions)
    .where(eq(schema.sessions.userId, admin.id))
    .returning({ id: schema.sessions.id });
  console.log(`Cleared ${deleted.length} refresh session(s) for ${ADMIN_EMAIL}`);

  const [adminNow] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
      tenantId: schema.users.tenantId,
      tenantName: schema.tenants.name,
      companyCode: schema.tenants.platformCompanyCode,
    })
    .from(schema.users)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.users.tenantId))
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .limit(1);

  const [{ n: customerCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.customers)
    .where(eq(schema.customers.tenantId, tenant.id));

  const dahman = await db
    .select({ companyName: schema.customers.companyName })
    .from(schema.customers)
    .where(
      and(
        eq(schema.customers.tenantId, tenant.id),
        ilike(schema.customers.companyName, '%DAHMAN%')
      )
    )
    .limit(5);

  console.log('\nVERIFY:');
  console.log(adminNow);
  console.log(`Customers on Interplast: ${customerCount}`);
  console.log('DAHMAN matches:', dahman);

  if (!adminNow || adminNow.tenantId !== tenant.id) {
    throw new Error('Verification failed: admin not on Interplast');
  }
  if (!dahman.length) {
    throw new Error('Verification failed: no DAHMAN customer on Interplast');
  }

  console.log('\nDone. Log out of ES (or hard-refresh), then sign in as:');
  console.log(`  ${ADMIN_EMAIL}`);
  console.log('New quote → type "d" or DAHMAN — PEBI list should appear.');
  console.log('(PEBI being down does not affect this search.)');

  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
