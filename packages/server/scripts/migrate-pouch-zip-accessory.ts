import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { initializeDatabase } from '../src/db';
import { syncPlatformMasterToAllTenants } from '../src/db/platform-master-data';

/**
 * Migration: pouch zipper becomes an ACCESSORY (not a subtype).
 *
 * 1. Seeds generic platform accessory materials (zipper / spout / valve) with
 *    PLACEHOLDER rates — tenants are expected to override these in Raw Materials.
 * 2. Deactivates the legacy `*_zip` pouch product subtypes so they leave the picker.
 * 3. Migrates existing estimates on a `_zip` subtype to the base subtype and writes
 *    a zipper accessory into dimensions JSONB so cost/weight now reflect the zip.
 * 4. Bumps the master-data version so clients refetch.
 *
 * Idempotent — safe to run multiple times.
 */
const ZIP_MAP: Record<string, string> = {
  pouch_3_side_seal_zip: 'pouch_3_side_seal',
  pouch_stand_up_zip: 'pouch_stand_up',
  pouch_kseal_stand_up_zip: 'pouch_kseal_stand_up',
};

// Generic accessory seeds. Rates are PLACEHOLDERS — override per tenant.
const ACCESSORY_SEEDS = [
  { key: 'acc-zipper-generic', name: 'Zipper tape (generic)', kind: 'zipper', perMeter: 0.05, gPerMeter: 3.0 },
  { key: 'acc-spout-generic', name: 'Spout + cap (generic)', kind: 'spout', perPiece: 0.04, gPerPiece: 2.5 },
  { key: 'acc-valve-generic', name: 'Degassing valve (generic)', kind: 'valve', perPiece: 0.03, gPerPiece: 0.8 },
];

(async () => {
  const db = await initializeDatabase();

  // 1. Seed platform accessory materials (insert if missing).
  for (const a of ACCESSORY_SEEDS) {
    await db.execute(sql`
      INSERT INTO platform_master_materials
        (key, name, type, solid_percent, density, cost_per_kg_usd, waste_percent, is_solvent_based,
         accessory_kind, cost_per_meter_usd, cost_per_piece_usd, weight_g_per_meter, weight_g_per_piece, sort_order, active)
      SELECT ${a.key}, ${a.name}, 'accessory', 100, 1, 0, 0, false,
             ${a.kind},
             ${a.perMeter ?? null}, ${a.perPiece ?? null}, ${a.gPerMeter ?? null}, ${a.gPerPiece ?? null},
             0, true
      WHERE NOT EXISTS (SELECT 1 FROM platform_master_materials WHERE key = ${a.key})
    `);
  }

  // 2. Deactivate legacy _zip subtypes in the picker.
  await db.execute(sql`
    UPDATE platform_reference_items
    SET active = false, updated_at = now()
    WHERE category = 'product_subtype'
      AND active = true
      AND lower(code) IN ('pouch_3_side_seal_zip','pouch_stand_up_zip','pouch_kseal_stand_up_zip')
  `);

  // 3. Migrate estimates: base subtype + zipper accessory in dimensions.
  for (const [zip, base] of Object.entries(ZIP_MAP)) {
    await db.execute(sql`
      UPDATE estimates
      SET product_subtype = ${base},
          dimensions = jsonb_set(
            coalesce(dimensions, '{}'::jsonb),
            '{accessories}',
            '[{"kind":"zipper","enabled":true}]'::jsonb,
            true
          ),
          updated_at = now()
      WHERE product_subtype = ${zip}
    `);
    await db.execute(sql`
      UPDATE structure_templates SET product_subtype = ${base}, updated_at = now()
      WHERE product_subtype = ${zip}
    `);
  }

  // 4. Bump master-data version so clients refetch the subtype + material lists.
  await db.execute(sql`
    UPDATE platform_master_state
    SET master_data_version = master_data_version + 1, updated_at = now()
  `);

  // 5. Push the seeded accessory materials into every tenant's library (upsert only).
  const sync = await syncPlatformMasterToAllTenants({ pruneOrphans: false });
  console.log(
    `Synced accessories to ${sync.tenantsSynced} tenant(s): ${sync.inserted} inserted, ${sync.updated} updated.`
  );

  console.log('Pouch zipper→accessory migration complete (seeds + subtype deactivation + estimate migration + tenant sync).');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
