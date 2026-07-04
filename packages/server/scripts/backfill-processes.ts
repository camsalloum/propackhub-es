/**
 * Part B Phase 5 — backfill structure_signature (and live fork flags) on estimates.
 *
 * Live reads already recompute fork status, so this is audit-trail / column hygiene,
 * not required for correctness. Safe to re-run (idempotent updates).
 *
 * Usage: npx tsx scripts/backfill-processes.ts
 */
import 'dotenv/config';
import { eq, isNull, and } from 'drizzle-orm';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../src/db/index.js';
import {
  computeEstimateStructureSignature,
  computeTemplateStructureSignature,
  loadEstimateStructureLayers,
} from '../src/utils/estimate-processes.js';

async function main() {
  await initializeDatabase();
  const db = getDatabase();

  const estimates = await db
    .select({
      id: schema.estimates.id,
      tenantId: schema.estimates.tenantId,
      productType: schema.estimates.productType,
      sourceTemplateKey: schema.estimates.sourceTemplateKey,
      structureSignature: schema.estimates.structureSignature,
      structureForked: schema.estimates.structureForked,
      processesCustomized: schema.estimates.processesCustomized,
    })
    .from(schema.estimates)
    .where(isNull(schema.estimates.deletedAt));

  let updated = 0;
  let skipped = 0;

  for (const est of estimates) {
    const layers = await loadEstimateStructureLayers(db, est.id);
    if (layers.length === 0) {
      skipped++;
      continue;
    }

    const signature = computeEstimateStructureSignature(layers, est.productType);

    let templateSignature: string | null = null;
    if (est.sourceTemplateKey) {
      const [tpl] = await db
        .select()
        .from(schema.structureTemplates)
        .where(
          and(
            eq(schema.structureTemplates.tenantId, est.tenantId),
            eq(schema.structureTemplates.templateKey, est.sourceTemplateKey)
          )
        )
        .limit(1);
      if (tpl) {
        templateSignature = computeTemplateStructureSignature(tpl);
      }
    }

    const structureForked = templateSignature
      ? !(signature === templateSignature && !est.processesCustomized)
      : est.structureForked;

    if (
      est.structureSignature === signature &&
      est.structureForked === structureForked
    ) {
      skipped++;
      continue;
    }

    await db
      .update(schema.estimates)
      .set({
        structureSignature: signature,
        structureForked,
        updatedAt: new Date(),
      })
      .where(eq(schema.estimates.id, est.id));
    updated++;
  }

  console.log(`Backfill complete. Updated: ${updated}; unchanged/skipped: ${skipped}; total: ${estimates.length}`);
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
