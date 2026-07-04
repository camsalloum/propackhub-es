/**
 * Estimate State Audit Logging Service
 *
 * Logs fork/customize/snap-back transitions with before/after state snapshots.
 * Uses the existing activity_logs table with structured JSON in the changes field.
 */

import { and, desc, eq, like, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { StateTransition, buildStateSnapshot } from './state-validation';

type Db = NodePgDatabase<typeof schema>;

export interface EstimateAuditLog {
  tenantId: string;
  userId: string;
  estimateId: string;
  action: StateTransition; // 'fork', 'customize', 'snap_back'
  stateBefore: ReturnType<typeof buildStateSnapshot>;
  stateAfter: ReturnType<typeof buildStateSnapshot>;
  signature?: string | null;
}

/**
 * Logs an estimate state transition to the activity_logs table.
 */
export async function logEstimateStateTransition(db: Db, log: EstimateAuditLog) {
  if (log.action === 'none') {
    return null;
  }

  try {
    const [inserted] = await db
      .insert(schema.activityLogs)
      .values({
        tenantId: log.tenantId,
        userId: log.userId,
        action: `estimate_${log.action}`,
        entityType: 'estimate',
        entityId: log.estimateId,
        changes: {
          transition: log.action,
          stateBefore: log.stateBefore,
          stateAfter: log.stateAfter,
          signature: log.signature,
          timestamp: new Date().toISOString(),
        },
      })
      .returning();

    return inserted;
  } catch (error) {
    console.warn('Failed to log estimate state transition:', error);
    return null;
  }
}

/**
 * Retrieves audit trail for an estimate (all state transitions).
 */
export async function getEstimateAuditTrail(db: Db, estimateId: string, tenantId: string) {
  return db
    .select()
    .from(schema.activityLogs)
    .where(
      and(
        eq(schema.activityLogs.entityType, 'estimate'),
        eq(schema.activityLogs.entityId, estimateId),
        eq(schema.activityLogs.tenantId, tenantId),
        or(
          like(schema.activityLogs.action, 'estimate_%'),
          eq(schema.activityLogs.action, 'status_change')
        )
      )
    )
    .orderBy(desc(schema.activityLogs.createdAt));
}
