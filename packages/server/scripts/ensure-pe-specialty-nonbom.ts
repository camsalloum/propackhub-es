/**
 * One-shot: ensure PE + SPECIALTY platform seeds, then sync PEBI PE+SPECIALTY to Interplast.
 * Usage: npx tsx scripts/ensure-pe-specialty-nonbom.ts
 */
import 'dotenv/config';
import { initializeDatabase, closeDatabase } from '../src/db/index.js';
import {
  ensurePeSubstratesFromSeed,
  ensureSpecialtySubstratesFromSeed,
} from '../src/db/platform-master-data.js';
import { syncAllPebiMaterialsForPlatformCompany } from '../src/services/pebi-material-sync.js';

const COMPANY = process.env.INTERPLAST_PLATFORM_COMPANY_CODE?.trim() || 'interplast';

async function main() {
  await initializeDatabase();
  const specialty = await ensureSpecialtySubstratesFromSeed();
  const pe = await ensurePeSubstratesFromSeed();
  console.log(JSON.stringify({ ensure: { specialty, pe } }, null, 2));

  const results = await syncAllPebiMaterialsForPlatformCompany(COMPANY);
  const peResult = results.find((r) => r.family === 'PE');
  const specialtyResult = results.find((r) => r.family === 'SPECIALTY');
  console.log(JSON.stringify({ sync: { pe: peResult, specialty: specialtyResult } }, null, 2));
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
