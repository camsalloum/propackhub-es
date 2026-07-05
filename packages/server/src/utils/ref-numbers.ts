import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '../db';
import { schema } from '../db';

/** BUG-11: year-bucketed estimate ref QT-YYYY-NNNNN with collision retry. */
export async function generateRefNumber(db: Database, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = await db
      .select({ count: sql`COUNT(*)` })
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.tenantId, tenantId),
          isNull(schema.estimates.deletedAt),
          sql`EXTRACT(YEAR FROM ${schema.estimates.createdAt}) = ${year}`
        )
      );

    const count = Number(result[0]?.count ?? 0);
    const candidate = `QT-${year}-${String(count + 1 + attempt).padStart(5, '0')}`;

    const clash = await db
      .select({ id: schema.estimates.id })
      .from(schema.estimates)
      .where(
        and(eq(schema.estimates.tenantId, tenantId), eq(schema.estimates.refNumber, candidate))
      )
      .limit(1);

    if (clash.length === 0) return candidate;
  }
  return `QT-${year}-${Date.now().toString().slice(-5)}`;
}
