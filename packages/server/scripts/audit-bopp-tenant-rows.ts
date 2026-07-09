import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../src/db/index.js';

async function main() {
  await initializeDatabase();
  const db = getDatabase();
  const interplastId = 'd6c4c6d6-7941-4121-b344-2e27e23560e4';
  const rows = await db
    .select({
      tenantId: schema.materials.tenantId,
      name: schema.materials.name,
      key: schema.materials.platformMasterKey,
      grade: schema.materials.substrateGrade,
      tenantOnly: schema.materials.isTenantOnly,
    })
    .from(schema.materials)
    .where(eq(schema.materials.substrateFamily, 'BOPP'));
  const interplast = rows.filter((r) => r.tenantId === interplastId);
  console.log('Interplast BOPP:', interplast.length, interplast.map((r) => r.key).join(', '));
  console.log('All tenants total:', rows.length);
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
