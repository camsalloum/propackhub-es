import type { ProcessCatalog, ProcessMaterialClass, ProcessProductType } from '@es/engine';
import { deriveProcessesFromStructure, computeStructureSignature } from '@es/engine';
import type { ProcessCostRow } from '../../../lib/estimateConfigure';
import { engineTypeForFamily } from '../../../lib/productCatalog';
import type { LayerItem, MaterialItem } from '../types';

export type DerivedProcessUiRow = {
  name: string;
  processKey: string;
  enabled: boolean;
  processQuantity: number;
  costPerKgUsd: number;
};

function catalogFromCostRows(rows: ProcessCostRow[]): ProcessCatalog {
  const catalog: ProcessCatalog = {};
  for (const row of rows) {
    const code = String(row.code ?? '').trim().toLowerCase();
    if (!code) continue;
    (catalog as Record<string, { label: string; costPerKgUsd: number }>)[code] = {
      label: row.label,
      costPerKgUsd: row.costPerKgUsd ?? 0,
    };
  }
  return catalog;
}

export function inferMaterialClassFromLayers(
  layers: LayerItem[],
  materials: MaterialItem[]
): ProcessMaterialClass {
  const substrate = layers.find((l) => l.materialType === 'substrate');
  if (!substrate?.materialId) return 'Non PE';
  const mat = materials.find((m) => m.id === substrate.materialId) as
    | (MaterialItem & { substrateFamily?: string | null })
    | undefined;
  const family = String(mat?.substrateFamily ?? '').toUpperCase();
  return family === 'PE' ? 'PE' : 'Non PE';
}

export function layersStructureSignature(
  layers: LayerItem[],
  productType: string,
  _productTypeOptions?: Array<{ value: string }>
): string {
  const engineType = (engineTypeForFamily(productType) ?? productType) as string;
  return computeStructureSignature(
    layers.map((l, i) => ({
      type: l.materialType,
      position: typeof l.position === 'number' ? l.position : i,
    })),
    engineType
  );
}

export function deriveUiProcessesFromLayers(input: {
  layers: LayerItem[];
  materials: MaterialItem[];
  productType: string;
  materialClass?: ProcessMaterialClass | null;
  processCostCatalog: ProcessCostRow[];
}): DerivedProcessUiRow[] {
  const productType = (engineTypeForFamily(input.productType) ??
    input.productType) as ProcessProductType;
  const materialClass =
    input.materialClass ?? inferMaterialClassFromLayers(input.layers, input.materials);
  const catalog = catalogFromCostRows(input.processCostCatalog);
  const derived = deriveProcessesFromStructure(
    {
      layers: input.layers.map((l) => ({ type: l.materialType as 'substrate' | 'ink' | 'adhesive' })),
      productType: ['roll', 'sleeve', 'pouch', 'bag'].includes(productType)
        ? productType
        : 'roll',
      materialClass,
    },
    catalog
  );

  return derived.map((p) => ({
    name: p.label,
    processKey: p.process_key,
    enabled: p.enabled,
    processQuantity: p.process_quantity,
    costPerKgUsd: p.costPerKgUsd,
  }));
}

export function processDiffSummary(
  before: Array<{ processKey?: string | null; name?: string; enabled?: boolean; processQuantity?: number }>,
  after: DerivedProcessUiRow[]
): string[] {
  const lines: string[] = [];
  const beforeMap = new Map(
    before.map((p) => [String(p.processKey ?? p.name ?? '').toLowerCase(), p])
  );
  const afterMap = new Map(after.map((p) => [p.processKey.toLowerCase(), p]));

  for (const [key, row] of afterMap) {
    const prev = beforeMap.get(key);
    if (!prev || prev.enabled === false) {
      lines.push(`+ ${row.name} ×${row.processQuantity}`);
      continue;
    }
    const prevQty = Number(prev.processQuantity ?? 1);
    if (prevQty !== row.processQuantity) {
      lines.push(`${row.name}: ×${prevQty} → ×${row.processQuantity}`);
    }
  }
  for (const [key, prev] of beforeMap) {
    if (prev.enabled === false) continue;
    if (!afterMap.has(key)) {
      lines.push(`− ${prev.name || key}`);
    }
  }
  return lines;
}
