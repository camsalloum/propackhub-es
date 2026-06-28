/**
 * Admin routes for the platform-wide standard template catalog.
 *
 * Authorization: every route in this file requires `user.role === 'platform_admin'`.
 * Writes to `platform_standard_templates` propagate to every tenant lazily on the
 * tenant's next templates-list read (no eager fan-out — see design doc).
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, asc, desc } from 'drizzle-orm';
import { getDatabase, schema } from '../db';
import { extractUserFromRequest, isPlatformAdmin, type TokenPayload } from '../utils/auth';
import { deriveStandardTemplateKey } from '../utils/template-key';
import {
  derivePrintingWebClass,
  stackNeedsSolventMix,
  resolveTemplateStoreClassification,
  tierToStructureType,
  TIER_SUBSTRATE_COUNT,
  TIER_ADHESIVE_COUNT,
  substrateFamilyAllowed,
} from '@es/engine';
import { buildEngineMaterialMap } from '../services/estimate-calculation';

// ─── Schemas ────────────────────────────────────────────────────────────────

const PlatformLayerSchema = z.object({
  layer_order: z.number().int().positive(),
  layer_type: z.enum(['substrate', 'ink', 'adhesive']),
  /**
   * Server accepts either:
   *   - `ref_material_key` directly (preferred — canonical PEBI key), or
   *   - `materialId` from the caller's tenant library; the server will resolve
   *     it to the canonical `costing_key` before persisting.
   */
  ref_material_key: z.string().optional(),
  materialId: z.string().uuid().nullable().optional(),
  default_micron: z.number(),
  swappable_with: z.string().optional(),
});

const CreatePlatformTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  pebiParentPg: z.string().min(1).max(255).optional(),
  productType: z.enum(['roll', 'sleeve', 'pouch']),
  productSubtype: z.string().max(64).nullable().optional(),
  materialClass: z.enum(['PE', 'Non PE']),
  structureTier: z.enum(['Mono', 'Duplex', 'Triplex', 'Quadriplex']),
  printMode: z.enum(['Plain', 'Printed']),
  defaultLayers: z.array(PlatformLayerSchema),
  defaultProcesses: z
    .array(z.object({ process_key: z.string(), enabled: z.boolean() }))
    .optional(),
  defaultDimensions: z.record(z.any()).optional(),
  displayOrder: z.number().int().optional(),
  cloneFromTemplateId: z.string().uuid().optional(),
});

const UpdatePlatformTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  pebiParentPg: z.string().min(1).max(255).optional(),
  productType: z.enum(['roll', 'sleeve', 'pouch']).optional(),
  productSubtype: z.string().max(64).nullable().optional(),
  materialClass: z.enum(['PE', 'Non PE']).optional(),
  structureTier: z.enum(['Mono', 'Duplex', 'Triplex', 'Quadriplex']).optional(),
  printMode: z.enum(['Plain', 'Printed']).optional(),
  defaultLayers: z.array(PlatformLayerSchema).optional(),
  defaultProcesses: z
    .array(z.object({ process_key: z.string(), enabled: z.boolean() }))
    .optional(),
  defaultDimensions: z.record(z.any()).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// ─── Guard ─────────────────────────────────────────────────────────────────

/**
 * Reject the request with 403 when the caller is not a platform_admin.
 * Logs a warn line including userId/role/route for audit visibility.
 * Returns `null` on success, or the FastifyReply (already sent) on failure.
 */
async function requirePlatformAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<TokenPayload | null> {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Authentication required' });
    return null;
  }
  const user = extractUserFromRequest(request);
  if (!isPlatformAdmin(user.role)) {
    request.log.warn(
      { userId: user.userId, role: user.role, route: request.url },
      'Non-platform_admin attempted platform-templates operation'
    );
    reply.status(403).send({ error: 'Platform admin role required' });
    return null;
  }
  return user;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface NormalizedLayer {
  layer_order: number;
  layer_type: 'substrate' | 'ink' | 'adhesive';
  ref_material_key: string;
  default_micron: number;
  swappable_with?: string;
}

