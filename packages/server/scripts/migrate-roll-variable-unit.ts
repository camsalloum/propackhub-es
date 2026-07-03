import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { initializeDatabase } from '../src/db';

/**
 * Migration: convert the fixed "Roll 500 LM" unit into a variable-length roll unit.
 *
 * Previously `roll_500_lm` always meant "1 roll = 500 linear metres" (fixed
 * multiplier). Going forward the user enters the roll's actual length (LM) on
 * the estimate itself; the stored `multiplier` (500) becomes only the fallback
 * default used until a length is entered (see resolveOrderUnitDef()).
 *
 * This updates:
 *  - the platform default row (platform_reference_items, category='unit')
 *  - any tenant overrides of the same unit (tenant_reference_items)
 *
 * Idempotent — safe to run multiple times.
 */
(async () => {
  const db = await initializeDatabase();

  const platformUpdate = await db.execute(
    sql`UPDATE platform_reference_items
        SET label = 'Roll (custom length)',
            metadata = COALESCE(metadata, '{}'::jsonb) || '{"variableMultiplier": true}'::jsonb,
            updated_at = now()
        WHERE category = 'unit'
          AND lower(code) = 'roll_500_lm'
          AND COALESCE((metadata->>'variableMultiplier')::boolean, false) = false`
  );

  const tenantUpdate = await db.execute(
    sql`UPDATE tenant_reference_items
        SET label = 'Roll (custom length)',
            metadata = COALESCE(metadata, '{}'::jsonb) || '{"variableMultiplier": true}'::jsonb,
            updated_at = now()
        WHERE category = 'unit'
          AND lower(code) = 'roll_500_lm'
          AND COALESCE((metadata->>'variableMultiplier')::boolean, false) = false`
  );

  // Bump master-data version so clients refetch the unit list instead of caching the old one.
  await db.execute(
    sql`UPDATE platform_master_state
        SET master_data_version = master_data_version + 1, updated_at = now()`
  );

  const platformCount = (platformUpdate as { rowCount?: number }).rowCount ?? 0;
  const tenantCount = (tenantUpdate as { rowCount?: number }).rowCount ?? 0;

  console.log(
    `Roll variable-unit migration done. Platform rows updated: ${platformCount}; tenant rows updated: ${tenantCount}; master-data version bumped`
  );
  process.exit(0);
})().catch((err) => {
  console.error('Roll variable-unit migration failed:', err);
  process.exit(1);
});
