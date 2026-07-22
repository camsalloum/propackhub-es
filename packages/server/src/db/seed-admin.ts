import { getDatabase, schema } from './index';
import { hashPassword } from '../utils/auth';
import { eq } from 'drizzle-orm';
import { seedMaterialsForTenant, ensureMaterialsForTenant } from './seed-materials';
import { seedTemplatesForTenant, ensureTemplatesForTenant } from './seed-templates';
import { log } from '../utils/logger';

const DEFAULT_TENANT_NAME = 'ProPackHub';
const DEFAULT_CURRENCY = 'USD';
const INTERPLAST_CODE =
  process.env.INTERPLAST_PLATFORM_COMPANY_CODE?.trim() || 'interplast';

function adminSeedConfig(): { email: string; password: string } | null {
  if (process.env.ADMIN_SEED_ENABLED !== '1') {
    return null;
  }
  const email = process.env.ADMIN_SEED_EMAIL?.trim();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    log.warn('ADMIN_SEED_ENABLED=1 but ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD not set — skipping admin seed');
    return null;
  }
  return { email, password };
}

/** Prefer Interplast when provisioned so local admin login sees PEBI customers. */
async function resolveAdminTenantId(
  db: ReturnType<typeof getDatabase>
): Promise<{ id: string; name: string; created: boolean }> {
  const [interplast] = await db
    .select({ id: schema.tenants.id, name: schema.tenants.name })
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, INTERPLAST_CODE))
    .limit(1);

  if (interplast) {
    return { id: interplast.id, name: interplast.name, created: false };
  }

  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: DEFAULT_TENANT_NAME,
      type: 'company',
      displayCurrency: DEFAULT_CURRENCY,
      exchangeRateUsdToDisplay: '1.0',
      useAutoFx: true,
    })
    .returning({ id: schema.tenants.id, name: schema.tenants.name });

  if (!tenant) {
    throw new Error('Failed to create admin seed tenant');
  }
  return { id: tenant.id, name: tenant.name, created: true };
}

/**
 * Optionally seed a platform admin on startup.
 * Requires ADMIN_SEED_ENABLED=1 and ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD env vars.
 * When Interplast is provisioned, attaches admin there (same password) so New quote
 * autocomplete shows PEBI customers — email is globally unique so one home only.
 */
export async function seedDefaultAdmin(): Promise<void> {
  const config = adminSeedConfig();
  if (!config) {
    return;
  }

  const { email, password } = config;
  const db = getDatabase();

  try {
    const [admin] = await db
      .select({ id: schema.users.id, tenantId: schema.users.tenantId, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (admin) {
      const tenant = await resolveAdminTenantId(db);
      const updates: { role?: 'platform_admin'; tenantId?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };
      if (admin.role !== 'platform_admin') {
        updates.role = 'platform_admin';
      }
      if (admin.tenantId !== tenant.id) {
        updates.tenantId = tenant.id;
      }
      if (updates.role || updates.tenantId) {
        await db.update(schema.users).set(updates).where(eq(schema.users.id, admin.id));
        if (updates.tenantId) {
          log.info(
            { email, from: admin.tenantId, to: tenant.id, tenantName: tenant.name },
            'Moved platform_admin onto Interplast (PEBI customers)'
          );
        } else {
          log.info({ email }, 'Promoted user to platform_admin');
        }
      }

      try {
        const matsAdded = await ensureMaterialsForTenant(tenant.id);
        if (matsAdded > 0) {
          log.info({ count: matsAdded, tenantId: tenant.id }, 'Backfilled materials for admin tenant');
        }
      } catch (seedErr) {
        log.error({ err: seedErr }, 'Failed to backfill materials for admin tenant');
      }
      try {
        const added = await ensureTemplatesForTenant(tenant.id);
        if (added > 0) {
          log.info({ count: added, tenantId: tenant.id }, 'Backfilled structure templates for admin tenant');
        }
      } catch (seedErr) {
        log.error({ err: seedErr }, 'Failed to backfill templates for admin tenant');
      }

      log.info({ email, tenantId: tenant.id, tenantName: tenant.name }, 'Admin seed user already exists');
      return;
    }

    log.info({ email }, 'Creating admin seed user');

    const tenant = await resolveAdminTenantId(db);
    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email,
        passwordHash,
        displayName: 'Admin',
        role: 'platform_admin',
      })
      .returning();

    if (!user) {
      log.error('Failed to create admin seed user');
      return;
    }

    if (tenant.created) {
      try {
        const materialCount = await seedMaterialsForTenant(tenant.id);
        log.info({ count: materialCount, tenantId: tenant.id }, 'Seeded materials for admin tenant');
      } catch (seedErr) {
        log.error({ err: seedErr }, 'Failed to seed materials for admin tenant');
      }

      try {
        const templateCount = await seedTemplatesForTenant(tenant.id);
        log.info({ count: templateCount, tenantId: tenant.id }, 'Seeded structure templates for admin tenant');
      } catch (seedErr) {
        log.error({ err: seedErr }, 'Failed to seed templates for admin tenant');
      }
    } else {
      try {
        await ensureMaterialsForTenant(tenant.id);
        await ensureTemplatesForTenant(tenant.id);
      } catch (seedErr) {
        log.error({ err: seedErr }, 'Failed to ensure materials/templates for admin tenant');
      }
    }

    log.info(
      { email, tenantId: tenant.id, tenantName: tenant.name, role: 'platform_admin' },
      'Admin seed user created'
    );
  } catch (error) {
    log.error({ err: error }, 'Failed to seed admin user');
  }
}
