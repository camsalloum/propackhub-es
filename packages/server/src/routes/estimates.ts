import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest } from '../utils/auth';
import { eq, and, desc, sql } from 'drizzle-orm';
import { calculateEstimate, type Estimate as EngineEstimate } from '@es/engine';

const EstimateCreateSchema = z.object({
  customerId: z.string().uuid().optional(),
  jobName: z.string().min(1),
  productType: z.enum(['roll', 'sleeve', 'pouch']),
  printingWebClass: z.enum(['wide_web', 'narrow_web']).default('wide_web'),
  dimensions: z.record(z.any()),
  markupPercent: z.number().default(15),
  platesPerKg: z.number().default(0),
  deliveryPerKg: z.number().default(0),
  layers: z.array(z.object({
    materialId: z.string().uuid(),
    micron: z.number().positive(),
    position: z.number().nonnegative(),
  })),
  processes: z.array(z.object({
    name: z.string(),
    costPerHour: z.number(),
    speedBasis: z.enum(['kg_per_hour', 'm_per_min', 'pcs_per_min']),
    speedValue: z.number(),
    setupHours: z.number().default(0),
    enabled: z.boolean().default(true),
  })).default([]),
  slabs: z.array(z.object({
    quantityKg: z.number().positive(),
    pricePerKg: z.number().nonnegative(),
  })).default([]),
});

