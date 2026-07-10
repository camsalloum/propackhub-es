import { eq, isNull, and, or, gt } from 'drizzle-orm';
import { getDatabase, schema } from './index';
import {
  generateServiceKeyPlain,
  hashServiceKey,
  parseServiceKeyScopes,
  serviceKeyHasScope,
} from '../utils/service-key';
import { resolveJwtSecret } from '../utils/jwt-secret';

function pepper(): string {
  return resolveJwtSecret();
}

export type ServiceKeyListItem = {
  id: string;
  label: string;
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
};

export async function createPlatformServiceKey(input: {
  label: string;
  scopes?: string[];
  expiresAt?: Date | null;
}): Promise<{ key: ServiceKeyListItem; plainKey: string }> {
  const db = getDatabase();
  const plainKey = generateServiceKeyPlain();
  const keyHash = hashServiceKey(plainKey, pepper());
  const scopes = input.scopes?.length ? input.scopes : ['master_data:read'];

  const [row] = await db
    .insert(schema.platformServiceKeys)
    .values({
      keyHash,
      label: input.label.trim(),
      scopes,
      expiresAt: input.expiresAt ?? null,
    })
    .returning();

  return {
    plainKey,
    key: toListItem(row),
  };
}

export async function listPlatformServiceKeys(): Promise<ServiceKeyListItem[]> {
  const db = getDatabase();
  const rows = await db.select().from(schema.platformServiceKeys);
  return rows.map(toListItem);
}

export async function revokePlatformServiceKey(id: string): Promise<boolean> {
  const db = getDatabase();
  const [row] = await db
    .update(schema.platformServiceKeys)
    .set({ revokedAt: new Date() })
    .where(eq(schema.platformServiceKeys.id, id))
    .returning();
  return !!row;
}

export type VerifiedServiceKey = {
  keyId: string;
  label: string;
  scopes: string[];
};

export async function verifyPlatformServiceKey(
  plainKey: string,
  requiredScope: string
): Promise<VerifiedServiceKey | null> {
  if (!plainKey.startsWith('es_sk_')) return null;

  const db = getDatabase();
  const keyHash = hashServiceKey(plainKey, pepper());
  const now = new Date();

  const [row] = await db
    .select()
    .from(schema.platformServiceKeys)
    .where(
      and(
        eq(schema.platformServiceKeys.keyHash, keyHash),
        isNull(schema.platformServiceKeys.revokedAt),
        or(
          isNull(schema.platformServiceKeys.expiresAt),
          gt(schema.platformServiceKeys.expiresAt, now)
        )
      )
    )
    .limit(1);

  if (!row) return null;

  const scopes = parseServiceKeyScopes(row.scopes);
  if (!serviceKeyHasScope(scopes, requiredScope)) return null;

  await db
    .update(schema.platformServiceKeys)
    .set({ lastUsedAt: now })
    .where(eq(schema.platformServiceKeys.id, row.id));

  return { keyId: row.id, label: row.label, scopes };
}

function toListItem(row: typeof schema.platformServiceKeys.$inferSelect): ServiceKeyListItem {
  return {
    id: row.id,
    label: row.label,
    scopes: parseServiceKeyScopes(row.scopes),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}
