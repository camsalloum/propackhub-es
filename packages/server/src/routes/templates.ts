import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest } from '../utils/auth';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/v1/templates
 * List structure templates for the current tenant.
 * Query params:
 *   - standard_only=true: only return active templates
 */
export async function getTemplatesRoute(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    const templates = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          eq(schema.structureTemplates.tenantId, tenantId),
          eq(schema.structureTemplates.isActive, true)
        )
      )
      .orderBy(schema.structureTemplates.displayOrder);

    return reply.send(templates);
  } catch (error: any) {
    console.error('Get templates error:', error);
    return reply.status(500).send({ error: 'Failed to fetch templates' });
  }
}

/**
 * GET /api/v1/templates/:id
 * Get a single structure template by ID with full details.
 */
export async function getTemplateByIdRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

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
 * Create a new estimate from a structure template.
 * The template's default layers are resolved to actual material IDs.
 */
export async function instantiateTemplateRoute(
  fastify: FastifyInstance,
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

    // Get template
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

    // Get tenant for currency info
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    // Generate ref number
    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: schema.estimates.id })
      .from(schema.estimates)
      .where(eq(schema.estimates.tenantId, tenantId));
    const count = countResult.length;
    const refNumber = `QT-${year}-${String(count + 1).padStart(5, '0')}`;

    // Build dimensions from template defaults
    const defaultDims = (template.defaultDimensions as any) || {};
    const dimensions: Record<string, any> = {
      ...defaultDims,
    };

    // Map template dimensions to schema dimensions
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

    // Create estimate
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

    // Create layers from template defaults
    const defaultLayers = (template.defaultLayers as any[]) || [];
    for (const layer of defaultLayers) {
      if (layer.materialId) {
        await db.insert(schema.layers).values({
          estimateId: estimate.id,
          materialId: layer.materialId,
          micron: (layer.default_micron || 0).toString(),
          position: layer.layer_order - 1, // 0-indexed
        });
      }
    }

    // Create default processes from template
    const defaultProcesses = (template.defaultProcesses as any[]) || [];
    // Map process_key to sensible defaults
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

    // Create default slab tiers
    const defaultSlabs = [
      { quantityKg: 1000, pricePerKg: 0 },
      { quantityKg: 2000, pricePerKg: 0 },
      { quantityKg: 5000, pricePerKg: 0 },
    ];
    for (const slab of defaultSlabs) {
      await db.insert(schema.slabs).values({
        estimateId: estimate.id,
        quantityKg: slab.quantityKg.toString(),
        pricePerKg: slab.pricePerKg.toString(),
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

export async function registerTemplateRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/templates', async (request, reply) => getTemplatesRoute(fastify, request, reply));
  fastify.get('/api/v1/templates/:id', async (request, reply) => getTemplateByIdRoute(fastify, request, reply));
  fastify.post('/api/v1/templates/:id/instantiate', async (request, reply) => instantiateTemplateRoute(fastify, request, reply));
}
