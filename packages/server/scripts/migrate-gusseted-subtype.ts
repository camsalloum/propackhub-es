import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { initializeDatabase } from '../src/db';

/**
 * Migration: unify bag gusset subtypes.
 *
 * - Adds the unified `bag_gusseted_shopping` ("Gusseted Shopping Bag") product subtype
 *   (bottom / side / both / flat handled by the configurator tick-boxes + engine).
 * - Deactivates the legacy `bag_side_gusset_shopping` and `bag_bottom_gusset_shopping`
 *   rows so they drop out of the bag-type picker.
 *
 * Existing estimates that stored the legacy codes still resolve their geometry via the
 * engine/web code map (BAG_SUBTYPE_TO_CONFIGURATOR), so no estimate breaks. The legacy
 * rows are kept in the table (active=false), not deleted.
 *
 * Idempotent — safe to run multiple times.
 */
(async () => {
  const db = await initializeDatabase();

  // 1. Insert the unified gusseted subtype if it does not already exist.
  const ins = await db.execute(
    sql`INSERT INTO platform_reference_items (category, label, code, metadata, active, sort_order)
        SELECT 'product_subtype', 'Gusseted Shopping Bag', 'bag_gusseted_shopping',
               ${JSON.stringify({ parent: 'bag' })}::jsonb, true, 0
        WHERE NOT EXISTS (
          SELECT 1 FROM platform_reference_items
          WHERE category='product_subtype' AND lower(code)='bag_gusseted_shopping'
        )`
  );

  // 2. Deactivate the legacy gusset subtypes so they leave the picker.
  const deact = await db.execute(
    sql`UPDATE platform_reference_items
        SET active=false, updated_at=now()
        WHERE category='product_subtype'
          AND active=true
          AND lower(code) IN ('bag_side_gusset_shopping','bag_bottom_gusset_shopping')`
  );

  // 3. Migrate existing estimates + templates that stored the legacy gusset codes to the
  //    unified code, so their bag-type picker shows the right (active) option instead of
  //    "Select type…". Geometry is identical (same gusset values feed the unified formula).
  await db.execute(
    sql`UPDATE estimates SET product_subtype='bag_gusseted_shopping', updated_at=now()
        WHERE product_subtype IN ('bag_side_gusset_shopping','bag_bottom_gusset_shopping')`
  );
  await db.execute(
    sql`UPDATE structure_templates SET product_subtype='bag_gusseted_shopping', updated_at=now()
        WHERE product_subtype IN ('bag_side_gusset_shopping','bag_bottom_gusset_shopping')`
  );

  const insCount = (ins as { rowCount?: number }).rowCount ?? 0;
  const deactCount = (deact as { rowCount?: number }).rowCount ?? 0;

  // Bump master-data version so clients refetch the subtype list instead of caching the old one.
  await db.execute(
    sql`UPDATE platform_master_state
        SET master_data_version = master_data_version + 1, updated_at = now()`
  );

  console.log(
    `Gusseted subtype migration done. Inserted gusseted: ${insCount}; deactivated legacy: ${deactCount}; master-data version bumped`
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
