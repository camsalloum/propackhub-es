import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDatabase, schema } from '../db';
import { extractTenantFromRequest, extractUserFromRequest } from '../utils/auth';
import { eq, and, desc, sql, isNull, asc } from 'drizzle-orm';
import { calculateEstimate, type VisibilityProfile, type Estimate as EngineEstimate } from '@es/engine';
import { getEffectiveProfile, stripEstimateRow, stripCalculationResult } from '../utils/visibility';
import { usdToDisplay } from '../utils/currency';
import { calculateAndPersistEstimate, buildEngineMaterialMap, type MaterialRow } from '../services/estimate-calculation';

async function getUserVisibilityProfile(db: any, userId: string): Promise<VisibilityProfile> {
  const [userRecord] = await db
    .select({ visibilityProfile: schema.users.visibilityProfile, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  return getEffectiveProfile(userRecord?.role, userRecord?.visibilityProfile);
}

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
  status: z.enum(['draft', 'sent', 'won', 'lost']).optional(),
  notes: z.string().optional(),
  note: z.string().optional(), // used in activity log
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
  _fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const db = getDatabase();

    const profile = await getUserVisibilityProfile(db, user.userId);

    const estimates = await db
      .select()
      .from(schema.estimates)
      .where(and(eq(schema.estimates.tenantId, tenantId), isNull(schema.estimates.deletedAt)))
      .orderBy(desc(schema.estimates.createdAt));

    // Enrich with customer names
    const customers = await db
      .select({ id: schema.customers.id, companyName: schema.customers.companyName })
      .from(schema.customers)
      .where(eq(schema.customers.tenantId, tenantId));
    const customerMap = new Map(customers.map((c: (typeof customers)[number]) => [c.id, c.companyName]));

    const visibleEstimates = estimates.map((est: (typeof estimates)[number]) => ({
      ...stripEstimateRow(est, profile),
      customerName: est.customerId ? (customerMap.get(est.customerId) ?? null) : null,
    }));

    return reply.send(visibleEstimates);
  } catch (error: any) {
    if (error.statusCode === 401 || error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      throw error; // Let Fastify handle auth errors properly
    }
    console.error('Get estimates error:', error);
    return reply.status(500).send({ error: 'Failed to fetch estimates' });
  }
}

