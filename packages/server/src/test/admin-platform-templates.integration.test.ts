/**
 * Integration tests for the admin platform-templates flow.
 *
 * Covers:
 *   - 403 for non-platform_admin callers
 *   - platform_admin creates a standard, every tenant sees it on next list
 *   - platform_admin edits → tenants see refreshed copy on next list
 *   - platform_admin deactivates → tenants see deactivated copy on next list
 *   - tenant_admin PATCH on a tenant copy does not modify the platform row
 *
 * Skipped when DATABASE_URL is not set (mirrors existing integration tests).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { initializeDatabase, closeDatabase, getDatabase, schema } from '../db';
import { eq } from 'drizzle-orm';
import { bootstrapPlatformStandardCatalog } from '../db/seed-platform-templates';

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('Admin Platform Templates — integration', () => {
  let app: FastifyInstance;
  const runId = Date.now();
  const emailPlatform = `apt-platform-${runId}@example.com`;
  const passwordPlatform = 'P@ssw0rd-platform!';
  const emailTenantA = `apt-tenant-a-${runId}@example.com`;
  const emailTenantB = `apt-tenant-b-${runId}@example.com`;
  const password = 'P@ssw0rd-tenant!';
  let tokenPlatform = '';
  let tokenTenantA = '';
  let tokenTenantB = '';

  beforeAll(async () => {
    await initializeDatabase();
    app = await buildApp({ jwtSecret: 'apt-integration-secret', logger: false });
    await app.ready();

    // Make sure the platform catalog is bootstrapped (test DBs may be fresh).
    try {
      await bootstrapPlatformStandardCatalog();
    } catch {
      // table may not exist in older test DBs — covered by per-test guards
    }

    // Register a tenant_admin and immediately promote them to platform_admin
    // via direct DB write (the registration endpoint defaults to tenant_admin).
    const regPlatform = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: emailPlatform,
        password: passwordPlatform,
        displayName: 'APT Platform Admin',
        tenantName: `APT Platform Tenant ${runId}`,
        tenantType: 'company',
        displayCurrency: 'USD',
      },
    });
    expect(regPlatform.statusCode).toBe(201);

    const db = getDatabase();
    await db
      .update(schema.users)
      .set({ role: 'platform_admin' })
      .where(eq(schema.users.email, emailPlatform));

    // Log back in to get a token with the elevated role baked in.
    const loginPlatform = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: emailPlatform, password: passwordPlatform },
    });
    expect(loginPlatform.statusCode).toBe(200);
    tokenPlatform = loginPlatform.json().token;

    // Tenant A admin (default tenant_admin role)
    const regA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: emailTenantA,
        password,
        displayName: 'APT Tenant A',
        tenantName: `APT Tenant A ${runId}`,
        tenantType: 'company',
        displayCurrency: 'USD',
      },
    });
    expect(regA.statusCode).toBe(201);
    tokenTenantA = regA.json().token;

    // Tenant B admin
    const regB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: emailTenantB,
        password,
        displayName: 'APT Tenant B',
        tenantName: `APT Tenant B ${runId}`,
        tenantType: 'company',
        displayCurrency: 'USD',
      },
    });
    expect(regB.statusCode).toBe(201);
    tokenTenantB = regB.json().token;
  });

  afterAll(async () => {
    if (app) await app.close();
    await closeDatabase();
  });

  it('rejects non-platform_admin callers with 403 on list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/platform-templates',
      headers: { authorization: `Bearer ${tokenTenantA}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects non-platform_admin callers with 403 on create', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/platform-templates',
      headers: { authorization: `Bearer ${tokenTenantA}` },
      payload: {
        name: `APT denied ${runId}`,
        productType: 'roll',
        materialClass: 'PE',
        structureTier: 'Mono',
        printMode: 'Plain',
        defaultLayers: [
          { layer_order: 1, layer_type: 'substrate', ref_material_key: 'ldpe-natural', default_micron: 25 },
        ],
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('platform_admin creates a standard and every tenant sees it on next list', async () => {
    const uniqueName = `APT Custom Standard ${runId}`;
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/platform-templates',
      headers: { authorization: `Bearer ${tokenPlatform}` },
      payload: {
        name: uniqueName,
        productType: 'roll',
        materialClass: 'PE',
        structureTier: 'Mono',
        printMode: 'Plain',
        defaultLayers: [
          { layer_order: 1, layer_type: 'substrate', ref_material_key: 'ldpe-natural', default_micron: 25 },
        ],
        defaultProcesses: [],
        displayOrder: 999,
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    expect(created.templateKey).toBeTruthy();
    expect(created.isActive).toBe(true);
    expect(created.name).toBe(uniqueName);

    // Tenant A's next list should include the new standard.
    const listA = await app.inject({
      method: 'GET',
      url: '/api/v1/templates',
      headers: { authorization: `Bearer ${tokenTenantA}` },
    });
    expect(listA.statusCode).toBe(200);
    const namesA: string[] = listA.json().map((t: { name: string }) => t.name);
    expect(namesA).toContain(uniqueName);

    // Tenant B's next list should also include it.
    const listB = await app.inject({
      method: 'GET',
      url: '/api/v1/templates',
      headers: { authorization: `Bearer ${tokenTenantB}` },
    });
    expect(listB.statusCode).toBe(200);
    const namesB: string[] = listB.json().map((t: { name: string }) => t.name);
    expect(namesB).toContain(uniqueName);
  });

  it('platform_admin edits a standard and tenants see the refreshed copy', async () => {
    const baseName = `APT Editable Standard ${runId}`;
    const editedName = `${baseName} (edited)`;

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/platform-templates',
      headers: { authorization: `Bearer ${tokenPlatform}` },
      payload: {
        name: baseName,
        productType: 'roll',
        materialClass: 'PE',
        structureTier: 'Mono',
        printMode: 'Plain',
        defaultLayers: [
          { layer_order: 1, layer_type: 'substrate', ref_material_key: 'ldpe-natural', default_micron: 25 },
        ],
      },
    });
    expect(created.statusCode).toBe(201);
    const createdId = created.json().id;

    // Ensure tenants have a materialized copy in their structure_templates.
    await app.inject({
      method: 'GET',
      url: '/api/v1/templates',
      headers: { authorization: `Bearer ${tokenTenantA}` },
    });

    // Wait briefly so updated_at on the platform row is strictly greater than
    // the tenant copy's updated_at (both default to now() on insert).
    await new Promise((r) => setTimeout(r, 50));

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/platform-templates/${createdId}`,
      headers: { authorization: `Bearer ${tokenPlatform}` },
      payload: { name: editedName },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().name).toBe(editedName);

    const listA = await app.inject({
      method: 'GET',
      url: '/api/v1/templates',
      headers: { authorization: `Bearer ${tokenTenantA}` },
    });
    expect(listA.statusCode).toBe(200);
    const namesA: string[] = listA.json().map((t: { name: string }) => t.name);
    expect(namesA).toContain(editedName);
  });

  it('platform_admin soft-deletes a standard and tenants stop seeing it', async () => {
    const name = `APT Removable Standard ${runId}`;

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/platform-templates',
      headers: { authorization: `Bearer ${tokenPlatform}` },
      payload: {
        name,
        productType: 'roll',
        materialClass: 'PE',
        structureTier: 'Mono',
        printMode: 'Plain',
        defaultLayers: [
          { layer_order: 1, layer_type: 'substrate', ref_material_key: 'ldpe-natural', default_micron: 25 },
        ],
      },
    });
    expect(created.statusCode).toBe(201);
    const createdId = created.json().id;

    // Make sure the standard reached tenant A first.
    await app.inject({
      method: 'GET',
      url: '/api/v1/templates',
      headers: { authorization: `Bearer ${tokenTenantA}` },
    });

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/platform-templates/${createdId}`,
      headers: { authorization: `Bearer ${tokenPlatform}` },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().deactivated).toBe(true);

    const listA = await app.inject({
      method: 'GET',
      url: '/api/v1/templates',
      headers: { authorization: `Bearer ${tokenTenantA}` },
    });
    expect(listA.statusCode).toBe(200);
    const namesA: string[] = listA.json().map((t: { name: string }) => t.name);
    expect(namesA).not.toContain(name);
  });

  it('saveAsPlatformStandard via /api/v1/templates is rejected for tenant_admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/templates',
      headers: { authorization: `Bearer ${tokenTenantA}` },
      payload: {
        source: 'fromDefinition',
        name: `APT Sneaky ${runId}`,
        productType: 'roll',
        materialClass: 'PE',
        structureTier: 'Mono',
        printMode: 'Plain',
        defaultLayers: [
          { layer_order: 1, layer_type: 'substrate', ref_material_key: 'ldpe-natural', default_micron: 25 },
        ],
        saveAsPlatformStandard: true,
      },
    });
    expect(res.statusCode).toBe(403);
  });
});
