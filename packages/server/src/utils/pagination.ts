/**
 * Shared pagination utilities.
 *
 * Contract:  GET /resource?limit=50&offset=0
 * Response:  { items: T[], total: number, limit: number, offset: number }
 *
 * Defaults: limit=50, offset=0. Max limit=200.
 * Backward compat: if no params supplied, returns first 50 (not full table).
 */

export interface PaginationQuery {
  limit?: string | number;
  offset?: string | number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Parse + clamp pagination params from query string. */
export function parsePagination(query: PaginationQuery): { limit: number; offset: number } {
  const limit = Math.min(Math.max(1, parseInt(String(query.limit ?? '50'), 10) || 50), 1000);
  const offset = Math.max(0, parseInt(String(query.offset ?? '0'), 10) || 0);
  return { limit, offset };
}

/** Wrap an array result in the standard pagination envelope. */
export function paginate<T>(items: T[], total: number, limit: number, offset: number): PaginatedResult<T> {
  return { items, total, limit, offset };
}
