import { getDatabase, schema } from '../db';

/**
 * Atomically record a consumed SSO JTI. No returned row = replay → reject.
 */
export async function consumeSsoJti(jti: string, expiresAtMs: number): Promise<void> {
  const db = getDatabase();
  const [row] = await db
    .insert(schema.ssoTokenUses)
    .values({
      jti,
      expiresAt: new Date(expiresAtMs),
    })
    .onConflictDoNothing()
    .returning({ jti: schema.ssoTokenUses.jti });

  if (!row) {
    throw new Error('token already used');
  }
}
