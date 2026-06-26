import type { Material } from '@es/engine';
import type { materials } from '../db/schema';
import type { LaminationRecipe } from '@es/engine';

export type MaterialRow = typeof materials.$inferSelect;

export function toEngineMaterial(m: MaterialRow): Material {
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    solidPercent: m.solidPercent,
    density: parseFloat(m.density),
    costPerKgUsd: parseFloat(m.costPerKgUsd),
    wastePercent: m.wastePercent,
    isSolventBased: m.isSolventBased ?? false,
    substrateFamily: m.substrateFamily,
    substrateGrade: m.substrateGrade,
    hoover: m.hoover,
    marketPriceUsd: m.marketPriceUsd ? parseFloat(m.marketPriceUsd) : null,
    laminationRecipe: (m.laminationRecipe as LaminationRecipe | null) ?? null,
    laminationTier: (m.laminationRecipe as LaminationRecipe | null)?.tier ?? null,
  };
}

export function buildEngineMaterialMap(rows: MaterialRow[]): Map<string, Material> {
  return new Map(rows.map((m) => [m.id, toEngineMaterial(m)]));
}
