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
    const materials = materialsRes.json();
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
});
