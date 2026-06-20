import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest, isTenantAdmin } from '../utils/auth';
import { eq, and, asc } from 'drizzle-orm';
import { ensureTemplatesForTenant, relinkTemplatesForTenant } from '../db/seed-templates';
import { quantitiesForSlabTemplateKey } from '../db/seed-slab-templates';
import {
  buildTemplateMaterialLookup,
  resolveLayerMaterialId,
  type TemplateLayerRef,
} from '../utils/template-material-lookup';

const TemplateLayerSchema = z.object({
  layer_order: z.number().int().positive(),
  layer_type: z.enum(['substrate', 'ink', 'adhesive']),
  ref_material_key: z.string().optional(),
  materialId: z.string().uuid().nullable().optional(),
  default_micron: z.number(),
  swappable_with: z.string().optional(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  productType: z.enum(['roll', 'sleeve', 'pouch']).optional(),
  materialClass: z.string().nullable().optional(),
  structureType: z.string().nullable().optional(),
  displayOrder: z.number().int().optional(),
  defaultDimensions: z.record(z.any()).optional(),
  defaultLayers: z.array(TemplateLayerSchema).optional(),
  defaultProcesses: z
    .array(z.object({ process_key: z.string(), enabled: z.boolean() }))
    .optional(),
  defaultPrintingWebClass: z.enum(['wide_web', 'narrow_web']).optional(),
  solventMixEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/v1/templates
 * List structure templates for the current tenant.
 */
export async function getTemplatesRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Querystring: { standard_only?: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();
    const standardOnly = request.query.standard_only !== 'false';

    await ensureTemplatesForTenant(tenantId);
    await relinkTemplatesForTenant(tenantId);

    const conditions = [
      eq(schema.structureTemplates.tenantId, tenantId),
      eq(schema.structureTemplates.isActive, true),
    ];
    if (standardOnly) {
      conditions.push(eq(schema.structureTemplates.isStandard, true));
    }

    const templates = await db
      .select()
      .from(schema.structureTemplates)
      .where(and(...conditions))
      .orderBy(schema.structureTemplates.displayOrder);

    return reply.send(templates);
  } catch (error: any) {
    console.error('Get templates error:', error);
    return reply.status(500).send({ error: 'Failed to fetch templates' });
  }
}

/**
 * GET /api/v1/templates/:id
 */
export async function getTemplateByIdRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    await relinkTemplatesForTenant(tenantId);

    const [template] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, id),
          eq(schema.structureTemplates.tenantId, tenantId)
        )
      );

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return reply.send(template);
  } catch (error: any) {
    console.error('Get template error:', error);
    return reply.status(500).send({ error: 'Failed to fetch template' });
  }
}

/**
 * POST /api/v1/templates/:id/instantiate
 */
