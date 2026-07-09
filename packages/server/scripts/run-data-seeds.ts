/**
 * Idempotent data seeds for existing deployments (solvent catalog + lamination adhesives).
 * Usage: npx tsx scripts/run-data-seeds.ts
 */
import 'dotenv/config';
import { initializeDatabase, closeDatabase } from '../src/db/index.js';
import {
  ensureSolventCatalogSeeded,
  ensureLaminationAdhesivesSeeded,
  ensurePetSubstratesFromSeed,
  ensureBoppSubstratesFromSeed,
  ensureCppSubstratesFromSeed,
  ensurePaSubstratesFromSeed,
  ensurePapSubstratesFromSeed,
} from '../src/db/platform-master-data.js';

try {
  await initializeDatabase();
  const solvent = await ensureSolventCatalogSeeded();
  const lamination = await ensureLaminationAdhesivesSeeded();
  const pet = await ensurePetSubstratesFromSeed();
  const bopp = await ensureBoppSubstratesFromSeed();
  const cpp = await ensureCppSubstratesFromSeed();
  const pa = await ensurePaSubstratesFromSeed();
  const pap = await ensurePapSubstratesFromSeed();
  console.log('✓ Data seeds complete', { solvent, lamination, pet, bopp, cpp, pa, pap });
} catch (err) {
  console.error('✗ Data seed failed:', err);
  process.exit(1);
} finally {
  await closeDatabase();
}
