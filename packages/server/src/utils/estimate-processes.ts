import {
  computeStructureSignature,
  deriveProcessesFromStructure,
  type ProcessCatalog,
} from '@es/engine';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { schema } from '../db';
import type { Database } from '../db';

type Db = Database;
type EstimateRow = typeof schema.estimates.$inferSelect;
type ProcessRow = typeof schema.processes.$inferSelect;
type TemplateRow = typeof schema.structureTemplates.$inferSelect;

export type EstimateStructureLayer = {
  type: 'substrate' | 'ink' | 'adhesive';
  position: number;
};

type ProcessReferenceRow = {
  code: string;
  label?: string;
  costPerHour?: number;
  costPerKgUsd?: number;
  speedBasis?: string;
  speedValue?: number;
  setupHours?: number;
};

export type TemplateProcessDefault = {
  process_key: string;
  enabled?: boolean;
  process_quantity?: number;
};

type ProcessReferenceMap = Map<string, ProcessReferenceRow>;

const PROCESS_FALLBACK_DEFAULTS = {
  label: '',
  code: '',
  description: '',
  costPerHour: 50,
  costPerKgUsd: 0,
  speedBasis: 'kg_per_hour',
  speedValue: 100,
  setupHours: 1,
};

const PROCESS_LABEL_FALLBACK: Record<string, string> = {
  extrusion: 'Extrusion',
  printing: 'Printing',
  lamination: 'Lamination',
  slitting: 'Slitting',
  pouch_making: 'Pouch Making',
  bag_making: 'Bag Making',
  seaming: 'Seaming',
};

function parseFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeStructureLayerType(value: unknown): 'substrate' | 'ink' | 'adhesive' {
  const token = String(value ?? '').trim().toLowerCase();
  if (token === 'ink') return 'ink';
  if (token === 'adhesive') return 'adhesive';
  return 'substrate';
}

function normalizeTemplateDefaults(value: unknown): TemplateProcessDefault[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = item as Record<string, unknown>;
      const processKey = String(raw.process_key ?? '').trim();
      if (!processKey) return null;
      const quantity = parseFiniteNumber(raw.process_quantity);
      return {
        process_key: processKey,
        enabled: raw.enabled !== false,
        process_quantity: quantity > 0 ? Math.round(quantity) : 1,
      } as TemplateProcessDefault;
    })
    .filter((row): row is TemplateProcessDefault => row != null);
}

function processRefByCode(processRefMap: ProcessReferenceMap, key: string): ProcessReferenceRow {
  const byCode = processRefMap.get(key);
  if (byCode) return byCode;
  return {
    ...PROCESS_FALLBACK_DEFAULTS,
    code: key,
    label: PROCESS_LABEL_FALLBACK[key] ?? key,
  };
}

function processCatalogFromReference(processRefMap: ProcessReferenceMap): ProcessCatalog {
  const catalog: ProcessCatalog = {};
  for (const key of Object.keys(PROCESS_LABEL_FALLBACK)) {
    const ref = processRefByCode(processRefMap, key);
    catalog[key as keyof ProcessCatalog] = {
      label: ref.label ?? PROCESS_LABEL_FALLBACK[key],
      costPerKgUsd: parseFiniteNumber(ref.costPerKgUsd),
    };
  }
  return catalog;
}

export async function loadProcessReferenceMap(): Promise<ProcessReferenceMap> {
  const masterRef = await import('../db/platform-master-data').then((m) =>
    m.buildMasterDataReferenceFromDb()
  );
  return new Map((masterRef.processRows ?? []).map((row) => [row.code, row]));
}

export function resolveEstimateMaterialClass(
  estimate: EstimateRow,
  template: TemplateRow | null
): 'PE' | 'Non PE' {
  const dimensions = (estimate.dimensions ?? {}) as {
    templateClassification?: { materialClass?: string };
  };
  const fromDimensions = dimensions.templateClassification?.materialClass;
  if (fromDimensions === 'PE' || fromDimensions === 'Non PE') {
    return fromDimensions;
  }
  const templateClass = template?.materialClass;
  if (templateClass === 'PE' || templateClass === 'Non PE') {
    return templateClass;
  }
  return 'Non PE';
}

