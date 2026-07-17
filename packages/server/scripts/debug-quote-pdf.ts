/**
 * Reproduce quote PDF 500 for a specific quote id.
 * Usage: npx tsx packages/server/scripts/debug-quote-pdf.ts <quoteId>
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '../.env') });

async function main() {
  const quoteId = process.argv[2] || '796679a0-65de-428e-afa8-a264cafea653';
  const { initializeDatabase, closeDatabase, getDatabase, schema } = await import('../src/db');
  const { eq, and, isNull } = await import('drizzle-orm');
  await initializeDatabase();
  const db = getDatabase();

  try {
    const [quote] = await db
      .select()
      .from(schema.quotes)
      .where(and(eq(schema.quotes.id, quoteId), isNull(schema.quotes.deletedAt)));

    if (!quote) {
      console.error('Quote not found', quoteId);
      process.exit(1);
    }
    console.log('quote', quote.refNumber, 'tenant', quote.tenantId);
    console.log('prefs', JSON.stringify(quote.priceListDisplayPrefs));

    const [user] = await db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.tenantId, quote.tenantId))
      .limit(1);

    if (!user) {
      console.error('No user for tenant');
      process.exit(1);
    }
    console.log('user', user.email, user.id);

    const { buildQuoteProposalPdfBuffer } = await import('../src/services/proposal-pdf');
    const buf = await buildQuoteProposalPdfBuffer(db, quote.id, quote.tenantId, user.id);
    console.log('OK pdf bytes', buf.length);
  } catch (err) {
    console.error('FAIL', err);
    await closeDatabase();
    process.exit(1);
  }
  await closeDatabase();
  process.exit(0);
}

main();
