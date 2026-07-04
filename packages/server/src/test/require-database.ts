/**
 * Shared gate for integration tests that need Postgres.
 * Prints a loud banner when skipped so `npm test` without DATABASE_URL
 * is not mistaken for a full green pass (audit 4.4).
 */
export const hasDatabase = Boolean(process.env.DATABASE_URL);

if (!hasDatabase) {
  // eslint-disable-next-line no-console
  console.warn(
    '\n' +
      '════════════════════════════════════════════════════════════════\n' +
      '  INTEGRATION TESTS SKIPPED — DATABASE_URL is not set.\n' +
      '  CI runs these with a Postgres service container.\n' +
      '  Locally: set DATABASE_URL (see packages/server/.env) then\n' +
      '  re-run: npm test --workspace=packages/server\n' +
      '════════════════════════════════════════════════════════════════\n'
  );
}
