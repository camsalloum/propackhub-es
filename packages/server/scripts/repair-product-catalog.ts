import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { initializeDatabase } from '../src/db';

/** Premade pouch v4 subtypes + bags. Idempotent insert. */
const SUBTYPES: Array<[string, string, string, string | null]> = [
  ['Three-Side-Seal — Flat', 'pouch_tss_flat', 'pouch', 'Three-Side-Seal'],
  ['Three-Side-Seal — Standing (Doyen)', 'pouch_tss_standing', 'pouch', 'Three-Side-Seal'],
  ['Three-Side-Seal — Standing (K-Seal)', 'pouch_tss_standing_kseal', 'pouch', 'Three-Side-Seal'],
  ['Center-Fold-Seal — Flat (Quad)', 'pouch_cfs_flat', 'pouch', 'Center-Fold-Seal'],
  ['Center-Fold-Seal — Side Gusset', 'pouch_cfs_side_gusset', 'pouch', 'Center-Fold-Seal'],
  ['Center-Fold-Seal — Standing', 'pouch_cfs_standing', 'pouch', 'Center-Fold-Seal'],
  ['Half-Fold-Fusion — Flat', 'pouch_hff_flat', 'pouch', 'Half-Fold-Fusion'],
  ['Half-Fold-Fusion — Standing', 'pouch_hff_standing', 'pouch', 'Half-Fold-Fusion'],
  ['Side-Weld — Flat', 'pouch_sw_flat', 'pouch', 'Side-Weld'],
  ['Side-Weld — Side Gusset', 'pouch_sw_side_gusset', 'pouch', 'Side-Weld'],
  ['Oblique — Trapezoid', 'pouch_osw_trapezoid', 'pouch', 'Oblique-Side-Weld'],
  ['Oblique — Triangle', 'pouch_osw_triangle', 'pouch', 'Oblique-Side-Weld'],
  ['Flat-Bottom Box — Standing', 'pouch_fbb_standing', 'pouch', 'Flat-Bottom Box'],
  ['Punch Handle', 'bag_punch_handle', 'bag', 'Commercial Bags'],
  ['Loop Handle', 'bag_loop_handle', 'bag', 'Commercial Bags'],
  ['Patch Handle', 'bag_patch_handle', 'bag', 'Commercial Bags'],
  ['Gusseted Shopping Bag', 'bag_gusseted_shopping', 'bag', 'Commercial Bags'],
  ['Industrial Bag', 'bag_industrial', 'bag', 'Industrial'],
  ['Courier Bag', 'bag_courier', 'bag', 'Other'],
  ['Diaper Bag', 'bag_diaper', 'bag', 'Other'],
  ['Wicket Bag', 'bag_wicket', 'bag', 'Other'],
];

/** Legacy pouch codes — deactivate so the picker shows v4 only; estimates still resolve via engine map. */
const LEGACY_POUCH_CODES = [
  'pouch_3_side_seal',
  'pouch_3_side_seal_zip',
  'pouch_stand_up',
  'pouch_stand_up_zip',
  'pouch_kseal_stand_up',
  'pouch_kseal_stand_up_zip',
  'pouch_center_seal',
  'pouch_gusset',
  'pouch_4_side_seal',
  'pouch_flat_bottom',
  'pouch_three_side_seal',
  'pouch_four_side_seal',
  'pouch_side_gusset',
  'pouch_doypack',
  'pouch_pillow',
  'pouch_box',
];

(async () => {
  const db = await initializeDatabase();

  await db.execute(
    sql`UPDATE platform_reference_items SET label='Pouch', updated_at=now()
        WHERE category='product_type' AND lower(code)='pouch'`
  );

  await db.execute(
    sql`INSERT INTO platform_reference_items (category, label, code, active, sort_order)
        SELECT 'product_type','Bag','bag',true,10
        WHERE NOT EXISTS (
          SELECT 1 FROM platform_reference_items
          WHERE category='product_type' AND lower(code)='bag' AND active=true
        )`
  );

  let inserted = 0;
  let sort = 0;
  for (const [label, code, parent, group] of SUBTYPES) {
    const metadata = group ? { parent, group } : { parent };
    const res = await db.execute(
      sql`INSERT INTO platform_reference_items (category, label, code, metadata, active, sort_order)
          SELECT 'product_subtype', ${label}, ${code}, ${JSON.stringify(metadata)}::jsonb, true, ${sort}
          WHERE NOT EXISTS (
            SELECT 1 FROM platform_reference_items
            WHERE category='product_subtype' AND lower(code)=${code} AND active=true
          )`
    );
    inserted += (res as { rowCount?: number }).rowCount ?? 0;
    sort += 1;
  }

  // Deactivate legacy pouch subtype rows (keep codes for old estimates).
  for (const code of LEGACY_POUCH_CODES) {
    await db.execute(
      sql`UPDATE platform_reference_items
          SET active=false, updated_at=now()
          WHERE category='product_subtype' AND lower(code)=${code} AND active=true`
    );
  }

  console.log(`Repaired product catalog (v4 pouch); inserted ${inserted} subtypes; legacy pouch codes deactivated`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
