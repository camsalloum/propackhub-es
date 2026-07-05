import type { FastifyReply } from 'fastify';
import { log } from './logger';

/**
 * Standard error envelope for the ES API.
 *
 * Response shape (always):  { error: { code, message, details? } }
 *
 * Stable codes (machine-readable by mobile client):
 *   VALIDATION    — Zod / input validation failure        → 400
 *   NOT_FOUND     — Resource does not exist               → 404
 *   CONFLICT      — Duplicate / state conflict            → 409
 *   FK_IN_USE     — Cannot delete — referenced by other rows → 409
 *   AUTH_REQUIRED — No token supplied                     → 401
 *   AUTH_EXPIRED  — Token expired / invalid               → 401
 *   FORBIDDEN     — Authenticated but not authorised      → 403
 *   RATE_LIMITED  — Too many requests                     → 429
 *   INTERNAL      — Unexpected server error               → 500
 */
export type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FK_IN_USE'
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const JWT_AUTH_CODES = new Set([
  'FST_JWT_NO_AUTHORIZATION_IN_HEADER',
  'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED',
  'FST_JWT_AUTHORIZATION_TOKEN_INVALID',
  'FST_JWT_BAD_REQUEST',
  'FAST_JWT_INVALID_ALGORITHM',
  'FAST_JWT_MALFORMED',
  'FAST_JWT_INVALID_SIGNATURE',
  'FAST_JWT_EXPIRED',
]);

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/** Typed application error — caught by the central Fastify error handler. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Build the standard error response body. */
export function errorBody(
  code: ErrorCode,
  message: string,
  details?: unknown
): ErrorEnvelope {
  return { error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

/** True when the error looks like a Postgres FK violation (code 23503). */
export function isFkViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as Record<string, unknown>).code === '23503'
  );
}

/** True when the error looks like a Postgres unique violation (code 23505). */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as Record<string, unknown>).code === '23505'
  );
}

/** True when the error is a missing/invalid/expired JWT or explicit Unauthorized. */
export function isAuthError(err: unknown): boolean {
  if (err instanceof AppError) {
    return err.code === 'AUTH_REQUIRED' || err.code === 'AUTH_EXPIRED';
  }
  if (err instanceof Error && err.message === 'Unauthorized') {
    return true;
  }
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { statusCode?: number; code?: string; message?: string };
  if (e.statusCode === 401) return true;
  if (e.code && JWT_AUTH_CODES.has(e.code)) return true;
  return false;
}

function isAuthExpired(err: unknown): boolean {
  if (err instanceof AppError) return err.code === 'AUTH_EXPIRED';
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; message?: string };
  if (e.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' || e.code === 'FAST_JWT_EXPIRED') {
    return true;
  }
  return typeof e.message === 'string' && e.message.toLowerCase().includes('expired');
}

/**
 * Map a caught route error to the correct HTTP response.
 * Auth failures → 401 (not 500). AppError → its status. Everything else → 500.
 */
export function sendCaughtError(
  reply: FastifyReply,
  err: unknown,
  internalMessage: string,
  logLabel?: string
): FastifyReply {
  if (err instanceof AppError) {
    return reply.status(err.status).send(errorBody(err.code, err.message, err.details));
  }
  if (isAuthError(err)) {
    const expired = isAuthExpired(err);
    return reply.status(401).send(
      errorBody(
        expired ? 'AUTH_EXPIRED' : 'AUTH_REQUIRED',
        expired ? 'Token expired' : 'Authentication required'
      )
    );
  }
  if (isFkViolation(err)) {
    return reply.status(409).send(
      errorBody(
        'FK_IN_USE',
        'A referenced material or record no longer exists. Refresh and re-select materials.'
      )
    );
  }
  const logger = reply.request?.log ?? log;
  logger.error({ err }, logLabel ?? internalMessage);
  return reply.status(500).send({
    error: internalMessage,
    detail: err instanceof Error ? err.message : String(err),
  });
}
