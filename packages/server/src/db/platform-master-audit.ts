import { asc, gt } from 'drizzle-orm';
import { getDatabase, schema } from './index';

export type AuditActorType = 'user' | 'service_key' | 'system';
export type MasterAuditAction = 'create' | 'update' | 'delete';

export type AuditActor = {
  type: AuditActorType;
  id?: string;
};

export type AppendMasterAuditInput = {
  masterDataVersion: number;
  entityType: 'material' | 'reference_item' | 'platform_master_state';
  entityKey: string;
  action: MasterAuditAction;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  actor?: AuditActor;
};

export function materialAuditSnapshot(row: {
  key: string;
  name: string;
  type: string;
  solidPercent: number;
  density: string | number;
  costPerKgUsd: string | number;
  wastePercent: number;
  isSolventBased: boolean;
  substrateFamily?: string | null;
  substrateGrade?: string | null;
  hoover?: string | null;
  marketPriceUsd?: string | number | null;
  costingKey?: string | null;
  active?: boolean;
  externalId?: string | null;
  externalSource?: string | null;
}): Record<string, unknown> {
  return {
    key: row.key,
    name: row.name,
    type: row.type,
    solidPercent: row.solidPercent,
    density: Number(row.density),
    costPerKgUsd: Number(row.costPerKgUsd),
    wastePercent: row.wastePercent,
    isSolventBased: row.isSolventBased,
    substrateFamily: row.substrateFamily ?? null,
    substrateGrade: row.substrateGrade ?? null,
    hoover: row.hoover ?? null,
    marketPriceUsd: row.marketPriceUsd != null ? Number(row.marketPriceUsd) : null,
    costingKey: row.costingKey ?? null,
    active: row.active ?? true,
    externalId: row.externalId ?? null,
    externalSource: row.externalSource ?? null,
  };
}

export function referenceItemAuditSnapshot(row: {
  category: string;
  label: string;
  code?: string | null;
  metadata?: unknown;
  active?: boolean;
}): Record<string, unknown> {
  return {
    category: row.category,
    label: row.label,
    code: row.code ?? null,
    metadata: row.metadata ?? null,
    active: row.active ?? true,
  };
}

export function referenceEntityKey(category: string, label: string, code?: string | null): string {
  const slug = (code?.trim() || label.trim()).toLowerCase();
  return `${category}:${slug}`;
}

export async function appendMasterAuditEntry(input: AppendMasterAuditInput): Promise<void> {
  const db = getDatabase();
  await db.insert(schema.platformMasterAuditLog).values({
    masterDataVersion: input.masterDataVersion,
    entityType: input.entityType,
    entityKey: input.entityKey,
    action: input.action,
    beforeJson: input.beforeJson ?? null,
    afterJson: input.afterJson ?? null,
    actorType: input.actor?.type ?? 'system',
    actorId: input.actor?.id ?? null,
  });
}

export async function appendMasterAuditEntries(
  version: number,
  entries: Omit<AppendMasterAuditInput, 'masterDataVersion'>[],
  actor?: AuditActor
): Promise<void> {
  for (const entry of entries) {
    await appendMasterAuditEntry({ ...entry, masterDataVersion: version, actor });
  }
}

export type MasterDataChangeRow = {
  version: number;
  entityType: string;
  entityKey: string;
  action: string;
  changedAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actorType: string | null;
  actorId: string | null;
};

export async function listMasterDataChangesSince(sinceVersion: number): Promise<MasterDataChangeRow[]> {
  const db = getDatabase();
  const rows = await db
    .select()
    .from(schema.platformMasterAuditLog)
    .where(gt(schema.platformMasterAuditLog.masterDataVersion, sinceVersion))
    .orderBy(
      asc(schema.platformMasterAuditLog.masterDataVersion),
      asc(schema.platformMasterAuditLog.createdAt)
    );

  return rows.map((r: (typeof rows)[number]) => ({
    version: r.masterDataVersion,
    entityType: r.entityType,
    entityKey: r.entityKey,
    action: r.action,
    changedAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    before: (r.beforeJson as Record<string, unknown> | null) ?? null,
    after: (r.afterJson as Record<string, unknown> | null) ?? null,
    actorType: r.actorType,
    actorId: r.actorId,
  }));
}