export async function instantiateTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      customerId?: string;
      jobName?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const { customerId, jobName } = request.body || {};
    const db = getDatabase();

    await relinkTemplatesForTenant(tenantId);

    const [template] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, id),
          eq(schema.structureTemplates.tenantId, tenantId),
          eq(schema.structureTemplates.isActive, true)
        )
      );

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialLookup = buildTemplateMaterialLookup(materials);

    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: schema.estimates.id })
      .from(schema.estimates)
      .where(eq(schema.estimates.tenantId, tenantId));
    const count = countResult.length;
    const refNumber = `QT-${year}-${String(count + 1).padStart(5, '0')}`;

    const defaultDims = (template.defaultDimensions as any) || {};
    const dimensions: Record<string, any> = {
      ...defaultDims,
    };

    if (template.productType === 'roll' || template.productType === 'sleeve') {
      dimensions.reelWidthMm = defaultDims.width_mm || defaultDims.reel_width_mm || 800;
      dimensions.cutoffMm = defaultDims.length_mm || defaultDims.cutoff_mm || 600;
      dimensions.numberOfUps = defaultDims.number_of_ups || 1;
      dimensions.extraPrintingTrimMm = defaultDims.extra_printing_trim_mm || 0;
      dimensions.piecesPerCut = 1;
    } else if (template.productType === 'pouch') {
      dimensions.openWidthMm = defaultDims.width_mm || 200;
      dimensions.openHeightMm = defaultDims.length_mm || 250;
    }

    const [estimate] = await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId: customerId || null,
        refNumber,
        jobName: jobName || template.name,
        productType: template.productType,
        printingWebClass: template.defaultPrintingWebClass || 'wide_web',
        dimensions,
        markupPercent: tenant.defaultMarkupPercent || '15.00',
        platesPerKg: '0',
        deliveryPerKg: '0',
        displayCurrency: tenant.displayCurrency,
        exchangeRateUsdToDisplay: tenant.exchangeRateUsdToDisplay,
        status: 'draft',
      })
      .returning();

    const defaultLayers = (template.defaultLayers as TemplateLayerRef[]) || [];
    let layerPosition = 0;
    for (const layer of defaultLayers) {
      const materialId = resolveLayerMaterialId(layer, materialLookup);
      if (!materialId) {
        console.warn(
          `Template ${template.name}: unresolved layer ${layer.ref_material_key || layer.layer_order}`
        );
        continue;
      }
      await db.insert(schema.layers).values({
        estimateId: estimate.id,
        materialId,
        micron: (layer.default_micron || 0).toString(),
        position: layerPosition,
      });
      layerPosition++;
    }

    const defaultProcesses = (template.defaultProcesses as any[]) || [];
    const processDefaults: Record<string, { costPerHour: number; speedBasis: string; speedValue: number; setupHours: number }> = {
      extrusion: { costPerHour: 50, speedBasis: 'kg_per_hour', speedValue: 200, setupHours: 2 },
      printing: { costPerHour: 80, speedBasis: 'm_per_min', speedValue: 100, setupHours: 4 },
      lamination: { costPerHour: 60, speedBasis: 'm_per_min', speedValue: 80, setupHours: 2 },
      slitting: { costPerHour: 30, speedBasis: 'm_per_min', speedValue: 150, setupHours: 1 },
      pouch_making: { costPerHour: 40, speedBasis: 'pcs_per_min', speedValue: 60, setupHours: 1 },
      seaming: { costPerHour: 35, speedBasis: 'pcs_per_min', speedValue: 50, setupHours: 1 },
    };

    for (const proc of defaultProcesses) {
      const defaults = processDefaults[proc.process_key] || { costPerHour: 50, speedBasis: 'kg_per_hour', speedValue: 100, setupHours: 1 };
      await db.insert(schema.processes).values({
        estimateId: estimate.id,
        name: proc.process_key.charAt(0).toUpperCase() + proc.process_key.slice(1).replace(/_/g, ' '),
        costPerHour: defaults.costPerHour.toString(),
        speedBasis: defaults.speedBasis,
        speedValue: defaults.speedValue.toString(),
        setupHours: defaults.setupHours.toString(),
        enabled: proc.enabled !== false,
      });
    }

    const slabQtys = quantitiesForSlabTemplateKey(tenant.defaultSlabTemplate || 'standard');
    for (let i = 0; i < slabQtys.length; i++) {
      await db.insert(schema.slabs).values({
        estimateId: estimate.id,
        quantityKg: slabQtys[i].toString(),
        pricePerKg: '0',
        sortOrder: i,
      });
    }

    return reply.status(201).send({
      id: estimate.id,
      refNumber: estimate.refNumber,
      jobName: estimate.jobName,
      productType: estimate.productType,
    });
  } catch (error: any) {
    console.error('Instantiate template error:', error);
    return reply.status(500).send({ error: 'Failed to instantiate template' });
  }
}

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  estimateId: z.string().uuid(),
});

/**
 * POST /api/v1/templates — save estimate as My Template
 */
export async function createTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof CreateTemplateSchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { name, estimateId } = CreateTemplateSchema.parse(request.body);
    const db = getDatabase();

    const [estimate] = await db
      .select()
      .from(schema.estimates)
      .where(and(eq(schema.estimates.id, estimateId), eq(schema.estimates.tenantId, tenantId)));

    if (!estimate) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    const layers = await db
      .select({
        materialId: schema.layers.materialId,
        micron: schema.layers.micron,
        position: schema.layers.position,
        materialType: schema.materials.type,
      })
      .from(schema.layers)
      .leftJoin(schema.materials, eq(schema.layers.materialId, schema.materials.id))
      .where(eq(schema.layers.estimateId, estimateId))
      .orderBy(asc(schema.layers.position));

    const processes = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, estimateId));

    const defaultLayers = layers.map((l: (typeof layers)[number], i: number) => ({
      layer_order: i + 1,
      layer_type: (l.materialType || 'substrate') as 'substrate' | 'ink' | 'adhesive',
      materialId: l.materialId,
      default_micron: parseFloat(l.micron),
    }));

    const defaultProcesses = processes.map((p: (typeof processes)[number]) => ({
      process_key: p.name.toLowerCase().replace(/\s+/g, '_'),
      enabled: p.enabled,
    }));

    const [template] = await db
      .insert(schema.structureTemplates)
      .values({
        tenantId,
        name,
        pebiParentPg: name,
        productType: estimate.productType,
        materialClass: 'Custom',
        structureType: 'Custom',
        displayOrder: 900,
        isStandard: false,
        defaultDimensions: estimate.dimensions,
        defaultLayers,
        defaultProcesses,
        defaultPrintingWebClass: estimate.printingWebClass,
        solventMixEnabled: estimate.printingWebClass === 'wide_web',
        isActive: true,
      })
      .returning();

    return reply.status(201).send(template);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create template error:', error);
    return reply.status(500).send({ error: 'Failed to create template' });
  }
}