export function templateLayersToStructure(
  template: TemplateRow
): EstimateStructureLayer[] {
  const rawLayers = Array.isArray(template.defaultLayers)
    ? (template.defaultLayers as Array<Record<string, unknown>>)
    : [];

  return rawLayers.map((layer, index) => ({
    type: normalizeStructureLayerType(layer.layer_type ?? layer.type),
    position: parseFiniteNumber(layer.layer_order) > 0
      ? Math.round(parseFiniteNumber(layer.layer_order))
      : index + 1,
  }));
}

export function computeTemplateStructureSignature(
  template: TemplateRow
): string | null {
  const structureLayers = templateLayersToStructure(template);
  if (!structureLayers.length) return null;
  return computeStructureSignature(structureLayers, template.productType);
}

export async function loadEstimateStructureLayers(
  db: Db,
  estimateId: string
): Promise<EstimateStructureLayer[]> {
  const rows = await db
    .select({
      position: schema.layers.position,
      materialType: schema.materials.type,
    })
    .from(schema.layers)
    .leftJoin(schema.materials, eq(schema.layers.materialId, schema.materials.id))
    .where(eq(schema.layers.estimateId, estimateId))
    .orderBy(asc(schema.layers.position));

  return rows.map((row, index) => ({
    type: normalizeStructureLayerType(row.materialType),
    position: row.position ?? index + 1,
  }));
}

export function computeEstimateStructureSignature(
  layers: EstimateStructureLayer[],
  productType: EstimateRow['productType']
): string {
  return computeStructureSignature(layers, productType);
}

export async function loadRawEstimateProcesses(db: Db, estimateId: string): Promise<ProcessRow[]> {
  try {
    return await db.select().from(schema.processes).where(eq(schema.processes.estimateId, estimateId));
  } catch (processErr: any) {
    const missingProcessColumn =
      processErr?.code === '42703' ||
      /column .* does not exist/i.test(String(processErr?.message || ''));
    if (!missingProcessColumn) throw processErr;

    const legacyResult = await db.execute(sql`
      SELECT
        id,
        estimate_id,
        name,
        cost_per_hour,
        speed_basis,
        speed_value,
        setup_hours,
        enabled,
        run_hours,
        total_cost,
        created_at,
        updated_at
      FROM processes
      WHERE estimate_id = ${estimateId}
    `);
    const legacyRows = Array.isArray((legacyResult as any)?.rows)
      ? (legacyResult as any).rows
      : (legacyResult as any);

    return (legacyRows as any[]).map((row) => ({
      id: row.id,
      estimateId: row.estimate_id,
      name: row.name,
      processKey: null,
      processQuantity: 1,
      costPerHour: String(row.cost_per_hour ?? '0'),
      costPerKgUsd: '0',
      speedBasis: row.speed_basis,
      speedValue: String(row.speed_value ?? '0'),
      setupHours: String(row.setup_hours ?? '0'),
      enabled: Boolean(row.enabled),
      runHours: row.run_hours != null ? String(row.run_hours) : null,
      totalCost: row.total_cost != null ? String(row.total_cost) : null,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    })) as ProcessRow[];
  }
}

export type ProcessInsertMode = 'modern' | 'legacy';

