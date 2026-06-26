/**
 * Idempotent data seeds for existing deployments (solvent catalog + lamination adhesives).
 * Usage: npx tsx scripts/run-data-seeds.ts
 */
import 'dotenv/config';
import { initializeDatabase, closeDatabase } from '../src/db/index.js';
import {
  ensureSolventCatalogSeeded,
  ensureLaminationAdhesivesSeeded,
} from '../src/db/platform-master-data.js';

try {
  await initializeDatabase();
  const solvent = await ensureSolventCatalogSeeded();
  const lamination = await ensureLaminationAdhesivesSeeded();
  console.log('✓ Data seeds complete', { solvent, lamination });
} catch (err) {
  console.error('✗ Data seed failed:', err);
  process.exit(1);
} finally {
  await closeDatabase();
}
