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
