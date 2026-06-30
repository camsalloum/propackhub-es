import { FastifyReply, FastifyRequest } from 'fastify';
import { extractUserFromRequest } from './auth';
import { verifyPlatformServiceKey } from '../db/platform-service-keys';
import type { AuditActor } from '../db/platform-master-audit';

export type MasterDataReaderAuth =
  | { kind: 'user'; userId: string; role: string }
  | { kind: 'service_key'; keyId: string; label: string };

export function toAuditActor(auth: MasterDataReaderAuth): AuditActor {
  if (auth.kind === 'service_key') {
    return { type: 'service_key', id: auth.keyId };
  }
  return { type: 'user', id: auth.userId };
}

/**
 * Accept platform_admin JWT or X-ES-Service-Key with master_data:read scope.
 */
export async function authenticateMasterDataReader(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<MasterDataReaderAuth | null> {
  const header = request.headers['x-es-service-key'];
  const serviceKey = typeof header === 'string' ? header.trim() : '';

  if (serviceKey) {
    const verified = await verifyPlatformServiceKey(serviceKey, 'master_data:read');
    if (!verified) {
      reply.status(401).send({ error: 'Invalid or expired service key' });
      return null;
    }
    return { kind: 'service_key', keyId: verified.keyId, label: verified.label };
  }

  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    if (user.role !== 'platform_admin') {
      reply.status(403).send({ error: 'Platform admin only' });
      return null;
    }
    return { kind: 'user', userId: user.userId, role: user.role };
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }
}
