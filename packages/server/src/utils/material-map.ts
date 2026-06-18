import type { Material } from '@es/engine';
import type { materials } from '../db/schema';

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
  };
}

export function buildEngineMaterialMap(rows: MaterialRow[]): Map<string, Material> {
  return new Map(rows.map((m) => [m.id, toEngineMaterial(m)]));
}