export async function createEstimateRoute(
  _fastify: FastifyInstance,
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
    for (let i = 0; i < data.slabs.length; i++) {
      const slab = data.slabs[i];
      await db
        .insert(schema.slabs)
        .values({
          estimateId: estimate.id,
          quantityKg: slab.quantityKg.toString(),
          pricePerKg: slab.pricePerKg.toString(),
          sortOrder: i,
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
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const { id } = request.params;

    const db = getDatabase();

    const profile = await getUserVisibilityProfile(db, user.userId);
    const result = await calculateAndPersistEstimate(db, id, tenantId);
    return reply.send(stripCalculationResult(result, profile));
  } catch (error: any) {
    if (error.message === 'Estimate not found') {
      return reply.status(404).send({ error: 'Estimate not found' });
    }
    console.error('Calculate estimate error:', error);
    return reply.status(500).send({ error: 'Failed to calculate estimate' });
  }
}

export async function generateProposalPdfRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }> ,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const user = extractUserFromRequest(request);
    const { id } = request.params;

    const db = getDatabase();

    const profile = await getUserVisibilityProfile(db, user.userId);

    // Fetch estimate and related data (reuse calculate logic)
    const [estimate] = await db
      .select()
      .from(schema.estimates)
      .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)));

    if (!estimate) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    const layers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, id))
      .orderBy(schema.layers.position);

    const materials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));

    const materialMap = buildEngineMaterialMap(materials);

    const processes = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, id));

    const slabs = await db
      .select()
      .from(schema.slabs)
      .where(eq(schema.slabs.estimateId, id))
      .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

    const estimateForEngine: EngineEstimate = {
      id: estimate.id,
      tenantId,
      customerId: estimate.customerId || undefined,
      jobName: estimate.jobName,
      status: 'draft',
      layers: layers.map((l: (typeof layers)[number]) => ({
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
      processes: processes.map((p: (typeof processes)[number]) => ({
        id: p.id,
        name: p.name,
        costPerHour: parseFloat(p.costPerHour),
        speedBasis: p.speedBasis as 'kg_per_hour' | 'm_per_min' | 'pcs_per_min',
        speedValue: parseFloat(p.speedValue),
        setupHours: parseFloat(p.setupHours),
        enabled: p.enabled,
      })),
      slabs: slabs.map((s: (typeof slabs)[number]) => ({ quantityKg: parseFloat(s.quantityKg), pricePerKg: parseFloat(s.pricePerKg) })),
      displayCurrencyCode: estimate.displayCurrency,
      exchangeRateUsdToDisplay: parseFloat(estimate.exchangeRateUsdToDisplay),
      orderQuantityKg: estimate.orderQuantityKg ? parseFloat(estimate.orderQuantityKg) : (slabs[0]?.quantityKg ? parseFloat(slabs[0].quantityKg) : 1000),
      solventCostPerKgUsd: estimate.solventCostPerKgUsd ? parseFloat(estimate.solventCostPerKgUsd) : undefined,
      solventRatio: estimate.solventRatio ? parseFloat(estimate.solventRatio) : undefined,
      createdAt: estimate.createdAt,
      updatedAt: estimate.updatedAt,
    };

    const result = calculateEstimate(estimateForEngine, materialMap);

    // Simple HTML template — branded using tenant info; includes laminate stack SVG and slab table
    // Tenant colors/logo/terms are read from tenant record
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    const customerName = estimate.customerId ? ((await db.select({ companyName: schema.customers.companyName }).from(schema.customers).where(eq(schema.customers.id, estimate.customerId)))[0]?.companyName || 'Customer') : 'Customer';

    const laminateSvg = (() => {
      // Render simple stacked rectangles representing layers
      const total = layers.reduce((s: number, l: (typeof layers)[number]) => s + (parseFloat(l.micron) || 0), 0) || 1;
      const rects = layers.map((l: (typeof layers)[number], i: number) => {
        const h = Math.max(4, (parseFloat(l.micron) / total) * 200);
        const y = layers.slice(0, i).reduce((s: number, p: (typeof layers)[number]) => s + Math.max(4, (parseFloat(p.micron) / total) * 200), 0);
        return `<rect x="0" y="${y}" width="200" height="${h}" fill="#${(Math.abs(hashCode(l.materialId))%0xFFFFFF).toString(16).padStart(6,'0')}" />`;
      }).join('\n');
      return `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
    })();

    function hashCode(str: string) {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i) | 0;
      return h;
    }

    const fxRate = parseFloat(estimate.exchangeRateUsdToDisplay) || 1;
    const saleDisplay = usdToDisplay(result.estimate.salePricePerKg || parseFloat(estimate.salePricePerKg || '0'), fxRate);
    const slabRows = slabs.map((s: (typeof slabs)[number]) => {
      const qty = parseFloat(s.quantityKg);
      const price = saleDisplay;
      return `<tr><td>${qty.toLocaleString()}</td><td>${price.toFixed(2)}</td><td>${(qty * price).toFixed(2)}</td></tr>`;
    }).join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Proposal - ${estimate.jobName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;700&family=DM+Mono&display=swap" rel="stylesheet">
  <style>
    :root{--primary:${tenant.primaryColor || '#1a2744'};--navy:#1a2744;--muted:#6b7280}
    html,body{margin:0;padding:0;font-family:'DM Sans',system-ui,Arial;color:#111}
    @page{size:A4;margin:20mm}
    .page{width:100%;box-sizing:border-box;padding:20px}
    .brand-bar{background:var(--primary);color:#fff;padding:18px 24px;display:flex;align-items:center;justify-content:space-between}
    .brand-left{display:flex;align-items:center}
    .logo{height:56px;width:auto;border-radius:6px;background:#fff;padding:4px}
    .brand-title{margin-left:14px}
    .brand-title .tenant{font-family:'Playfair Display',serif;font-size:20px;font-weight:700}
    .brand-title .subtitle{font-size:12px;color:rgba(255,255,255,0.9)}

    .meta{display:flex;justify-content:space-between;margin:20px 0}
    .meta .left{max-width:65%}
    h1{font-family:'Playfair Display',serif;margin:6px 0 2px;font-size:28px}
    .job-info{color:var(--muted);font-size:13px}

    .content{display:flex;gap:24px}
    .left-col{flex:1}
    .right-col{width:260px}

    .laminate-box{border:1px solid #e6e6e6;padding:12px;border-radius:6px;background:#fff}
    .laminate-svg{display:block;margin:0 auto}

    .slab-table{width:100%;border-collapse:collapse;margin-top:18px}
    .slab-table th{background:var(--primary);color:#fff;padding:10px;text-align:left;font-weight:600}
    .slab-table td{padding:10px;border-bottom:1px solid #eee}

    .section-title{font-weight:700;margin-top:18px;margin-bottom:8px}

    .footer{margin-top:36px;border-top:1px solid #eee;padding-top:12px;color:#444;font-size:12px}
    .tc{white-space:pre-wrap}

    .page-footer{position:fixed;left:0;right:0;bottom:8px;text-align:center;font-size:11px;color:#999}
    .page-number:before{content:"Page " counter(page)}

    /* Print color adjustment */
    *{-webkit-print-color-adjust:exact}
  </style>
</head>
<body>
  <div class="page">
    <div class="brand-bar">
      <div class="brand-left">
        ${tenant.logo ? `<img src="${tenant.logo}" class="logo" alt="${tenant.name}"/>` : `<div style="width:56px;height:56px;background:#fff;border-radius:6px"></div>`}
        <div class="brand-title">
          <div class="tenant">${tenant.name}</div>
          <div class="subtitle">Proposal for ${customerName}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700">Proposal</div>
        <div style="font-size:12px">Ref: ${estimate.refNumber || ''}</div>
        <div style="font-size:12px">Date: ${new Date().toLocaleDateString()}</div>
      </div>
    </div>

    <div class="meta">
      <div class="left">
        <h1>${estimate.jobName}</h1>
        <div class="job-info">${estimate.productType} • ${estimate.printingWebClass} • ${estimate.id}</div>
      </div>
      <div class="right">
        <div class="laminate-box">
          <div style="font-weight:700;margin-bottom:8px">Laminate Stack</div>
          <div class="laminate-svg">${laminateSvg}</div>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="left-col">
        <div class="section-title">Estimate Summary</div>
        <div>Sale Price / kg: <strong>${estimate.displayCurrency} ${saleDisplay.toFixed(2)}</strong></div>
        ${profile.materialCostPerKg ? `<div>Material Cost / kg: <strong>${estimate.displayCurrency} ${usdToDisplay(result.estimate.materialCostPerKg || 0, fxRate).toFixed(2)}</strong></div>` : ''}
        ${profile.markupPercent ? `<div>Markup: <strong>${estimate.markupPercent}%</strong></div>` : ''}
        <div style="margin-top:12px" class="section-title">Slab Pricing</div>
        <table class="slab-table">
          <thead><tr><th>Quantity (kg)</th><th>Price / kg (${estimate.displayCurrency})</th><th>Total (${estimate.displayCurrency})</th></tr></thead>
          <tbody>
            ${slabRows}
          </tbody>
        </table>
      </div>

      <div class="right-col">
        <div class="section-title">Details</div>
        <div><strong>Customer</strong><div>${customerName}</div></div>
        <div style="margin-top:8px"><strong>Order Qty</strong><div>${estimate.orderQuantityKg || ''} kg</div></div>
        ${profile.operationCost ? `<div style="margin-top:12px" class="section-title">Processes</div>
        <div>${processes.map((p:any)=>`<div style="margin-bottom:6px"><strong>${p.name}</strong><div style="font-size:12px;color:#666">${p.costPerHour} / hr</div></div>`).join('')}</div>` : ''}
      </div>
    </div>

    <div class="footer">
      <div style="font-weight:700">Terms & Conditions</div>
      <div class="tc">${tenant.termsAndConditions || 'Standard terms apply.'}</div>
      ${tenant.footerText ? `<div style="margin-top:12px;font-size:11px;color:#666">${tenant.footerText}</div>` : ''}
    </div>

    <div class="page-footer"><span class="page-number"></span></div>
  </div>
</body>
</html>`;

    // Try to render PDF via puppeteer if available
    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      reply.header('Content-Type', 'application/pdf');
      return reply.send(pdf as any);
    } catch (err) {
      // Puppeteer not available or failed — try pdfkit + svg-to-pdfkit
      try {
        const { renderBrandedPdfKitProposal } = await import('../utils/pdf-proposal-kit');
        const pdfBuffer = await renderBrandedPdfKitProposal({
          tenantName: tenant.name || 'Proposal',
          primaryColor: tenant.primaryColor || '#1a2744',
          customerName,
          jobName: estimate.jobName,
          refNumber: estimate.refNumber || '',
          productType: estimate.productType,
          displayCurrency: estimate.displayCurrency,
          saleDisplay,
          materialCostDisplay: profile.materialCostPerKg
            ? usdToDisplay(result.estimate.materialCostPerKg || 0, fxRate)
            : undefined,
          markupPercent: profile.markupPercent ? parseFloat(estimate.markupPercent) : undefined,
          showMaterialCost: !!profile.materialCostPerKg,
          showMarkup: !!profile.markupPercent,
          slabs: slabs.map((s: (typeof slabs)[number]) => ({
            quantityKg: parseFloat(s.quantityKg),
            pricePerKg: saleDisplay,
          })),
          laminateSvg,
          termsAndConditions: tenant.termsAndConditions || undefined,
          footerText: tenant.footerText || undefined,
        });
        reply.header('Content-Type', 'application/pdf');
        return reply.send(pdfBuffer);
      } catch (err2) {
        // Fallback: return HTML if no PDF tool available
        reply.header('Content-Type', 'text/html');
        return reply.send(html);
      }
    }
  } catch (error: any) {
    console.error('Generate proposal PDF error:', error);
    return reply.status(500).send({ error: 'Failed to generate proposal PDF' });
  }
}

// Get single estimate by ID
async function getEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    // Get estimate
    const [estimate] = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId)
        )
      );

    if (!estimate) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    // Get layers
    const layers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, id))
      .orderBy(schema.layers.position);

    // Get processes
    const processes = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, id));

    // Get slabs
    const slabs = await db
      .select()
      .from(schema.slabs)
      .where(eq(schema.slabs.estimateId, id))
      .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

    // Get activity logs for this estimate
    const logs = await db
      .select()
      .from(schema.activityLogs)
      .where(and(eq(schema.activityLogs.entityType, 'estimate'), eq(schema.activityLogs.entityId, id)))
      .orderBy(desc(schema.activityLogs.createdAt));

    const requestUser = extractUserFromRequest(request);
    const profile = await getUserVisibilityProfile(db, requestUser.userId);

    // Enrich layers with material details
    const allMaterials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialMap = new Map<string, MaterialRow>(allMaterials.map((m: MaterialRow) => [m.id, m]));
    const enrichedLayers = layers.map((l: (typeof layers)[number]) => {
      const mat = materialMap.get(l.materialId);
      const stale = l.materialStale || !mat;
      return {
        ...l,
        materialName: l.materialName || mat?.name || 'Unknown',
        materialType: mat?.type ?? 'substrate',
        isSolventBased: mat?.isSolventBased ?? false,
        materialStale: stale,
      };
    });

    return reply.send({
      ...stripEstimateRow(estimate, profile),
      layers: enrichedLayers,
      processes: profile.operationCost ? processes : [],
      slabs: profile.slabTable ? slabs : [],
      activityLogs: logs || [],
      lastCalculatedAt: estimate.lastCalculatedAt,
    });
  } catch (error: any) {
    console.error('Get estimate error:', error);
    return reply.status(500).send({ error: 'Failed to get estimate' });
  }
}