export async function detectProcessInsertMode(dbLike: Db): Promise<ProcessInsertMode> {
  const result = await dbLike.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'processes'
  `);
  const rows = Array.isArray((result as { rows?: unknown[] })?.rows)
    ? (result as { rows: unknown[] }).rows
    : (result as unknown[]);
  const columns = new Set<string>(
    rows.map((r) => String((r as { column_name: string }).column_name))
  );
  const hasModernColumns =
    columns.has('process_key') &&
    columns.has('process_quantity') &&
    columns.has('cost_per_kg_usd');
  return hasModernColumns ? 'modern' : 'legacy';
}

export async function insertProcessCompat(
  dbLike: Db,
  mode: ProcessInsertMode,
  values: {
    estimateId: string;
    name: string;
    processKey?: string | null;
    processQuantity?: number;
    costPerHour: string;
    costPerKgUsd?: string;
    speedBasis: string;
    speedValue: string;
    setupHours: string;
    enabled: boolean;
    runHours?: string | null;
    totalCost?: string | null;
  }
): Promise<void> {
  if (mode === 'modern') {
    await dbLike.insert(schema.processes).values({
      estimateId: values.estimateId,
      name: values.name,
      processKey: values.processKey ?? null,
      processQuantity: values.processQuantity ?? 1,
      costPerHour: values.costPerHour,
      costPerKgUsd: values.costPerKgUsd ?? '0',
      speedBasis: values.speedBasis,
      speedValue: values.speedValue,
      setupHours: values.setupHours,
      enabled: values.enabled,
      runHours: values.runHours ?? null,
      totalCost: values.totalCost ?? null,
    });
    return;
  }

  await dbLike.execute(sql`
    INSERT INTO processes (
      estimate_id,
      name,
      cost_per_hour,
      speed_basis,
      speed_value,
      setup_hours,
      enabled,
      run_hours,
      total_cost
    ) VALUES (
      ${values.estimateId},
      ${values.name},
      ${values.costPerHour},
      ${values.speedBasis},
      ${values.speedValue},
      ${values.setupHours},
      ${values.enabled},
      ${values.runHours ?? null},
      ${values.totalCost ?? null}
    )
  `);
}

export async function insertEstimateProcess(
  dbLike: Db,
  values: Parameters<typeof insertProcessCompat>[2]
): Promise<void> {
  const mode = await detectProcessInsertMode(dbLike);
  await insertProcessCompat(dbLike, mode, values);
}

export async function findEstimateTemplate(db: Db, estimate: EstimateRow): Promise<TemplateRow | null> {
  const activeTenantFilter = and(
    eq(schema.structureTemplates.tenantId, estimate.tenantId),
    eq(schema.structureTemplates.isActive, true)
  );

  if (estimate.sourceTemplateKey?.trim()) {
    const byKey = await db
      .select()
      .from(schema.structureTemplates)
      .where(
        and(
          activeTenantFilter,
          eq(schema.structureTemplates.templateKey, estimate.sourceTemplateKey.trim())
        )
      )
      .orderBy(desc(schema.structureTemplates.updatedAt))
      .limit(1);
    if (byKey[0]) return byKey[0];
  }

  if (!estimate.jobName) return null;
  const cleanName = estimate.jobName.replace(/\s*·.*$/, '').trim();

  const byCleanName = await db
    .select()
    .from(schema.structureTemplates)
    .where(and(activeTenantFilter, eq(schema.structureTemplates.name, cleanName)))
    .orderBy(desc(schema.structureTemplates.updatedAt))
    .limit(1);
  if (byCleanName[0]) return byCleanName[0];

  const byExactName = await db
    .select()
    .from(schema.structureTemplates)
    .where(and(activeTenantFilter, eq(schema.structureTemplates.name, estimate.jobName)))
    .orderBy(desc(schema.structureTemplates.updatedAt))
    .limit(1);

  return byExactName[0] ?? null;
}

export function buildProcessesFromTemplateDefaults(
  estimateId: string,
  defaults: TemplateProcessDefault[],
  processRefMap: ProcessReferenceMap,
  idPrefix: string
): ProcessRow[] {
  return defaults.map((proc, index) => {
    const ref = processRefByCode(processRefMap, proc.process_key);
    return {
      id: `${estimateId}:${idPrefix}:${proc.process_key}:${index}`,
      estimateId,
      name: ref.label || PROCESS_LABEL_FALLBACK[proc.process_key] || proc.process_key,
      processKey: proc.process_key,
      processQuantity: proc.process_quantity ?? 1,
      costPerHour: String(ref.costPerHour ?? PROCESS_FALLBACK_DEFAULTS.costPerHour),
      costPerKgUsd: String(ref.costPerKgUsd ?? PROCESS_FALLBACK_DEFAULTS.costPerKgUsd),
      speedBasis: ref.speedBasis ?? PROCESS_FALLBACK_DEFAULTS.speedBasis,
      speedValue: String(ref.speedValue ?? PROCESS_FALLBACK_DEFAULTS.speedValue),
      setupHours: String(ref.setupHours ?? PROCESS_FALLBACK_DEFAULTS.setupHours),
      enabled: proc.enabled !== false,
      runHours: null,
      totalCost: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export function buildProcessesFromDerived(
  estimateId: string,
  derived: ReturnType<typeof deriveProcessesFromStructure>,
  processRefMap: ProcessReferenceMap,
  idPrefix: string
): ProcessRow[] {
  return derived.map((proc, index) => {
    const ref = processRefByCode(processRefMap, proc.process_key);
    return {
      id: `${estimateId}:${idPrefix}:${proc.process_key}:${index}`,
      estimateId,
      name: proc.label || ref.label || PROCESS_LABEL_FALLBACK[proc.process_key] || proc.process_key,
      processKey: proc.process_key,
      processQuantity: proc.process_quantity,
      costPerHour: String(ref.costPerHour ?? PROCESS_FALLBACK_DEFAULTS.costPerHour),
      costPerKgUsd: String(proc.costPerKgUsd),
      speedBasis: ref.speedBasis ?? PROCESS_FALLBACK_DEFAULTS.speedBasis,
      speedValue: String(ref.speedValue ?? PROCESS_FALLBACK_DEFAULTS.speedValue),
      setupHours: String(ref.setupHours ?? PROCESS_FALLBACK_DEFAULTS.setupHours),
      enabled: proc.enabled,
      runHours: null,
      totalCost: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export async function resolveEstimateProcesses(
  db: Db,
  estimate: EstimateRow
): Promise<ProcessRow[]> {
  const raw = await loadRawEstimateProcesses(db, estimate.id);
  const tmpl = await findEstimateTemplate(db, estimate);

  // Cache structure layers lazily — needed for a live fork check and/or derivation.
  let cachedStructureLayers: EstimateStructureLayer[] | null = null;
  const getStructureLayers = async () => {
    if (cachedStructureLayers === null) {
      cachedStructureLayers = await loadEstimateStructureLayers(db, estimate.id);
    }
    return cachedStructureLayers;
  };

  // Compute LIVE fork status from the current structure signature rather than trusting the
  // persisted `structureForked` column, which is only refreshed on write (PATCH/instantiate).
  // Estimates created/edited before this flag existed (or never re-saved since) would otherwise
  // be misread as "template-locked" even though their layers already diverged from the template
  // (the exact Triplex 1.20-vs-1.90 bug). Once processes are user-customized they stay frozen
  // regardless of further structure drift, so the live check only applies before that point.
  let forked = Boolean(estimate.structureForked);
  if (!estimate.processesCustomized) {
    const templateSignature = tmpl ? computeTemplateStructureSignature(tmpl) : null;
    if (!templateSignature) {
      // No template to compare against (scratch / custom product group) -> always user-owned.
      forked = true;
    } else {
      const structureLayers = await getStructureLayers();
      if (structureLayers.length) {
        const currentSignature = computeEstimateStructureSignature(
          structureLayers,
          estimate.productType
        );
        forked = currentSignature !== templateSignature;
      }
    }
  }

  // State 1: template-locked authority (admin defaults win).
  if (!forked) {
    const defaults = normalizeTemplateDefaults(tmpl?.defaultProcesses);
    if (!defaults.length) return raw;

    const processRefMap = await loadProcessReferenceMap();
    return buildProcessesFromTemplateDefaults(estimate.id, defaults, processRefMap, 'template');
  }

  // State 3: user-customized processes remain frozen (DB rows are authoritative).
  if (estimate.processesCustomized) {
    return raw;
  }

  // State 2: forked but not customized -> derive from current structure.
  const structureLayers = await getStructureLayers();
  if (!structureLayers.length) return raw;

  const processRefMap = await loadProcessReferenceMap();
  const derived = deriveProcessesFromStructure(
    {
      layers: structureLayers,
      productType: estimate.productType,
      materialClass: resolveEstimateMaterialClass(estimate, tmpl),
    },
    processCatalogFromReference(processRefMap)
  );

  return buildProcessesFromDerived(estimate.id, derived, processRefMap, 'derived');
}