/**
 * Derive a portable `ref_material_key` for a tenant material, sourced entirely
 * from master data (the single source of truth):
 *
 *   1. `costing_key`        — the master-data-derived template alias
 *                             (e.g. ink-sb, ldpe-natural). Set on materials that
 *                             map through TEMPLATE_REF_TO_MASTER_KEY.
 *   2. `platform_master_key`— the raw master catalog key. Present on every
 *                             platform-synced material, so it covers materials
 *                             that have no short template alias (e.g. inks like
 *                             "Common Colors"). Resolves cross-tenant because the
 *                             shared lookup now maps platform_master_key → id.
 *   3. name slug            — last resort for genuine tenant-only custom rows
 *                             that were never synced from the catalog. Resolves
 *                             only on tenants holding a same-named material; the
 *                             instantiation guard surfaces it otherwise.
 *
 * Returns null only when the material id is unknown.
 */
function refKeyForMaterial(m: {
  costingKey?: string | null;
  platformMasterKey?: string | null;
  name?: string | null;
}): string | null {
  if (m.costingKey) return m.costingKey;
  if (m.platformMasterKey) return m.platformMasterKey;
  if (m.name) return m.name.toLowerCase().replace(/\s+/g, '-');
  return null;
}

/**
 * Translate any layer that carries a tenant `materialId` into a master-data-
 * derived `ref_material_key`. Layers that already carry `ref_material_key` are
 * passed through. Layers with neither keep an empty ref (intentionally
 * "unresolved", allowed per Req 2.5). This never throws.
 */
async function normalizeLayersToRefKeys(
  user: TokenPayload,
  rawLayers: z.infer<typeof PlatformLayerSchema>[]
): Promise<NormalizedLayer[]> {
  const db = getDatabase();

  const needsLookup = rawLayers.some((l) => !l.ref_material_key && l.materialId);
  let materialById = new Map<
    string,
    { costingKey: string | null; platformMasterKey: string | null; name: string }
  >();
  if (needsLookup) {
    const rows = await db
      .select({
        id: schema.materials.id,
        name: schema.materials.name,
        costingKey: schema.materials.costingKey,
        platformMasterKey: schema.materials.platformMasterKey,
      })
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, user.tenantId));
    materialById = new Map(
      rows.map((r) => [
        r.id,
        { costingKey: r.costingKey, platformMasterKey: r.platformMasterKey, name: r.name },
      ])
    );
  }

  const out: NormalizedLayer[] = [];
  for (let i = 0; i < rawLayers.length; i++) {
    const layer = rawLayers[i];

    let refKey = layer.ref_material_key?.trim() || '';
    if (!refKey && layer.materialId) {
      const mat = materialById.get(layer.materialId);
      refKey = (mat && refKeyForMaterial(mat)) || '';
    }

    out.push({
      layer_order: layer.layer_order ?? i + 1,
      layer_type: layer.layer_type,
      ref_material_key: refKey,
      default_micron: layer.default_micron ?? 0,
      ...(layer.swappable_with ? { swappable_with: layer.swappable_with } : {}),
    });
  }
  return out;
}

/**
 * Apply the shared structure-tier / print-mode / family validation used by
 * `createTemplateFromDefinition`. Returns null on success or an error string
 * naming the violation.
 */