// Update estimate
async function updateEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
    Body: Partial<z.infer<typeof EstimateCreateSchema>>;
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    // Check estimate exists and belongs to tenant
    const [existing] = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId)
        )
      );

    if (!existing) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    const [tenant] = await db
      .select({ quotationValidDays: schema.tenants.quotationValidDays })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    const updates: any = { updatedAt: new Date() };

    // Update basic fields if provided
    if (request.body.jobName !== undefined) updates.jobName = request.body.jobName;
    if (request.body.customerId !== undefined) updates.customerId = request.body.customerId;
    if (request.body.status !== undefined) {
      updates.status = request.body.status;
      if (request.body.status === 'sent' && existing.status !== 'sent') {
        const sentAt = new Date();
        const validDays = tenant?.quotationValidDays ?? 30;
        updates.sentAt = sentAt;
        updates.validUntil = new Date(sentAt.getTime() + validDays * 86400000);
        try {
          await db.insert(schema.proposals).values({
            tenantId,
            estimateId: id,
            validUntil: updates.validUntil,
            sentAt,
          });
        } catch (propErr) {
          console.warn('Failed to create proposal record:', propErr);
        }
      }
    }
    if (request.body.productType !== undefined) updates.productType = request.body.productType;
    if (request.body.printingWebClass !== undefined) updates.printingWebClass = request.body.printingWebClass;
    if (request.body.markupPercent !== undefined) updates.markupPercent = request.body.markupPercent.toString();
    if (request.body.platesPerKg !== undefined) updates.platesPerKg = request.body.platesPerKg.toString();
    if (request.body.deliveryPerKg !== undefined) updates.deliveryPerKg = request.body.deliveryPerKg.toString();
    if (request.body.dimensions !== undefined) updates.dimensions = request.body.dimensions;
    if (request.body.notes !== undefined) updates.notes = request.body.notes;
    if ((request.body as any).orderQuantityKg !== undefined) {
      updates.orderQuantityKg = String((request.body as any).orderQuantityKg);
    }
    if ((request.body as any).orderQuantityUnit !== undefined) {
      updates.orderQuantityUnit = (request.body as any).orderQuantityUnit;
    }
    if ((request.body as any).solventCostPerKgUsd !== undefined) {
      updates.solventCostPerKgUsd = String((request.body as any).solventCostPerKgUsd);
    }
    if ((request.body as any).solventRatio !== undefined) {
      updates.solventRatio = String((request.body as any).solventRatio);
    }

    const [updated] = await db
      .update(schema.estimates)
      .set(updates)
      .where(eq(schema.estimates.id, id))
      .returning();

    // Update layers (delete + re-insert)
    if (request.body.layers !== undefined) {
      await db.delete(schema.layers).where(eq(schema.layers.estimateId, id));
      for (const layer of request.body.layers) {
        await db.insert(schema.layers).values({
          estimateId: id,
          materialId: layer.materialId,
          micron: layer.micron.toString(),
          position: layer.position,
        });
      }
    }

    // Update processes (delete + re-insert)
    if (request.body.processes !== undefined) {
      await db.delete(schema.processes).where(eq(schema.processes.estimateId, id));
      for (const process of request.body.processes) {
        await db.insert(schema.processes).values({
          estimateId: id,
          name: process.name,
          costPerHour: process.costPerHour.toString(),
          speedBasis: process.speedBasis,
          speedValue: process.speedValue.toString(),
          setupHours: process.setupHours.toString(),
          enabled: process.enabled,
        });
      }
    }

    // Update slabs (delete + re-insert)
    if (request.body.slabs !== undefined) {
      await db.delete(schema.slabs).where(eq(schema.slabs.estimateId, id));
      for (let i = 0; i < request.body.slabs.length; i++) {
        const slab = request.body.slabs[i];
        await db.insert(schema.slabs).values({
          estimateId: id,
          quantityKg: slab.quantityKg.toString(),
          pricePerKg: slab.pricePerKg.toString(),
          sortOrder: i,
        });
      }
    }

    // If status changed, insert an activity log for audit trail
    if (updates.status) {
      try {
        const user = extractUserFromRequest(request);
        await db.insert(schema.activityLogs).values({
          tenantId,
          userId: user.userId,
          action: 'status_change',
          entityType: 'estimate',
          entityId: id,
          changes: { status: updates.status, note: request.body.note || null },
        });
      } catch (logErr) {
        console.warn('Failed to write activity log:', logErr);
      }
    }

    return reply.send(updated);
  } catch (error: any) {
    console.error('Update estimate error:', error);
    return reply.status(500).send({ error: 'Failed to update estimate' });
  }
}

