import { getDatabase, schema } from './index';
import { hashPassword } from '../utils/auth';
import { eq } from 'drizzle-orm';
import { seedMaterialsForTenant, ensureMaterialsForTenant } from './seed-materials';
import { seedTemplatesForTenant, ensureTemplatesForTenant } from './seed-templates';

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
        .select({ tenantId: schema.users.tenantId })
        .from(schema.users)
        .where(eq(schema.users.email, DEFAULT_ADMIN_EMAIL))
        .limit(1);

      if (admin) {
        try {
          const matsAdded = await ensureMaterialsForTenant(admin.tenantId);
          if (matsAdded > 0) {
            console.log(`✓ Backfilled ${matsAdded} materials for default admin tenant`);
          }
        } catch (seedErr) {
          console.error('Failed to backfill materials for default admin:', seedErr);
        }
        try {
          const added = await ensureTemplatesForTenant(admin.tenantId);
          if (added > 0) {
            console.log(`✓ Backfilled ${added} structure templates for default admin tenant`);
          }
        } catch (seedErr) {
          console.error('Failed to backfill templates for default admin:', seedErr);
        }
      }

      console.log(`✓ Default admin already exists (${DEFAULT_ADMIN_EMAIL})`);
      return;
    }

    console.log(`Creating default admin user (${DEFAULT_ADMIN_EMAIL})...`);

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
      console.error('✗ Failed to create default admin tenant');
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
        role: 'tenant_admin',
      })
      .returning();

    if (!user) {
      console.error('✗ Failed to create default admin user');
      return;
    }

    // Seed master materials for the tenant
    try {
      const materialCount = await seedMaterialsForTenant(tenant.id);
      console.log(`✓ Seeded ${materialCount} materials for default admin`);
    } catch (seedErr) {
      console.error('Failed to seed materials for default admin:', seedErr);
    }

    // Seed structure templates for the tenant
    try {
      const templateCount = await seedTemplatesForTenant(tenant.id);
      console.log(`✓ Seeded ${templateCount} structure templates for default admin`);
    } catch (seedErr) {
      console.error('Failed to seed templates for default admin:', seedErr);
    }

    console.log(`✓ Default admin created: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
    console.log(`  Tenant: ${DEFAULT_TENANT_NAME} (${tenant.id})`);
    console.log(`  Role: tenant_admin`);
  } catch (error) {
    console.error('✗ Failed to seed default admin:', error);
    // Don't throw — server should still start even if admin seeding fails
  }
}
