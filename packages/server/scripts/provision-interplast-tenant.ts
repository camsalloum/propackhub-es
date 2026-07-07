/**
 * Idempotent provision of Interplast (IP/FP) as an ES company tenant.
 * Camille = tenant_admin; PPH platform owner (admin@propackhub.com) stays separate.
 *
 * Usage:
 *   npm run db:provision-interplast --workspace=packages/server
 *
 * Env overrides (optional):
 *   INTERPLAST_TENANT_NAME=Interplast
 *   INTERPLAST_PLATFORM_COMPANY_CODE=interplast
 *   INTERPLAST_ADMIN_EMAIL=camille@interplast-uae.com
 *   INTERPLAST_ADMIN_PASSWORD=...   (default: Admin@123 — PEBI dev parity)
 *   INTERPLAST_DISPLAY_CURRENCY=AED
 */
import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../src/db/index.js';
import { hashPassword } from '../src/utils/auth.js';
import { ensureMaterialsForTenant } from '../src/db/seed-materials.js';
import { ensureTemplatesForTenant } from '../src/db/seed-templates.js';
import { ensureCategoriesForTenant } from '../src/db/seed-categories.js';
import { ensureSlabTemplatesForTenant } from '../src/db/seed-slab-templates.js';
import { fetchExchangeRate } from '../src/utils/fx-rates.js';

const TENANT_NAME = process.env.INTERPLAST_TENANT_NAME?.trim() || 'Interplast';
const PLATFORM_COMPANY_CODE =
  process.env.INTERPLAST_PLATFORM_COMPANY_CODE?.trim() || 'interplast';
const ADMIN_EMAIL =
  process.env.INTERPLAST_ADMIN_EMAIL?.trim() || 'camille@interplast-uae.com';
const ADMIN_PASSWORD = process.env.INTERPLAST_ADMIN_PASSWORD || 'Admin@123';
const ADMIN_DISPLAY_NAME = process.env.INTERPLAST_ADMIN_NAME?.trim() || 'Camille Salloum';
const DISPLAY_CURRENCY = process.env.INTERPLAST_DISPLAY_CURRENCY?.trim() || 'AED';
const PLATFORM_OWNER_EMAIL =
  process.env.ADMIN_SEED_EMAIL?.trim() || 'admin@propackhub.com';

async function resolveFx(): Promise<string> {
  try {
    const rate = await fetchExchangeRate(DISPLAY_CURRENCY);
    return rate.toFixed(6);
  } catch {
    return DISPLAY_CURRENCY === 'AED' ? '3.672500' : '1.000000';
  }
}

async function ensurePlatformOwner(db: ReturnType<typeof getDatabase>): Promise<void> {
  const [owner] = await db
    .select({
      id: schema.users.id,
      role: schema.users.role,
      tenantId: schema.users.tenantId,
    })
    .from(schema.users)
    .where(eq(schema.users.email, PLATFORM_OWNER_EMAIL))
    .limit(1);

  if (!owner) {
    console.log(
      `Platform owner ${PLATFORM_OWNER_EMAIL} not found — set ADMIN_SEED_ENABLED=1 and restart API, or register manually.`
    );
    return;
  }

  if (owner.role !== 'platform_admin') {
    await db
      .update(schema.users)
      .set({ role: 'platform_admin', updatedAt: new Date() })
      .where(eq(schema.users.id, owner.id));
    console.log(`Promoted ${PLATFORM_OWNER_EMAIL} → platform_admin`);
  } else {
    console.log(`Platform owner OK: ${PLATFORM_OWNER_EMAIL} (platform_admin)`);
  }
}

async function findInterplastTenant(db: ReturnType<typeof getDatabase>) {
  const byCode = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, PLATFORM_COMPANY_CODE))
    .limit(1);
  if (byCode[0]) return byCode[0];

  const byName = await db
    .select()
    .from(schema.tenants)
    .where(and(eq(schema.tenants.name, TENANT_NAME), eq(schema.tenants.type, 'company')))
    .limit(1);
  return byName[0] ?? null;
}

async function main() {
  await initializeDatabase();
  const db = getDatabase();

  await ensurePlatformOwner(db);

  let tenant = await findInterplastTenant(db);

  if (!tenant) {
    const fx = await resolveFx();
    const [created] = await db
      .insert(schema.tenants)
      .values({
        name: TENANT_NAME,
        type: 'company',
        platformCompanyCode: PLATFORM_COMPANY_CODE,
        displayCurrency: DISPLAY_CURRENCY,
        exchangeRateUsdToDisplay: fx,
        useAutoFx: true,
        operatingCostMethod: 'process_per_kg',
      })
      .returning();
    tenant = created ?? null;
    if (!tenant) {
      throw new Error('Failed to create Interplast tenant');
    }
    console.log(`Created tenant: ${tenant.name} (${tenant.id})`);
  } else {
    if (!tenant.platformCompanyCode) {
      await db
        .update(schema.tenants)
        .set({ platformCompanyCode: PLATFORM_COMPANY_CODE, updatedAt: new Date() })
        .where(eq(schema.tenants.id, tenant.id));
    }
    console.log(`Tenant exists: ${tenant.name} (${tenant.id})`);
  }

  const tenantId = tenant.id;

  const [existingAdmin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, ADMIN_EMAIL))
    .limit(1);

  if (!existingAdmin) {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    await db.insert(schema.users).values({
      tenantId,
      email: ADMIN_EMAIL,
      passwordHash,
      displayName: ADMIN_DISPLAY_NAME,
      role: 'tenant_admin',
    });
    console.log(`Created tenant_admin: ${ADMIN_EMAIL}`);
  } else if (existingAdmin.tenantId !== tenantId) {
    throw new Error(
      `${ADMIN_EMAIL} already belongs to another tenant (${existingAdmin.tenantId})`
    );
  } else if (existingAdmin.role !== 'tenant_admin' && existingAdmin.role !== 'platform_admin') {
    await db
      .update(schema.users)
      .set({ role: 'tenant_admin', updatedAt: new Date() })
      .where(eq(schema.users.id, existingAdmin.id));
    console.log(`Promoted ${ADMIN_EMAIL} → tenant_admin`);
  } else {
    console.log(`Admin user OK: ${ADMIN_EMAIL} (${existingAdmin.role})`);
  }

  const matsAdded = await ensureMaterialsForTenant(tenantId);
  console.log(matsAdded > 0 ? `Materials seeded: ${matsAdded}` : 'Materials OK');

  const tplAdded = await ensureTemplatesForTenant(tenantId);
  console.log(tplAdded > 0 ? `Templates seeded: ${tplAdded}` : 'Templates OK');

  await ensureCategoriesForTenant(tenantId);
  await ensureSlabTemplatesForTenant(tenantId);

  console.log('\n--- Interplast ES tenant ready ---');
  console.log(`Tenant:   ${TENANT_NAME} (platform_company_code=${PLATFORM_COMPANY_CODE})`);
  console.log(`Login:    ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD} (PEBI dev parity; change in production)`);
  console.log(`Owner:    ${PLATFORM_OWNER_EMAIL} (platform_admin — separate tenant)`);

  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