async function validateDefinition(
  user: TokenPayload,
  args: {
    productType: 'roll' | 'sleeve' | 'pouch';
    materialClass: 'PE' | 'Non PE';
    structureTier: 'Mono' | 'Duplex' | 'Triplex' | 'Quadriplex';
    printMode: 'Plain' | 'Printed';
    layers: z.infer<typeof PlatformLayerSchema>[];
  }
): Promise<string | null> {
  const { productType, materialClass, structureTier, printMode, layers } = args;

  const subCount = layers.filter((l) => l.layer_type === 'substrate').length;
  const inkCount = layers.filter((l) => l.layer_type === 'ink').length;
  const adhCount = layers.filter((l) => l.layer_type === 'adhesive').length;

  const expectedSubs = TIER_SUBSTRATE_COUNT[structureTier];
  const expectedAdh = TIER_ADHESIVE_COUNT[structureTier];

  if (subCount !== expectedSubs) {
    return `Substrate count mismatch: tier ${structureTier} requires ${expectedSubs} substrates but got ${subCount}`;
  }
  if (adhCount < expectedAdh) {
    return `Adhesive count too low: tier ${structureTier} requires at least ${expectedAdh} adhesive(s) but got ${adhCount}`;
  }
  if (printMode === 'Plain' && inkCount > 0) {
    return 'Ink layers are not allowed when printMode is Plain';
  }

  // Substrate-family checks need a materials table reference. We use the
  // caller's tenant library here because that's the only library available to
  // a platform_admin's UI session; substrateFamily/costingKey are cross-tenant
  // stable so the check generalizes.
  const db = getDatabase();
  const tenantMaterials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, user.tenantId));

  const structureType = tierToStructureType(structureTier);
  const matById = new Map(tenantMaterials.map((m) => [m.id, m]));

  for (const layer of layers.filter((l) => l.layer_type === 'substrate' && l.materialId)) {
    const mat = matById.get(layer.materialId!);
    if (!mat) continue;
    if (
      !substrateFamilyAllowed(mat.substrateFamily || '', {
        materialClass,
        structureType,
        productType,
      })
    ) {
      return `Substrate material "${mat.name}" (family: ${mat.substrateFamily}) is not allowed for materialClass=${materialClass}`;
    }
  }

  return null;
}

/**
 * Convert a normalized definition into the row shape persisted to
 * `platform_standard_templates`.
 */
function buildPlatformRow(args: {
  user: TokenPayload;
  templateKey: string;
  name: string;
  pebiParentPg: string;
  productType: 'roll' | 'sleeve' | 'pouch';
  productSubtype: string | null;
  materialClass: string | null;
  structureType: string | null;
  displayOrder: number;
  defaultDimensions: Record<string, unknown>;
  layers: NormalizedLayer[];
  defaultProcesses: { process_key: string; enabled: boolean }[];
  defaultPrintingWebClass: 'wide_web' | 'narrow_web';
  solventMixEnabled: boolean;
  isActive?: boolean;
}) {
  return {
    templateKey: args.templateKey,
    name: args.name,
    pebiParentPg: args.pebiParentPg,
    productType: args.productType,
    productSubtype: args.productSubtype,
    materialClass: args.materialClass,
    structureType: args.structureType,
    substrateOrigin: null as string | null,
    displayOrder: args.displayOrder,
    defaultDimensions: args.defaultDimensions,
    defaultLayers: args.layers,
    defaultProcesses: args.defaultProcesses,
    defaultPrintingWebClass: args.defaultPrintingWebClass,
    solventMixEnabled: args.solventMixEnabled,
    inkSystemOptions: ['SB'] as string[],
    substrateOptions: null as string[] | null,
    isActive: args.isActive ?? true,
    createdByUserId: args.user.userId,
    updatedByUserId: args.user.userId,
  };
}

// ─── Routes ────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/platform-templates */
export async function listPlatformTemplatesRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = await requirePlatformAdmin(request, reply);
  if (!user) return;

  const db = getDatabase();
  const rows = await db
    .select()
    .from(schema.platformStandardTemplates)
    .orderBy(
      asc(schema.platformStandardTemplates.displayOrder),
      desc(schema.platformStandardTemplates.updatedAt)
    );
  return reply.send(rows);
}

/** GET /api/v1/admin/platform-templates/:id */
export async function getPlatformTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = await requirePlatformAdmin(request, reply);
  if (!user) return;

  const db = getDatabase();
  const [row] = await db
    .select()
    .from(schema.platformStandardTemplates)
    .where(eq(schema.platformStandardTemplates.id, request.params.id));

  if (!row) return reply.status(404).send({ error: 'Platform standard not found' });
  return reply.send(row);
}

