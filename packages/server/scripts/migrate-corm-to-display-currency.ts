/**
 * One-shot: restore CoRM values that were saved under the old display→USD path.
 * Platform admin enters CoRM in display currency; a brief bug stored USD.
 * Multiply non-null platform CoRM by the platform-admin tenant FX, then mirror
 * to all tenant structure_templates copies.
 *
 * Safe to re-run only if values are still the pre-migration USD figures.
 * Usage: npx tsx scripts/migrate-corm-to-display-currency.ts
 */
import 'dotenv/config';
import { eq, isNotNull } from 'drizzle-orm';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../src/db/index.js';

async function main() {
  await initializeDatabase();
  const db = getDatabase();

  const [admin] = await db
    .select({ tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.email, 'admin@propackhub.com'))
    .limit(1);

  if (!admin) {
    console.error('platform admin not found');
    process.exit(1);
  }

  const [tenant] = await db
    .select({
      fx: schema.tenants.exchangeRateUsdToDisplay,
      cur: schema.tenants.displayCurrency,
    })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, admin.tenantId))
    .limit(1);

  const fx = parseFloat(tenant?.fx ?? '1') || 1;
  console.log(`Using platform-admin FX: 1 USD = ${fx} ${tenant?.cur ?? '?'}`);

  if (fx <= 1) {
    console.log('FX is 1 (USD tenant) — no CoRM restore needed');
    await closeDatabase();
    return;
  }

  const platformRows = await db
    .select({
      id: schema.platformStandardTemplates.id,
      key: schema.platformStandardTemplates.templateKey,
      corm: schema.platformStandardTemplates.cormPerKgUsd,
    })
    .from(schema.platformStandardTemplates)
    .where(isNotNull(schema.platformStandardTemplates.cormPerKgUsd));

  let platformUpdated = 0;
  for (const row of platformRows) {
    const usd = parseFloat(row.corm ?? '');
    if (!Number.isFinite(usd) || usd <= 0) continue;
    // Heuristic: values < 1 with FX>3 were almost certainly USD-converted (e.g. 1.5 AED → 0.41).
    // Skip if already looks like display currency (>= 1).
    if (usd >= 1) {
      console.log(`  skip ${row.key}: ${usd} already looks like display currency`);
      continue;
    }
    const display = (usd * fx).toFixed(4);
    await db
      .update(schema.platformStandardTemplates)
      .set({ cormPerKgUsd: display, updatedAt: new Date() })
      .where(eq(schema.platformStandardTemplates.id, row.id));
    console.log(`  ${row.key}: ${usd} → ${display} ${tenant?.cur}`);
    platformUpdated++;
  }

  // Mirror platform values to every tenant copy of the same templateKey.
  const platformAfter = await db
    .select({
      key: schema.platformStandardTemplates.templateKey,
      corm: schema.platformStandardTemplates.cormPerKgUsd,
    })
    .from(schema.platformStandardTemplates)
    .where(isNotNull(schema.platformStandardTemplates.cormPerKgUsd));

  let tenantUpdated = 0;
  for (const p of platformAfter) {
    const result = await db
      .update(schema.structureTemplates)
      .set({ cormPerKgUsd: p.corm, updatedAt: new Date() })
      .where(eq(schema.structureTemplates.templateKey, p.key!));
    tenantUpdated += result.rowCount ?? 0;
  }

  // Estimates that snapshotted the old USD CoRM — restore using each estimate's FX.
  const estimates = await db
    .select({
      id: schema.estimates.id,
      corm: schema.estimates.cormPerKgUsd,
      fx: schema.estimates.exchangeRateUsdToDisplay,
    })
    .from(schema.estimates)
    .where(isNotNull(schema.estimates.cormPerKgUsd));

  let estimatesUpdated = 0;
  for (const e of estimates) {
    const usd = parseFloat(e.corm ?? '');
    const eFx = parseFloat(e.fx ?? '1') || 1;
    if (!Number.isFinite(usd) || usd <= 0 || eFx <= 1 || usd >= 1) continue;
    const display = (usd * eFx).toFixed(4);
    await db
      .update(schema.estimates)
      .set({ cormPerKgUsd: display, updatedAt: new Date() })
      .where(eq(schema.estimates.id, e.id));
    estimatesUpdated++;
  }

  console.log(
    `Done. Platform templates: ${platformUpdated}; tenant copies mirrored; estimates: ${estimatesUpdated}`
  );
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
