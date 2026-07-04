/**
 * Process-level logger for startup / non-request code.
 *
 * Conventions:
 *   - Route handlers: `request.log` (includes Fastify reqId)
 *   - sendCaughtError: uses `reply.request.log` automatically
 *   - Boot, seeds, services, utils: this `log` instance
 *   - CLI scripts under `src/scripts/`: console is fine (human-facing)
 *
 * Levels: LOG_LEVEL env (default `info`). Use `{ err }` for errors (pino serializer).
 */
import pino from 'pino';

export const log = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'es-api' },
});