/** POST /api/v1/admin/platform-templates */
export async function createPlatformTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const user = await requirePlatformAdmin(request, reply);
  if (!user) return;

  let body: z.infer<typeof CreatePlatformTemplateSchema>;
  try {
    body = CreatePlatformTemplateSchema.parse(request.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }

  const db = getDatabase();

  // Resolve "clone from" source if requested. Pulls layers/processes/dimensions
  // from the source row (any tenant template — the admin must be able to see it
  // via the tenant they're logged into; we read by id within their tenant).
  let layers = body.defaultLayers;
  let defaultProcesses = body.defaultProcesses ?? [];
  let defaultDimensions: Record<string, unknown> = body.defaultDimensions ?? {};

  if (body.cloneFromTemplateId) {
    const [src] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, body.cloneFromTemplateId),
          eq(schema.structureTemplates.tenantId, user.tenantId)
        )
      );
    if (!src) {
      return reply.status(404).send({ error: 'Clone source template not found in your tenant' });
    }
    if (!body.defaultLayers || body.defaultLayers.length === 0) {
      layers = (src.defaultLayers as z.infer<typeof PlatformLayerSchema>[]) || [];
    }
    if (!body.defaultProcesses) {
      defaultProcesses =
        (src.defaultProcesses as { process_key: string; enabled: boolean }[]) || [];
    }
    if (!body.defaultDimensions) {
      defaultDimensions = (src.defaultDimensions as Record<string, unknown>) || {};
    }
  }

  const validationError = await validateDefinition(user, {
    productType: body.productType,
    materialClass: body.materialClass,
    structureTier: body.structureTier,
    printMode: body.printMode,
    layers,
  });
  if (validationError) return reply.status(400).send({ error: validationError });

  let normalized: NormalizedLayer[];
  try {
    normalized = await normalizeLayersToRefKeys(user, layers);
  } catch (err) {
    return reply.status(400).send({ error: (err as Error).message });
  }

  // Stamp printMode into defaultDimensions (Option A — no schema column).
  defaultDimensions = { ...defaultDimensions, printMode: body.printMode };

  // Re-derive classification + printing web class to keep the row consistent
  // with what the UI would compute when a user opens it.
  const tenantMaterials = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.tenantId, user.tenantId));
  const materialMap = buildEngineMaterialMap(tenantMaterials);

  // For classification/web-class derivation, fall back to tenant material IDs
  // where available (only used for inference; canonical layers use ref keys).
  const inferenceLayers = layers
    .filter((l): l is typeof l & { materialId: string } => Boolean(l.materialId))
    .map((l) => ({
      materialId: l.materialId,
      layer_type: l.layer_type,
    }));
  const needsSolvent = stackNeedsSolventMix(inferenceLayers, materialMap);
  const printingWebClass = derivePrintingWebClass(inferenceLayers, materialMap);

  const structureType = tierToStructureType(body.structureTier);
  const resolved = resolveTemplateStoreClassification(
    { materialClass: body.materialClass, structureType },
    // resolveTemplateStoreClassification accepts the broader layer shape so we
    // can pass the original layer set (null materialIds and all).
    layers.map((l) => ({ materialId: l.materialId ?? null, layer_type: l.layer_type })),
    tenantMaterials.map((m) => ({ id: m.id, substrateFamily: m.substrateFamily }))
  );

  const pebiParentPg = body.pebiParentPg ?? body.name;
  const templateKey = deriveStandardTemplateKey({
    pebiParentPg,
    name: body.name,
    materialClass: resolved.materialClass,
    structureType: resolved.structureType,
  });

  // Uniqueness check (also enforced by DB unique index — surface a clean 409).
  const [collide] = await db
    .select({ id: schema.platformStandardTemplates.id })
    .from(schema.platformStandardTemplates)
    .where(eq(schema.platformStandardTemplates.templateKey, templateKey))
    .limit(1);
  if (collide) {
    return reply.status(409).send({
      error: 'A platform standard with this template_key already exists',
      templateKey,
    });
  }

  const row = buildPlatformRow({
    user,
    templateKey,
    name: body.name,
    pebiParentPg,
    productType: body.productType,
    productSubtype: body.productSubtype ?? null,
    materialClass: resolved.materialClass,
    structureType: resolved.structureType,
    displayOrder: body.displayOrder ?? 500,
    defaultDimensions,
    layers: normalized,
    defaultProcesses,
    defaultPrintingWebClass: printingWebClass as 'wide_web' | 'narrow_web',
    solventMixEnabled: needsSolvent,
  });

  const [inserted] = await db
    .insert(schema.platformStandardTemplates)
    .values(row)
    .returning();

  return reply.status(201).send(inserted);
}

