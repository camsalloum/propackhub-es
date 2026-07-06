import { getDatabase, schema } from './index';
import { hashPassword } from '../utils/auth';
import { eq } from 'drizzle-orm';
import { seedMaterialsForTenant, ensureMaterialsForTenant } from './seed-materials';
import { seedTemplatesForTenant, ensureTemplatesForTenant } from './seed-templates';
import { log } from '../utils/logger';

const DEFAULT_TENANT_NAME = 'ProPackHub';
const DEFAULT_CURRENCY = 'USD';

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

/**
 * Optionally seed a platform admin on startup.
 * Requires ADMIN_SEED_ENABLED=1 and ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD env vars.
 */
export async function seedDefaultAdmin(): Promise<void> {
  const config = adminSeedConfig();
  if (!config) {
    return;
  }

  const { email, password } = config;
  const db = getDatabase();

  try {
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing.length > 0) {
      const [admin] = await db
        .select({ id: schema.users.id, tenantId: schema.users.tenantId, role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (admin && admin.role !== 'platform_admin') {
        await db
          .update(schema.users)
          .set({ role: 'platform_admin', updatedAt: new Date() })
          .where(eq(schema.users.id, admin.id));
        log.info({ email }, 'Promoted user to platform_admin');
      }

      if (admin) {
        try {
          const matsAdded = await ensureMaterialsForTenant(admin.tenantId);
          if (matsAdded > 0) {
            log.info({ count: matsAdded, tenantId: admin.tenantId }, 'Backfilled materials for admin tenant');
          }
        } catch (seedErr) {
          log.error({ err: seedErr }, 'Failed to backfill materials for admin tenant');
        }
        try {
          const added = await ensureTemplatesForTenant(admin.tenantId);
          if (added > 0) {
            log.info({ count: added, tenantId: admin.tenantId }, 'Backfilled structure templates for admin tenant');
          }
        } catch (seedErr) {
          log.error({ err: seedErr }, 'Failed to backfill templates for admin tenant');
        }
      }

      log.info({ email }, 'Admin seed user already exists');
      return;
    }

    log.info({ email }, 'Creating admin seed user');

    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: DEFAULT_TENANT_NAME,
        type: 'company',
        displayCurrency: DEFAULT_CURRENCY,
        exchangeRateUsdToDisplay: '1.0',
        useAutoFx: true,
      })
      .returning();

    if (!tenant) {
      log.error('Failed to create admin seed tenant');
      return;
    }

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

    log.info(
      { email, tenantId: tenant.id, tenantName: DEFAULT_TENANT_NAME, role: 'platform_admin' },
      'Admin seed user created'
    );
  } catch (error) {
    log.error({ err: error }, 'Failed to seed admin user');
  }
}
