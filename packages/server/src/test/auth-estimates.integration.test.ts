import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { initializeDatabase, closeDatabase, getDatabase } from '../db';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('API integration — auth + estimates', () => {
  let app: FastifyInstance;
  const runId = Date.now();
  const email = `integration-${runId}@example.com`;
  const password = 'password123';

  beforeAll(async () => {
    await initializeDatabase();
    const db = getDatabase();
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const patchSql = readFileSync(path.join(dir, '../../scripts/schema-patches.sql'), 'utf8');
    await db.execute(sql.raw(`
      DO $$ BEGIN
        ALTER TYPE material_price_source ADD VALUE IF NOT EXISTS 'platform';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `));
    await db.execute(sql.raw(`UPDATE materials SET price_source = 'platform' WHERE price_source = 'excel'`));
    await db.execute(sql.raw(patchSql));
    app = await buildApp({ jwtSecret: 'integration-test-secret', logger: false });
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  it('registers a tenant, seeds materials, and returns JWT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password,
        displayName: 'Integration User',
        tenantName: `Test Co ${runId}`,
        tenantType: 'individual',
        displayCurrency: 'AED',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(email);
    expect(body.user.role).toBe('tenant_admin');
  });

  it('logs in with registered credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTruthy();
    expect(body.tenant.displayCurrency).toBe('AED');
  });

  it('creates an estimate, calculates price, and persists salePricePerKg', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    const { token } = loginRes.json();

    const materialsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/materials',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(materialsRes.statusCode).toBe(200);
    const materialsBody = materialsRes.json();
    // Support both paginated { items } and legacy bare array
    const materials = Array.isArray(materialsBody) ? materialsBody : materialsBody.items;
    expect(materials.length).toBeGreaterThan(0);

    const substrate = materials.find((m: { type: string }) => m.type === 'substrate');
    const ink =
      materials.find((m: { type: string; costingKey?: string }) => m.costingKey === 'ink-sb') ||
      materials.find(
        (m: { type: string; name: string; substrateFamily?: string }) =>
          m.type === 'ink' &&
          (m.name.toLowerCase().includes('sb') ||
            (m.substrateFamily || '').toLowerCase().includes('solvent based'))
      );
    expect(substrate).toBeTruthy();
    expect(ink).toBeTruthy();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/estimates',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jobName: `Integration estimate ${runId}`,
        productType: 'roll',
        printingWebClass: 'wide_web',
        dimensions: {
          productType: 'roll',
          reelWidthMm: 800,
          cutoffMm: 600,
          numberOfUps: 1,
          extraPrintingTrimMm: 0,
          piecesPerCut: 1,
          printingWebClass: 'wide_web',
        },
        markupPercent: 15,
        platesPerKg: 0.50,
        deliveryPerKg: 0.25,
        layers: [
          { materialId: substrate.id, micron: 30, position: 0 },
          { materialId: ink.id, micron: 5, position: 1 },
        ],
        slabs: [
          { quantityKg: 1000, pricePerKg: 0 },
          { quantityKg: 2000, pricePerKg: 0 },
        ],
        processes: [],
      },
    });

    expect(createRes.statusCode).toBe(201);
    const estimate = createRes.json();
    expect(estimate.id).toBeTruthy();
    expect(estimate.refNumber).toMatch(/^QT-\d{4}-\d+$/);

    const calcRes = await app.inject({
      method: 'POST',
      url: `/api/v1/estimates/${estimate.id}/calculate`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(calcRes.statusCode).toBe(200);
    const calcBody = calcRes.json();
    expect(calcBody.estimate.salePricePerKg).toBeGreaterThan(0);
    expect(calcBody.estimate.totalGsm).toBeGreaterThan(0);
    expect(calcBody.slabs.length).toBeGreaterThan(0);
    expect(calcBody.slabs[0].pricePerKg).toBeGreaterThan(0);

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/estimates/${estimate.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(getRes.statusCode).toBe(200);
    const saved = getRes.json();
    expect(parseFloat(saved.salePricePerKg)).toBeGreaterThan(0);
    expect(saved.layers.length).toBe(2);
  });

  // BUG-1: update should be atomic — layers/processes/slabs in a transaction
  // BUG-3: PATCH should return the fully-updated row (including printingWebClass / dimensions)
  // BUG-4: update where-clauses must include tenantId
  it('PATCH estimate is atomic and returns the final updated row', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
    const { token } = loginRes.json();

    const materialsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/materials',
      headers: { authorization: `Bearer ${token}` },
    });
    const materialsBody = materialsRes.json();
    const materials = Array.isArray(materialsBody) ? materialsBody : materialsBody.items;
    const substrate = materials.find((m: { type: string }) => m.type === 'substrate');
    const ink =
      materials.find((m: { type: string; costingKey?: string }) => m.costingKey === 'ink-sb') ||
      materials.find((m: { type: string; name: string }) => m.type === 'ink');

    // Create an estimate to patch
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/estimates',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jobName: `BUG-1/3/4 test ${runId}`,
        productType: 'roll',
        printingWebClass: 'wide_web',
        dimensions: {
          productType: 'roll',
          reelWidthMm: 500,
          cutoffMm: 400,
          numberOfUps: 1,
          extraPrintingTrimMm: 0,
          piecesPerCut: 1,
          printingWebClass: 'wide_web',
        },
        markupPercent: 15,
        platesPerKg: 0,
        deliveryPerKg: 0,
        layers: [{ materialId: substrate.id, micron: 25, position: 0 }],
        slabs: [{ quantityKg: 1000, pricePerKg: 0 }],
        processes: [],
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();

    // PATCH: update layers + add a slab + change jobName
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/estimates/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        jobName: 'Updated job name',
        layers: [
          { materialId: substrate.id, micron: 30, position: 0 },
          { materialId: ink.id, micron: 3, position: 1 },
        ],
        slabs: [
          { quantityKg: 500, pricePerKg: 0 },
          { quantityKg: 1000, pricePerKg: 0 },
        ],
        processes: [],
      },
    });
    expect(patchRes.statusCode).toBe(200);
    const patched = patchRes.json();

    // BUG-3: returned row must reflect the second update (printingWebClass derived from new layers)
    expect(patched.jobName).toBe('Updated job name');
    // printingWebClass should be derived from current layers (ink-sb → wide_web)
    expect(patched.printingWebClass).toBe('wide_web');

    // Verify via GET that layers are fully persisted (BUG-1: atomic)
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/estimates/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(200);
    const fetched = getRes.json();
    // Layers must be exactly 2 (not 0 from failed transaction, not 3 from partial)
    expect(fetched.layers.length).toBe(2);
    expect(fetched.slabs.length).toBe(2);

    // BUG-4: tenant isolation — another tenant cannot patch this estimate
    const otherRunId = runId + 1;
    const otherEmail = `other-${otherRunId}@example.com`;
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: otherEmail,
        password: 'password123',
        displayName: 'Other User',
        tenantName: `Other Co ${otherRunId}`,
        tenantType: 'individual',
        displayCurrency: 'USD',
      },
    });
    const otherToken = regRes.json().token;

    const crossTenantPatch = await app.inject({
      method: 'PATCH',
      url: `/api/v1/estimates/${created.id}`,
      headers: { authorization: `Bearer ${otherToken}` },
      payload: { jobName: 'Cross-tenant hijack' },
    });
    // Must not succeed — estimate belongs to original tenant
    expect(crossTenantPatch.statusCode).toBe(404);
  });
});