// Delete estimate
async function deleteEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    const [deleted] = await db
      .update(schema.estimates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId)
        )
      )
      .returning();

    if (!deleted) {
      return reply.status(404).send({ error: 'Estimate not found' });
    }

    return reply.status(204).send();
  } catch (error: any) {
    console.error('Delete estimate error:', error);
    return reply.status(500).send({ error: 'Failed to delete estimate' });
  }
}

// Re-quote estimate (create new estimate from existing, refresh material prices)
async function requoteEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    // Get source estimate
    const [source] = await db
      .select()
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.id, id),
          eq(schema.estimates.tenantId, tenantId)
        )
      );

    if (!source) {
      return reply.status(404).send({ error: 'Source estimate not found' });
    }

    // Get tenant's current currency settings (PRD §7.5: re-quote uses current, not frozen)
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    // Get layers with current material prices
    const sourceLayers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, id))
      .orderBy(schema.layers.position);

    // Generate new ref number
    const now = new Date();
    const year = now.getFullYear();
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.estimates)
      .where(
        and(
          eq(schema.estimates.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${schema.estimates.createdAt}) = ${year}`
        )
      );
    
    const nextNumber = (count[0]?.count || 0) + 1;
    const newRefNumber = `QT-${year}-${String(nextNumber).padStart(5, '0')}`;

    // Create new estimate
    const [newEstimate] = await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId: source.customerId,
        refNumber: newRefNumber,
        jobName: `${source.jobName} (Re-quote)`,
        status: 'draft',
        productType: source.productType,
        printingWebClass: source.printingWebClass,
        dimensions: source.dimensions,
        markupPercent: source.markupPercent,
        platesPerKg: source.platesPerKg,
        deliveryPerKg: source.deliveryPerKg,
        // PRD §7.5: re-quote always uses current tenant currency/rate, not frozen source rate
        displayCurrency: tenant?.displayCurrency || source.displayCurrency,
        exchangeRateUsdToDisplay: tenant?.exchangeRateUsdToDisplay || source.exchangeRateUsdToDisplay,
        solventCostPerKgUsd: source.solventCostPerKgUsd,
        solventRatio: source.solventRatio,
        orderQuantityKg: source.orderQuantityKg,
        sourceEstimationId: id,
      })
      .returning();

    // Copy layers (will get fresh material prices on calculate)
    for (const layer of sourceLayers) {
      await db.insert(schema.layers).values({
        estimateId: newEstimate.id,
        materialId: layer.materialId,
        position: layer.position,
        micron: layer.micron,
      });
    }

    // Copy processes
    const sourceProcesses = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, id));

    for (const process of sourceProcesses) {
      await db.insert(schema.processes).values({
        estimateId: newEstimate.id,
        name: process.name,
        costPerHour: process.costPerHour,
        speedBasis: process.speedBasis,
        speedValue: process.speedValue,
        setupHours: process.setupHours,
        enabled: process.enabled,
      });
    }

    // Copy slabs
    const sourceSlabs = await db
      .select()
      .from(schema.slabs)
      .where(eq(schema.slabs.estimateId, id));

    for (const slab of sourceSlabs) {
      await db.insert(schema.slabs).values({
        estimateId: newEstimate.id,
        quantityKg: slab.quantityKg,
        pricePerKg: slab.pricePerKg,
      });
    }

    // Build price_changes: compare current material costs vs source
    const allMaterials = await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.tenantId, tenantId));
    const materialMap = new Map<string, MaterialRow>(allMaterials.map((m: MaterialRow) => [m.id, m]));

    const priceChanges = sourceLayers.map((layer: (typeof sourceLayers)[number]) => {
      const mat = materialMap.get(layer.materialId);
      const newCostUsd = mat ? parseFloat(mat.costPerKgUsd) : 0;
      const snapshotCost = layer.costPerKgUsd ? parseFloat(layer.costPerKgUsd) : null;
      const oldCostPerSqM = Number(layer.costPerM2 || 0);
      const micron = parseFloat(layer.micron);
      const density = layer.density ? parseFloat(layer.density) : mat ? parseFloat(mat.density) : 1;
      const gsm = micron * density;
      const oldCostUsd =
        snapshotCost ??
        (gsm > 0 && oldCostPerSqM > 0 ? (oldCostPerSqM / gsm) * 1000 : newCostUsd);
      const deltaPct = oldCostUsd > 0 ? ((newCostUsd - oldCostUsd) / oldCostUsd) * 100 : 0;
      return {
        materialId: layer.materialId,
        materialName: layer.materialName || mat?.name || 'Unknown',
        materialStale: !mat,
        oldCostUsd,
        newCostUsd,
        deltaPct: Math.round(deltaPct * 100) / 100,
      };
    });

    const warnings = priceChanges
      .filter((pc: { materialStale?: boolean }) => pc.materialStale)
      .map((pc: { materialName: string }) => `Material "${pc.materialName}" is no longer in the library — cost set to 0.`);

    // E6: auto-calculate with refreshed library prices
    let calcResult;
    try {
      calcResult = await calculateAndPersistEstimate(db, newEstimate.id, tenantId);
    } catch (calcErr) {
      console.warn('Requote auto-calculate failed:', calcErr);
    }

    const [refreshed] = await db
      .select()
      .from(schema.estimates)
      .where(eq(schema.estimates.id, newEstimate.id));

    return reply.status(201).send({
      ...refreshed,
      price_changes: priceChanges,
      warnings,
      calculated: calcResult
        ? {
            salePricePerKg: calcResult.estimate.salePricePerKg,
            materialCostPerKg: calcResult.estimate.materialCostPerKg,
            totalGsm: calcResult.estimate.totalGsm,
          }
        : undefined,
    });
  } catch (error: any) {
    console.error('Requote estimate error:', error);
    return reply.status(500).send({ error: 'Failed to requote estimate' });
  }
}

// Duplicate estimate — frozen prices (PRD §9.6)
async function duplicateEstimateRoute(
  _fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
    const tenantId = extractTenantFromRequest(request);
    const { id } = request.params;
    const db = getDatabase();

    const [source] = await db
      .select()
      .from(schema.estimates)
      .where(and(eq(schema.estimates.id, id), eq(schema.estimates.tenantId, tenantId)));

    if (!source) {
      return reply.status(404).send({ error: 'Source estimate not found' });
    }

    // Get tenant's current currency settings (frozen prices + current FX)
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId));

    const sourceLayers = await db
      .select()
      .from(schema.layers)
      .where(eq(schema.layers.estimateId, id))
      .orderBy(schema.layers.position);

    const sourceProcesses = await db
      .select()
      .from(schema.processes)
      .where(eq(schema.processes.estimateId, id));

    const sourceSlabs = await db
      .select()
      .from(schema.slabs)
      .where(eq(schema.slabs.estimateId, id))
      .orderBy(asc(schema.slabs.sortOrder), asc(schema.slabs.quantityKg));

    const newRefNumber = await generateRefNumber(db, tenantId);

    const [newEstimate] = await db
      .insert(schema.estimates)
      .values({
        tenantId,
        customerId: source.customerId,
        refNumber: newRefNumber,
        jobName: `${source.jobName} (Copy)`,
        status: 'draft',
        productType: source.productType,
        printingWebClass: source.printingWebClass,
        dimensions: source.dimensions,
        markupPercent: source.markupPercent,
        platesPerKg: source.platesPerKg,
        deliveryPerKg: source.deliveryPerKg,
        // Duplicate keeps frozen prices but uses current tenant currency/FX for display
        displayCurrency: tenant?.displayCurrency || source.displayCurrency,
        exchangeRateUsdToDisplay: tenant?.exchangeRateUsdToDisplay || source.exchangeRateUsdToDisplay,
        solventCostPerKgUsd: source.solventCostPerKgUsd,
        solventRatio: source.solventRatio,
        orderQuantityKg: source.orderQuantityKg,
        orderQuantityUnit: source.orderQuantityUnit,
        totalGsm: source.totalGsm,
        totalMicron: source.totalMicron,
        materialCostPerKg: source.materialCostPerKg,
        salePricePerKg: source.salePricePerKg,
        lastCalculatedAt: source.lastCalculatedAt,
        sourceEstimationId: id,
      })
      .returning();

    for (const layer of sourceLayers) {
      await db.insert(schema.layers).values({
        estimateId: newEstimate.id,
        materialId: layer.materialId,
        position: layer.position,
        micron: layer.micron,
        gsm: layer.gsm,
        costPerM2: layer.costPerM2,
        materialName: layer.materialName,
        density: layer.density,
        solidPercent: layer.solidPercent,
        wastePercent: layer.wastePercent,
        costPerKgUsd: layer.costPerKgUsd,
        materialStale: layer.materialStale,
      });
    }

    for (const process of sourceProcesses) {
      await db.insert(schema.processes).values({
        estimateId: newEstimate.id,
        name: process.name,
        costPerHour: process.costPerHour,
        speedBasis: process.speedBasis,
        speedValue: process.speedValue,
        setupHours: process.setupHours,
        enabled: process.enabled,
        runHours: process.runHours,
        totalCost: process.totalCost,
      });
    }

    for (let i = 0; i < sourceSlabs.length; i++) {
      const slab = sourceSlabs[i];
      await db.insert(schema.slabs).values({
        estimateId: newEstimate.id,
        quantityKg: slab.quantityKg,
        pricePerKg: slab.pricePerKg,
        sortOrder: slab.sortOrder ?? i,
      });
    }

    return reply.status(201).send(newEstimate);
  } catch (error: any) {
    console.error('Duplicate estimate error:', error);
    return reply.status(500).send({ error: 'Failed to duplicate estimate' });
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

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/estimates/:id',
    async (request, reply) => getEstimateRoute(fastify, request, reply)
  );

  fastify.patch<{ Params: { id: string }; Body: Partial<z.infer<typeof EstimateCreateSchema>> }>(
    '/api/v1/estimates/:id',
    async (request, reply) => updateEstimateRoute(fastify, request, reply)
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/estimates/:id',
    async (request, reply) => deleteEstimateRoute(fastify, request, reply)
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/calculate',
    async (request, reply) => calculateEstimateRoute(fastify, request, reply)
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/requote',
    async (request, reply) => requoteEstimateRoute(fastify, request, reply)
  );

  fastify.post<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/duplicate',
    async (request, reply) => duplicateEstimateRoute(fastify, request, reply)
  );

  fastify.get<{ Params: { id: string } }>(
    '/api/v1/estimates/:id/proposal-pdf',
    async (request, reply) => generateProposalPdfRoute(fastify, request, reply)
  );
}
