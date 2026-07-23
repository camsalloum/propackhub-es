/**
 * Go-live / staging env gate — reports missing vars without starting the API.
 *
 * Usage:
 *   npx tsx scripts/validate-go-live-env.ts
 *   npx tsx scripts/validate-go-live-env.ts --strict   # also require PEBI_* when PEBI_SYNC_ENABLED
 *
 * Exit 0 = all required present; 1 = missing/invalid.
 */
import 'dotenv/config';

type Check = { key: string; ok: boolean; detail?: string; required: boolean };

function present(key: string): boolean {
  const v = process.env[key];
  return v != null && String(v).trim() !== '';
}

function notDefaultSecret(key: string, bad: string[]): boolean {
  const v = (process.env[key] || '').trim();
  if (!v) return false;
  return !bad.some((b) => v === b || v.includes(b));
}

function main() {
  const strict = process.argv.includes('--strict');
  const productionLike =
    process.env.NODE_ENV === 'production' || process.argv.includes('--production');

  const checks: Check[] = [
    { key: 'DATABASE_URL', required: true, ok: present('DATABASE_URL') },
    {
      key: 'JWT_SECRET',
      required: true,
      ok: productionLike
        ? notDefaultSecret('JWT_SECRET', ['your-secret', 'ci-test-secret', 'change'])
        : present('JWT_SECRET'),
      detail: productionLike ? 'must not be a placeholder in production' : undefined,
    },
    { key: 'CORS_ORIGIN', required: true, ok: present('CORS_ORIGIN') },
    { key: 'ES_PUBLIC_URL', required: true, ok: present('ES_PUBLIC_URL') },
    {
      key: 'ES_SSO_SECRET',
      required: true,
      ok: productionLike
        ? notDefaultSecret('ES_SSO_SECRET', ['change_me', 'your-secret'])
        : present('ES_SSO_SECRET'),
      detail: 'must match PPH server/.env ES_SSO_SECRET',
    },
    {
      key: 'PRODUCT_LOCAL_LOGIN_ENABLED',
      required: productionLike,
      ok: !productionLike || present('PRODUCT_LOCAL_LOGIN_ENABLED'),
    },
    {
      key: 'PRODUCT_PUBLIC_REGISTRATION_ENABLED',
      required: productionLike,
      ok: !productionLike || present('PRODUCT_PUBLIC_REGISTRATION_ENABLED'),
    },
    {
      key: 'RUN_MIGRATIONS_ON_BOOT',
      required: productionLike,
      ok:
        !productionLike ||
        process.env.RUN_MIGRATIONS_ON_BOOT === 'false' ||
        process.env.RUN_MIGRATIONS_ON_BOOT === '0',
      detail: 'production should be false — migrate via scripts/migrate-es.sh',
    },
  ];

  const pebiSyncOn =
    process.env.PEBI_SYNC_ENABLED === 'true' || process.env.PEBI_SYNC_ENABLED === '1';
  if (strict || pebiSyncOn) {
    checks.push(
      {
        key: 'PEBI_ES_INTEGRATION_SECRET',
        required: true,
        ok: present('PEBI_ES_INTEGRATION_SECRET'),
      },
      {
        key: 'PEBI_DATABASE_URL|PEBI_API_URL',
        required: true,
        ok: present('PEBI_DATABASE_URL') || present('PEBI_API_URL'),
        detail: 'need PEBI DB or API for materials/customers sync',
      }
    );
  }

  const missing = checks.filter((c) => c.required && !c.ok);
  const warnings = checks.filter((c) => !c.required && !c.ok);

  const report = {
    ok: missing.length === 0,
    mode: productionLike ? 'production-like' : 'local/dev',
    strict: strict || pebiSyncOn,
    missing: missing.map((c) => ({ key: c.key, detail: c.detail })),
    warnings: warnings.map((c) => ({ key: c.key, detail: c.detail })),
    present: checks.filter((c) => c.ok).map((c) => c.key),
  };

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(
      '\nGo-live env gate FAILED. Set missing vars in packages/server/.env (and matching PPH ES_SSO_SECRET).'
    );
    process.exit(1);
  }
  console.error('\nGo-live env gate OK.');
  process.exit(0);
}

main();
