// materialFamily — substrate layer helpers for template cards and catalog.

import { substrateFilmHex } from './substrateFilmColor';

const NON_SUBSTRATE_TYPES = new Set(['ink', 'adhesive', 'solvent', 'accessory']);

/** True when a layer row is a substrate film (preview shows these only). */
export function isSubstrateLayerType(type?: string | null): boolean {
  if (!type) return false;
  return !NON_SUBSTRATE_TYPES.has(type.toLowerCase());
}

/** Resolve layer type from template row + optional material catalog row. */
export function resolveLayerType(
  layerType?: string | null,
  materialType?: string | null,
): string {
  return (layerType || materialType || 'substrate').toLowerCase();
}

/** Inline flat fill — same rules as estimate layer build-up. */
export function substrateFilmStyle(
  material: string,
  family?: string | null,
): { background: string } {
  return { background: substrateFilmHex(material, family) };
}

/** @deprecated Use substrateFilmStyle */
export type SubstrateFamily = 'pet' | 'bopp' | 'pe' | 'alu' | 'paper';

/** @deprecated Use substrateFilmStyle */
export function substrateFilmClasses(_material: string): string {
  return 'lam3d__slab';
}

/** @deprecated */
export function substrateFamily(material: string): SubstrateFamily {
  const n = (material || '').toLowerCase();
  if (n.includes('alu') || n.includes('foil') || n.includes('met')) return 'alu';
  if (n.includes('paper') || n.includes('kraft')) return 'paper';
  if (n.includes('pet') || n.includes('polyester')) return 'pet';
  if (n.includes('bopp') || n.includes('opp') || n.includes('cpp')) return 'bopp';
  return 'pe';
}

/** @deprecated */
export type MaterialFamily = SubstrateFamily | 'ink' | 'adh';

/** @deprecated */
export function materialFamily(material: string, type?: string): MaterialFamily {
  if (type === 'ink') return 'ink';
  if (type === 'adhesive') return 'adh';
  return substrateFamily(material);
}

/** @deprecated */
export function materialFamilyColorVar(family: MaterialFamily): string {
  return `rgb(var(--mat-${family}))`;
}