async function generateRefNumber(db: any, tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .select({ count: sql`COUNT(*)` })
    .from(schema.estimates)
    .where(
      and(
        eq(schema.estimates.tenantId, tenantId),
        sql`EXTRACT(YEAR FROM ${schema.estimates.createdAt}) = ${year}`
      )
    );

  const count = (result[0]?.count as number) || 0;
  return `QT-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function getEstimatesRoute(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const db = getDatabase();

    const estimates = await db
      .select()
      .from(schema.estimates)
      .where(eq(schema.estimates.tenantId, tenantId))
      .orderBy(desc(schema.estimates.createdAt));

    return reply.send(estimates);
  } catch (error: any) {
    console.error('Get estimates error:', error);
    return reply.status(500).send({ error: 'Failed to fetch estimates' });
  }
}

export async function createEstimateRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: z.infer<typeof EstimateCreateSchema> }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const data = EstimateCreateSchema.parse(request.body);

    const db = getDatabase();

    // Get tenant for currency
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' });
    }

    // Get materials for calculation
    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));

    const materialMap = new Map(materials.map(m => [m.id, {
      id: m.id,
      name: m.name,
      type: m.type,
      solidPercent: m.solidPercent,
      density: parseFloat(m.density),
      costPerKgUsd: parseFloat(m.costPerKgUsd),
      wastePercent: m.wastePercent,
    }]));

    // Generate ref number
    const refNumber = await generateRefNumber(db, tenantId);

    // Create estimate
    const [estimate] = await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId: data.customerId,
        refNumber,
        jobName: data.jobName,
        productType: data.productType,
        printingWebClass: data.printingWebClass,
        dimensions: data.dimensions,
        markupPercent: data.markupPercent.toString(),
        platesPerKg: data.platesPerKg.toString(),
        deliveryPerKg: data.deliveryPerKg.toString(),
        displayCurrency: tenant.displayCurrency,
        exchangeRateUsdToDisplay: tenant.exchangeRateUsdToDisplay.toString(),
        status: 'draft',
      })
      .returning();

    // Create layers
    for (const layer of data.layers) {
      await db
        .insert(schema.layers)
        .values({
          estimateId: estimate.id,
          materialId: layer.materialId,
          micron: layer.micron.toString(),
          position: layer.position,
        });
    }

    // Create processes
    for (const process of data.processes) {
      await db
        .insert(schema.processes)
        .values({
          estimateId: estimate.id,
          name: process.name,
          costPerHour: process.costPerHour.toString(),
          speedBasis: process.speedBasis,
          speedValue: process.speedValue.toString(),
          setupHours: process.setupHours.toString(),
          enabled: process.enabled,
        });
    }

    // Create slabs
    for (const slab of data.slabs) {
      await db
        .insert(schema.slabs)
        .values({
          estimateId: estimate.id,
          quantityKg: slab.quantityKg.toString(),
          pricePerKg: slab.pricePerKg.toString(),
        });
    }

    return reply.status(201).send({
      ...estimate,
      refNumber: estimate.refNumber,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Validation failed', details: error.errors });
    }
    console.error('Create estimate error:', error);
    return reply.status(500).send({ error: 'Failed to create estimate' });
  }
}

export async function calculateEstimateRoute(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;

    const db = getDatabase();

    // Get estimate with all details
    const [estimate] = await db
      .select()
      .from(schema.estimates)
      .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)));

    if (!estimate) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    // Get layers
    const layers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, id))
      .orderBy(schema.layers.position);

    // Get materials
    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));

    const materialMap = new Map(materials.map(m => [m.id, {
      id: m.id,
      name: m.name,
      type: m.type,
      solidPercent: m.solidPercent,
      density: parseFloat(m.density),
      costPerKgUsd: parseFloat(m.costPerKgUsd),
      wastePercent: m.wastePercent,
    }]));

    // Get processes
    const processes = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, id));

    // Convert to engine format
    const estimateForEngine: EngineEstimate = {
      id: estimate.id,
      tenantId,
      customerId: estimate.customerId || undefined,
      jobName: estimate.jobName,
      status: 'draft',
      layers: layers.map(l => ({
        id: l.id,
        materialId: l.materialId,
        micron: parseFloat(l.micron),
        position: l.position,
      })),
      dimensions: {
        productType: estimate.productType,
        printingWebClass: estimate.printingWebClass,
        ...estimate.dimensions,
      },
      markupPercent: parseFloat(estimate.markupPercent),
      platesPerKg: parseFloat(estimate.platesPerKg),
      deliveryPerKg: parseFloat(estimate.deliveryPerKg),
      processes: processes.map(p => ({
        id: p.id,
        name: p.name,
        costPerHour: parseFloat(p.costPerHour),
        speedBasis: p.speedBasis as any,
        speedValue: parseFloat(p.speedValue),
        setupHours: parseFloat(p.setupHours),
        enabled: p.enabled,
      })),
      slabs: [],
      displayCurrencyCode: estimate.displayCurrency,
      exchangeRateUsdToDisplay: parseFloat(estimate.exchangeRateUsdToDisplay),
      // Use order quantity from estimate or first slab, fallback to 1000
      orderQuantityKg: estimate.orderQuantityKg 
        ? parseFloat(estimate.orderQuantityKg)
        : (slabs[0]?.quantityKg ? parseFloat(slabs[0].quantityKg) : 1000),
      solventCostPerKgUsd: estimate.solventCostPerKgUsd ? parseFloat(estimate.solventCostPerKgUsd) : undefined,
      solventRatio: estimate.solventRatio ? parseFloat(estimate.solventRatio) : undefined,
      createdAt: estimate.createdAt,
      updatedAt: estimate.updatedAt,
    };

    // Calculate
    const result = calculateEstimate(estimateForEngine, materialMap);

    // Update estimate with calculated values
    await db
      .update(schema.estimates)
      .set({
        totalGsm: result.estimate.totalGsm?.toString(),
        totalMicron: result.estimate.totalMicron?.toString(),
        materialCostPerKg: result.estimate.materialCostPerKg?.toString(),
        salePricePerKg: result.estimate.salePricePerKg?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(schema.estimates.id, id));

    return reply.send({
      estimate: result.estimate,
      costBreakdown: result.costBreakdown,
      warnings: result.warnings,
    });
  } catch (error: any) {
    console.error('Calculate estimate error:', error);
    return reply.status(500).send({ error: 'Failed to calculate estimate' });
  }
}

export async function registerEstimateRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/estimates', async (request, reply) =>
    getEstimatesRoute(fastify, request, reply)
  );

  fastify.post<{ Body: z.infer<typeof EstimateCreateSchema> }>(
    '/api/v1/estimates',
    async (request, reply) => createEstimateRoute(fastify, request, reply)
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/calculate',
    async (request, reply) => calculateEstimateRoute(fastify, request, reply)
  );
}
