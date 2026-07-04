import { getDatabase, schema } from './index';
import { hashPassword } from '../utils/auth';
import { eq } from 'drizzle-orm';
import { seedMaterialsForTenant, ensureMaterialsForTenant } from './seed-materials';
import { seedTemplatesForTenant, ensureTemplatesForTenant } from './seed-templates';
import { log } from '../utils/logger';

const DEFAULT_ADMIN_EMAIL = 'admin@propackhub.com';
const DEFAULT_ADMIN_PASSWORD = 'Pph654883!';
const DEFAULT_ADMIN_NAME = 'Admin';
const DEFAULT_TENANT_NAME = 'ProPackHub';
const DEFAULT_CURRENCY = 'USD';

/**
 * Ensure the default admin user exists.
 * Called on server startup — idempotent (skips if admin already exists).
 * Creates tenant + user + seeds materials + templates on first boot.
 */
export async function seedDefaultAdmin(): Promise<void> {
  const db = getDatabase();

  try {
    // Check if admin already exists
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, DEFAULT_ADMIN_EMAIL))
      .limit(1);

    if (existing.length > 0) {
      const [admin] = await db
        .select({ id: schema.users.id, tenantId: schema.users.tenantId, role: schema.users.role })
        .from(schema.users)
        .where(eq(schema.users.email, DEFAULT_ADMIN_EMAIL))
        .limit(1);

      if (admin && admin.role !== 'platform_admin') {
        await db
          .update(schema.users)
          .set({ role: 'platform_admin', updatedAt: new Date() })
          .where(eq(schema.users.id, admin.id));
        log.info({ email: DEFAULT_ADMIN_EMAIL }, 'Promoted user to platform_admin');
      }

      if (admin) {
        try {
          const matsAdded = await ensureMaterialsForTenant(admin.tenantId);
          if (matsAdded > 0) {
            log.info({ count: matsAdded, tenantId: admin.tenantId }, 'Backfilled materials for default admin tenant');
          }
        } catch (seedErr) {
          log.error({ err: seedErr }, 'Failed to backfill materials for default admin');
        }
        try {
          const added = await ensureTemplatesForTenant(admin.tenantId);
          if (added > 0) {
            log.info({ count: added, tenantId: admin.tenantId }, 'Backfilled structure templates for default admin tenant');
          }
        } catch (seedErr) {
          log.error({ err: seedErr }, 'Failed to backfill templates for default admin');
        }
      }

      log.info({ email: DEFAULT_ADMIN_EMAIL }, 'Default admin already exists');
      return;
    }

    log.info({ email: DEFAULT_ADMIN_EMAIL }, 'Creating default admin user');

    // Create tenant
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
      log.error('Failed to create default admin tenant');
      return;
    }

    // Hash password and create admin user
    const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);

    const [user] = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash,
        displayName: DEFAULT_ADMIN_NAME,
        role: 'platform_admin',
      })
      .returning();

    if (!user) {
      log.error('Failed to create default admin user');
      return;
    }

    // Seed master materials for the tenant
    try {
      const materialCount = await seedMaterialsForTenant(tenant.id);
      log.info({ count: materialCount, tenantId: tenant.id }, 'Seeded materials for default admin');
    } catch (seedErr) {
      log.error({ err: seedErr }, 'Failed to seed materials for default admin');
    }

    // Seed structure templates for the tenant
    try {
      const templateCount = await seedTemplatesForTenant(tenant.id);
      log.info({ count: templateCount, tenantId: tenant.id }, 'Seeded structure templates for default admin');
    } catch (seedErr) {
      log.error({ err: seedErr }, 'Failed to seed templates for default admin');
    }

    log.info(
      { email: DEFAULT_ADMIN_EMAIL, tenantId: tenant.id, tenantName: DEFAULT_TENANT_NAME, role: 'platform_admin' },
      'Default admin created'
    );
  } catch (error) {
    log.error({ err: error }, 'Failed to seed default admin');
    // Don't throw — server should still start even if admin seeding fails
  }
}