/** PATCH /api/v1/admin/platform-templates/:id */
export async function updatePlatformTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const user = await requirePlatformAdmin(request, reply);
  if (!user) return;

  let body: z.infer<typeof UpdatePlatformTemplateSchema>;
  try {
    body = UpdatePlatformTemplateSchema.parse(request.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }

  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(schema.platformStandardTemplates)
    .where(eq(schema.platformStandardTemplates.id, request.params.id));

  if (!existing) return reply.status(404).send({ error: 'Platform standard not found' });

  return applyPlatformUpdate(db, user, existing, body, reply);
}

/**
 * PATCH /api/v1/admin/platform-templates/by-key/:templateKey
 * Same as the by-id route but addressed by the canonical `templateKey`.
 * Used by the frontend when the admin opens the editor on a tenant copy
 * (the tenant row's id is local; the canonical key is the cross-table handle).
 */
export async function updatePlatformTemplateByKeyRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { templateKey: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const user = await requirePlatformAdmin(request, reply);
  if (!user) return;

  let body: z.infer<typeof UpdatePlatformTemplateSchema>;
  try {
    body = UpdatePlatformTemplateSchema.parse(request.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: err.errors });
    }
    throw err;
  }

  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(schema.platformStandardTemplates)
    .where(eq(schema.platformStandardTemplates.templateKey, request.params.templateKey));

  if (!existing) {
    return reply
      .status(404)
      .send({ error: 'Platform standard not found', templateKey: request.params.templateKey });
  }

  return applyPlatformUpdate(db, user, existing, body, reply);
}

/**
 * Shared body of the PATCH path. Validates + normalizes the update payload
 * and writes the platform row. Returns the updated row to the caller.
 */
async function applyPlatformUpdate(
  db: ReturnType<typeof getDatabase>,
  user: TokenPayload,
  existing: typeof schema.platformStandardTemplates.$inferSelect,
  body: z.infer<typeof UpdatePlatformTemplateSchema>,
  reply: FastifyReply
) {
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
    updatedByUserId: user.userId,
  };

  if (body.name !== undefined) updates.name = body.name;
  if (body.pebiParentPg !== undefined) updates.pebiParentPg = body.pebiParentPg;
  if (body.productType !== undefined) updates.productType = body.productType;
  if (body.productSubtype !== undefined) updates.productSubtype = body.productSubtype;
  if (body.materialClass !== undefined) updates.materialClass = body.materialClass;
  if (body.structureTier !== undefined)
    updates.structureType = tierToStructureType(body.structureTier);
  if (body.displayOrder !== undefined) updates.displayOrder = body.displayOrder;
  if (body.isActive !== undefined) updates.isActive = body.isActive;

  // Layer / process / dimension updates require validation + normalization.
  if (body.defaultLayers !== undefined) {
    // Only run the full structural validation when the caller provides the
    // attributes needed to validate (tier + printMode + materialClass + productType).
    if (body.structureTier && body.printMode && body.materialClass && body.productType) {
      const err = await validateDefinition(user, {
        productType: body.productType,
        materialClass: body.materialClass,
        structureTier: body.structureTier,
        printMode: body.printMode,
        layers: body.defaultLayers,
      });
      if (err) return reply.status(400).send({ error: err });
    }
    try {
      updates.defaultLayers = await normalizeLayersToRefKeys(user, body.defaultLayers);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  }

  if (body.defaultProcesses !== undefined) updates.defaultProcesses = body.defaultProcesses;
  if (body.defaultDimensions !== undefined) updates.defaultDimensions = body.defaultDimensions;
  if (body.printMode !== undefined) {
    const dims =
      (updates.defaultDimensions as Record<string, unknown> | undefined) ??
      (existing.defaultDimensions as Record<string, unknown> | null) ??
      {};
    updates.defaultDimensions = { ...dims, printMode: body.printMode };
  }

  const [updated] = await db
    .update(schema.platformStandardTemplates)
    .set(updates)
    .where(eq(schema.platformStandardTemplates.id, existing.id))
    .returning();

  return reply.send(updated);
}

