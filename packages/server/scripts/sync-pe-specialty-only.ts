/**
 * Push SPECIALTY + PE seed densities (x.xx) and sync only those families.
 */
import 'dotenv/config';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../src/db/index.js';
import {
  ensureSpecialtySubstratesFromSeed,
  ensurePeSubstratesFromSeed,
} from '../src/db/platform-master-data.js';
import { syncFamilyMaterialsFromPebiForTenant } from '../src/services/pebi-material-sync.js';
import { eq } from 'drizzle-orm';

async function main() {
  await initializeDatabase();
  const specialty = await ensureSpecialtySubstratesFromSeed();
  const pe = await ensurePeSubstratesFromSeed();
  console.log(JSON.stringify({ ensure: { specialty, pe } }, null, 2));

  const db = getDatabase();
  const [tenant] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.platformCompanyCode, 'interplast'))
    .limit(1);
  if (!tenant) throw new Error('interplast tenant not found');

  const specialtySync = await syncFamilyMaterialsFromPebiForTenant(tenant.id, 'SPECIALTY');
  const peSync = await syncFamilyMaterialsFromPebiForTenant(tenant.id, 'PE');
  console.log(JSON.stringify({ sync: { specialty: specialtySync, pe: peSync } }, null, 2));
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
