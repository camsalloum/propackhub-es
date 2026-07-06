/**
 * Shared gate for integration tests that need Postgres.
 * Prints a loud banner when skipped so `npm test` without DATABASE_URL
 * is not mistaken for a full green pass (audit 4.4).
 *
 * Integration tests must use a dedicated *_test database (CI: estimation_studio_test).
 * Never run them against the dev `estimation_studio` DB — they leave templates, tenants,
 * and users behind (e.g. "APT Custom Standard <timestamp>").
 */
export function databaseUrl(): string {
  return (process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? '').trim();
}

export const hasDatabase = Boolean(databaseUrl());

/**
 * True when DATABASE_URL points at a dedicated test database, or when explicitly opted in.
 * CI uses `estimation_studio_test`; local dev should mirror that.
 */
export function isDedicatedIntegrationTestDatabase(url = databaseUrl()): boolean {
  if (!url) return false;
  if (process.env.ES_INTEGRATION_TESTS_ALLOW_ANY_DB === '1') return true;

  const match = url.match(/\/([^/?]+)(?:\?|$)/);
  const dbName = match?.[1] ?? '';
  return /_test$/i.test(dbName) || /^test$/i.test(dbName);
}

export const hasIntegrationDatabase = hasDatabase && isDedicatedIntegrationTestDatabase();

const underVitest = Boolean(process.env.VITEST);

if (underVitest && !hasDatabase) {
  // eslint-disable-next-line no-console
  console.warn(
    '\n' +
      '════════════════════════════════════════════════════════════════\n' +
      '  INTEGRATION TESTS SKIPPED — DATABASE_URL is not set.\n' +
      '  CI runs these with a Postgres service container.\n' +
      '  Locally: set DATABASE_URL to a *_test database, then\n' +
      '  re-run: npm test --workspace=packages/server\n' +
      '════════════════════════════════════════════════════════════════\n'
  );
} else if (underVitest && !hasIntegrationDatabase) {
  // eslint-disable-next-line no-console
  console.warn(
    '\n' +
      '════════════════════════════════════════════════════════════════\n' +
      '  INTEGRATION TESTS SKIPPED — DATABASE_URL is not a test database.\n' +
      '  Use estimation_studio_test (or any DB ending in _test).\n' +
      '  Running integration tests against dev pollutes templates/tenants.\n' +
      '  Override only if you mean it: ES_INTEGRATION_TESTS_ALLOW_ANY_DB=1\n' +
      '════════════════════════════════════════════════════════════════\n'
  );
}
