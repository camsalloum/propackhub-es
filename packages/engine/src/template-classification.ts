/** ES template groups A/B/C — substrate rules (LOCKED_DECISIONS #17, PRD §6.2). */

import type { LayerType } from './types';

export type MaterialClass = 'PE' | 'Non PE';
export type StructureType = 'Mono' | 'Multilayer';
export type ProductTypeCode = 'roll' | 'sleeve' | 'pouch';

export interface ClassifiableMaterial {
  type: string;
  substrateFamily?: string | null;
}

export interface TemplateClassification {
  materialClass?: string | null;
  structureType?: string | null;
  productType?: ProductTypeCode | null;
}

export const PACKAGING_SUBSTRATE_FAMILY = 'PACKAGING';

function normFamily(family?: string | null): string {
  return (family || '').trim().toUpperCase();
}

/** Whether a substrate family is valid for the template classification. */
export function substrateFamilyAllowed(
  substrateFamily: string,
  ctx: TemplateClassification
): boolean {
  const fam = normFamily(substrateFamily);
  if (!fam || fam === PACKAGING_SUBSTRATE_FAMILY) return false;

  const mc = ctx.materialClass?.trim();
  const st = ctx.structureType?.trim();
  const pt = ctx.productType;

  if (mc === 'PE' && st === 'Mono') {
    return fam === 'PE';
  }

  if (mc === 'Non PE' && st === 'Mono') {
    if (pt === 'sleeve') {
      return fam === 'SLEEVE' || fam === 'PET';
    }
    return fam !== 'PE';
  }

  if (st === 'Multilayer') {
    return true;
  }

  return true;
}

/** Filter library materials for a template layer row. */
export function materialAllowedForTemplateLayer(
  material: ClassifiableMaterial,
  layerType: LayerType,
  ctx: TemplateClassification
): boolean {
  if (material.type !== layerType) return false;
  if (layerType === 'ink' || layerType === 'adhesive') return true;
  return substrateFamilyAllowed(material.substrateFamily || '', ctx);
}

export function filterMaterialsForTemplateLayer<
  T extends ClassifiableMaterial & { type: string }
>(materials: T[], layerType: LayerType, ctx: TemplateClassification): T[] {
  return materials.filter((m) => materialAllowedForTemplateLayer(m, layerType, ctx));
}