/**
 * PATCH /api/v1/templates/:id — admin edits standard; any user edits own My Templates
 */
export async function updateTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof UpdateTemplateSchema>;
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const body = UpdateTemplateSchema.parse(request.body);
    const db = getDatabase();

    const [existing] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, id),
          eq(schema.structureTemplates.tenantId, tenantId)
        )
      );

    if (!existing) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    if (existing.isStandard && !isTenantAdmin(user.role)) {
      return reply.status(403).send({ error: 'Only admins can edit standard templates' });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.productType !== undefined) updates.productType = body.productType;
    if (body.materialClass !== undefined) updates.materialClass = body.materialClass;
    if (body.structureType !== undefined) updates.structureType = body.structureType;
    if (body.displayOrder !== undefined) updates.displayOrder = body.displayOrder;
    if (body.defaultDimensions !== undefined) updates.defaultDimensions = body.defaultDimensions;
    if (body.defaultProcesses !== undefined) updates.defaultProcesses = body.defaultProcesses;
    if (body.defaultPrintingWebClass !== undefined) {
      updates.defaultPrintingWebClass = body.defaultPrintingWebClass;
    }
    if (body.solventMixEnabled !== undefined) updates.solventMixEnabled = body.solventMixEnabled;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    if (body.defaultLayers !== undefined) {
      updates.defaultLayers = body.defaultLayers;
    }

    const [template] = await db
      .update(schema.structureTemplates)
      .set(updates)
      .where(eq(schema.structureTemplates.id, id))
      .returning();

    return reply.send(template);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Update template error:', error);
    return reply.status(500).send({ error: 'Failed to update template' });
  }
}

/**
 * DELETE /api/v1/templates/:id
 * Standard → soft-deactivate (admin). My Templates → hard delete (any tenant user).
 */
export async function deleteTemplateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const user = extractUserFromRequest(request);
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    const [existing] = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.id, id),
          eq(schema.structureTemplates.tenantId, tenantId)
        )
      );

    if (!existing) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    if (existing.isStandard) {
      if (!isTenantAdmin(user.role)) {
        return reply.status(403).send({ error: 'Only admins can delete standard templates' });
      }
      await db
        .update(schema.structureTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.structureTemplates.id, id));
      return reply.send({ ok: true, deactivated: true });
    }

    await db.delete(schema.structureTemplates).where(eq(schema.structureTemplates.id, id));
    return reply.send({ ok: true, deleted: true });
  } catch (error: any) {
    console.error('Delete template error:', error);
    return reply.status(500).send({ error: 'Failed to delete template' });
  }
}

export async function registerTemplateRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { standard_only?: string } }>(
    '/api/v1/templates',
    async (request, reply) => getTemplatesRoute(fastify, request, reply)
  );
  fastify.post<{ Body: z.infer<typeof CreateTemplateSchema> }>(
    '/api/v1/templates',
    async (request, reply) => createTemplateRoute(fastify, request, reply)
  );
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    async (request, reply) => getTemplateByIdRoute(fastify, request, reply)
  );
  fastify.patch<{ Params: { id: string }; Body: z.infer<typeof UpdateTemplateSchema> }>(
    '/api/v1/templates/:id',
    async (request, reply) => updateTemplateRoute(fastify, request, reply)
  );
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/templates/:id',
    async (request, reply) => deleteTemplateRoute(fastify, request, reply)
  );
  fastify.post<{ Params: { id: string }; Body: { customerId?: string; jobName?: string } }>(
    '/api/v1/templates/:id/instantiate',
    async (request, reply) => instantiateTemplateRoute(fastify, request, reply)
  );
}
