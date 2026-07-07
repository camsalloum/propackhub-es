// substrateFilmColor — flat substrate swatch colors (estimate layer build-up + template cards).
// No gradients or lighting; priority order matches FilmStackVisualizer.layerAppearance.

function materialKey(material: string): string {
  return (material || '').toUpperCase();
}

export function isMetallizedMaterial(material: string): boolean {
  return /\d*ALU|AL\/|VMPET|VMOPP|METALL|METPET|METBOPP|FOIL|SILVER|ALUMIN/i.test(
    materialKey(material),
  );
}

export function isPaperMaterial(material: string): boolean {
  return /PAPER|KRAFT|C1S|C2S|MG\s*PAPER|GP\s*PAPER|BOARD/i.test(materialKey(material));
}

export function isWhiteMaterial(material: string): boolean {
  return /WHITE|OPAQUE/i.test(materialKey(material));
}

export function isNaturalMaterial(material: string): boolean {
  return /NATURAL/i.test(materialKey(material)) && !isWhiteMaterial(material);
}

export function isTransparentMaterial(material: string): boolean {
  return /TRANSPARENT|CLEAR/i.test(materialKey(material)) && !isWhiteMaterial(material);
}

/** Family fallback when name modifiers do not apply (matches FilmStackVisualizer.substrateBg). */
function substrateFamilyHex(family?: string | null): string {
  const f = (family || '').toUpperCase();
  if (f.includes('PET')) return '#7A94B0';
  if (f.includes('BOPP') || f.includes('OPP')) return '#B8CCE4';
  if (f.includes('AL') || f.includes('MET') || f.includes('FOIL')) return '#8B9AAD';
  if (f.includes('NY') || f.includes('PA')) return '#A89A8C';
  if (f.includes('EVOH')) return '#C4B090';
  if (f.includes('PE')) return '#9AACC4';
  return '#94A8C0';
}

/**
 * Flat fill for a substrate film layer.
 * Transparent → gray, white → white, alu/metallized → metal, natural → kraft.
 */
export function substrateFilmHex(material: string, family?: string | null): string {
  if (isMetallizedMaterial(material)) return '#8B9AAD';
  if (isPaperMaterial(material)) return '#C9A96E';
  if (isWhiteMaterial(material)) return '#FFFFFF';
  if (isNaturalMaterial(material)) return '#C9A96E';
  if (isTransparentMaterial(material)) return '#7A94B0';

  const name = materialKey(material);
  if (name.includes('PET') || name.includes('POLYESTER')) return '#7A94B0';
  if (name.includes('BOPP') || name.includes('OPP') || name.includes('CPP')) return '#B8CCE4';

  return substrateFamilyHex(family);
}
