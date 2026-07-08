import type { FastifyRequest } from 'fastify';

export type PebiIntegrationContext = {
  companyCode: string;
};

export function verifyPebiIntegrationRequest(
  request: FastifyRequest
): PebiIntegrationContext | null {
  const expected = process.env.PEBI_ES_INTEGRATION_SECRET?.trim();
  const provided = request.headers['x-pph-integration-key'];
  if (!expected || typeof provided !== 'string' || provided !== expected) {
    return null;
  }

  const companyCode = String(request.headers['x-pph-company-code'] || 'interplast')
    .trim()
    .toLowerCase();

  return { companyCode };
}
