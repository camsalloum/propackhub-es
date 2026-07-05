/**
 * Quote commercial audit logging — status / sent_at / valid_until transitions.
 * Uses activity_logs (same pattern as estimate status_change).
 */

import { and, desc, eq, like, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { log as appLog } from './logger';

type Db = NodePgDatabase<typeof schema>;

export type QuoteAuditFields = {
  status?: string | null;
  sentAt?: Date | string | null;
  validUntil?: Date | string | null;
};

function serializeField(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Logs quote commercial field changes when status, sentAt, or validUntil differ.
 */
export async function logQuoteStatusTransition(
  db: Db,
  input: {
    tenantId: string;
    userId: string;
    quoteId: string;
    before: QuoteAuditFields;
    after: QuoteAuditFields;
  }
) {
  const changes: Record<string, { from: string | null; to: string | null }> = {};
  const keys: (keyof QuoteAuditFields)[] = ['status', 'sentAt', 'validUntil'];

  for (const key of keys) {
    const from = serializeField(input.before[key]);
    const to = serializeField(input.after[key]);
    if (from !== to) {
      changes[key] = { from, to };
    }
  }

  if (Object.keys(changes).length === 0) return null;

  try {
    const [inserted] = await db
      .insert(schema.activityLogs)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        action: 'status_change',
        entityType: 'quote',
        entityId: input.quoteId,
        changes: {
          ...changes,
          timestamp: new Date().toISOString(),
        },
      })
      .returning();
    return inserted;
  } catch (error) {
    appLog.warn({ err: error, quoteId: input.quoteId }, 'Failed to log quote status transition');
    return null;
  }
}

export async function getQuoteAuditTrail(db: Db, quoteId: string, tenantId: string) {
  return db
    .select()
    .from(schema.activityLogs)
    .where(
      and(
        eq(schema.activityLogs.entityType, 'quote'),
        eq(schema.activityLogs.entityId, quoteId),
        eq(schema.activityLogs.tenantId, tenantId),
        or(
          like(schema.activityLogs.action, 'quote_%'),
          eq(schema.activityLogs.action, 'status_change')
        )
      )
    )
    .orderBy(desc(schema.activityLogs.createdAt));
}