/** DELETE /api/v1/admin/platform-templates/:id (soft delete) */
export async function deletePlatformTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = await requirePlatformAdmin(request, reply);
  if (!user) return;

  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(schema.platformStandardTemplates)
    .where(eq(schema.platformStandardTemplates.id, request.params.id));

  if (!existing) return reply.status(404).send({ error: 'Platform standard not found' });

  return applyPlatformDelete(db, user, existing, reply);
}

/**
 * DELETE /api/v1/admin/platform-templates/by-key/:templateKey
 * Same as the by-id route but addressed by the canonical templateKey.
 */
export async function deletePlatformTemplateByKeyRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { templateKey: string } }>,
  reply: FastifyReply
) {
  const user = await requirePlatformAdmin(request, reply);
  if (!user) return;

  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(schema.platformStandardTemplates)
    .where(eq(schema.platformStandardTemplates.templateKey, request.params.templateKey));

  if (!existing) {
    return reply
      .status(404)
      .send({ error: 'Platform standard not found', templateKey: request.params.templateKey });
  }

  return applyPlatformDelete(db, user, existing, reply);
}

async function applyPlatformDelete(
  db: ReturnType<typeof getDatabase>,
  user: TokenPayload,
  existing: typeof schema.platformStandardTemplates.$inferSelect,
  reply: FastifyReply
) {
  if (!existing.isActive) {
    return reply.send({ ok: true, alreadyInactive: true });
  }

  await db
    .update(schema.platformStandardTemplates)
    .set({ isActive: false, updatedAt: new Date(), updatedByUserId: user.userId })
    .where(eq(schema.platformStandardTemplates.id, existing.id));

  return reply.send({ ok: true, deactivated: true });
}

// ─── Registration ───────────────────────────────────────────────────────────

export async function registerAdminPlatformTemplateRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/admin/platform-templates', async (request, reply) =>
    listPlatformTemplatesRoute(fastify, request, reply)
  );
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/admin/platform-templates/:id',
    async (request, reply) => getPlatformTemplateRoute(fastify, request, reply)
  );
  fastify.post<{ Body: unknown }>(
    '/api/v1/admin/platform-templates',
    async (request, reply) => createPlatformTemplateRoute(fastify, request, reply)
  );
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    '/api/v1/admin/platform-templates/:id',
    async (request, reply) => updatePlatformTemplateRoute(fastify, request, reply)
  );
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/admin/platform-templates/:id',
    async (request, reply) => deletePlatformTemplateRoute(fastify, request, reply)
  );
  // By-key handles for the frontend: the editor opens on a tenant copy whose
  // id is local to that tenant; the canonical templateKey is the cross-table
  // handle for the platform row.
  fastify.patch<{ Params: { templateKey: string }; Body: unknown }>(
    '/api/v1/admin/platform-templates/by-key/:templateKey',
    async (request, reply) => updatePlatformTemplateByKeyRoute(fastify, request, reply)
  );
  fastify.delete<{ Params: { templateKey: string } }>(
    '/api/v1/admin/platform-templates/by-key/:templateKey',
    async (request, reply) => deletePlatformTemplateByKeyRoute(fastify, request, reply)
  );
}
