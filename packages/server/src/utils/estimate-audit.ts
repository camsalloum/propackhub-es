/**
 * Estimate State Audit Logging Service
 * 
 * Logs fork/customize/snap-back transitions with before/after state snapshots.
 * Uses the existing activity_logs table with structured JSON in the changes field.
 */

import { Database } from 'drizzle-orm';
import * as schema from '../db/schema';
import { StateTransition, buildStateSnapshot, EstimateState } from './state-validation';

export interface EstimateAuditLog {
  tenantId: string;
  userId: string;
  estimateId: string;
  action: StateTransition; // 'fork', 'customize', 'snap_back'
  stateBefore: ReturnType<typeof buildStateSnapshot>;
  stateAfter: ReturnType<typeof buildStateSnapshot>;
  signature?: string | null; // structureSignature for reference
}

/**
 * Logs an estimate state transition to the activity_logs table.
 * 
 * @param db Database instance
 * @param log Audit log details
 * @returns The inserted activity log row
 */
export async function logEstimateStateTransition(
  db: Database<typeof schema>,
  log: EstimateAuditLog
) {
  if (log.action === 'none') {
    // Skip logging if no actual transition occurred
    return null;
  }

  try {
    const [inserted] = await db
      .insert(schema.activityLogs)
      .values({
        tenantId: log.tenantId,
        userId: log.userId,
        action: `estimate_${log.action}`, // e.g., 'estimate_fork', 'estimate_customize'
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
    // Log audit failures but don't fail the request
    console.warn('Failed to log estimate state transition:', error);
    return null;
  }
}

/**
 * Retrieves audit trail for an estimate (all state transitions).
 * Filters activity_logs for actions like estimate_fork, estimate_customize, estimate_snap_back.
 * 
 * @param db Database instance
 * @param estimateId Estimate ID
 * @param tenantId Tenant ID
 * @returns Array of audit log entries
 */
export async function getEstimateAuditTrail(
  db: Database<typeof schema>,
  estimateId: string,
  tenantId: string
) {
  const auditLogs = await db
    .select()
    .from(schema.activityLogs)
    .where(
      db
        .and(
          db.eq(schema.activityLogs.entityType, 'estimate'),
          db.eq(schema.activityLogs.entityId, estimateId),
          db.eq(schema.activityLogs.tenantId, tenantId),
          db.or(
            db.like(schema.activityLogs.action, 'estimate_%'),
            db.eq(schema.activityLogs.action, 'status_change')
          )
        )
    )
    .orderBy(db.desc(schema.activityLogs.createdAt));

  return auditLogs;
}
