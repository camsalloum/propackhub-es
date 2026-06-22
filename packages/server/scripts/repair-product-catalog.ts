import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { initializeDatabase } from '../src/db';

const SUBTYPES: Array<[string, string, string]> = [
  ['3-Side Seal', 'pouch_3_side_seal', 'pouch'],
  ['3-Side Seal + Zipper', 'pouch_3_side_seal_zip', 'pouch'],
  ['Stand-up Pouch', 'pouch_stand_up', 'pouch'],
  ['Stand-up Pouch + Zipper', 'pouch_stand_up_zip', 'pouch'],
  ['K-Seal Stand-up Pouch', 'pouch_kseal_stand_up', 'pouch'],
  ['K-Seal Stand-up Pouch + Zipper', 'pouch_kseal_stand_up_zip', 'pouch'],
  ['Center-Seal Pouch', 'pouch_center_seal', 'pouch'],
  ['Gusset Pouch', 'pouch_gusset', 'pouch'],
  ['4-Side Seal Pouch', 'pouch_4_side_seal', 'pouch'],
  ['Punch Handle', 'bag_punch_handle', 'bag'],
  ['Loop Handle', 'bag_loop_handle', 'bag'],
  ['Patch Handle', 'bag_patch_handle', 'bag'],
  ['Side-Gusset Shopping Bag', 'bag_side_gusset_shopping', 'bag'],
  ['Bottom-Gusset Shopping Bag', 'bag_bottom_gusset_shopping', 'bag'],
  ['Industrial Bag', 'bag_industrial', 'bag'],
  ['Courier Bag', 'bag_courier', 'bag'],
  ['Diaper Bag', 'bag_diaper', 'bag'],
  ['Wicket Bag', 'bag_wicket', 'bag'],
];

(async () => {
  const db = await initializeDatabase();

  // 1. Relabel the legacy "Bag" row that was given engine code 'pouch' → it becomes Pouch.
  await db.execute(
    sql`UPDATE platform_reference_items SET label='Pouch', updated_at=now()
        WHERE category='product_type' AND lower(code)='pouch'`
  );

  // 2. Ensure a distinct Bag(bag) product type exists.
  await db.execute(
    sql`INSERT INTO platform_reference_items (category, label, code, active, sort_order)
        SELECT 'product_type','Bag','bag',true,10
        WHERE NOT EXISTS (
          SELECT 1 FROM platform_reference_items
          WHERE category='product_type' AND lower(code)='bag' AND active=true
        )`
  );

  // 3. Seed subtypes (idempotent) with parent metadata.
  let inserted = 0;
  for (const [label, code, parent] of SUBTYPES) {
    const res = await db.execute(
      sql`INSERT INTO platform_reference_items (category, label, code, metadata, active, sort_order)
          SELECT 'product_subtype', ${label}, ${code}, ${JSON.stringify({ parent })}::jsonb, true, 0
          WHERE NOT EXISTS (
            SELECT 1 FROM platform_reference_items
            WHERE category='product_subtype' AND lower(code)=${code} AND active=true
          )`
    );
    inserted += (res as { rowCount?: number }).rowCount ?? 0;
  }

  console.log(`Repaired product types; inserted ${inserted} subtypes`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
