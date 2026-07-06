// materialFamily — classify a laminate layer into a colour-coded material family
// used by the template cards' 3D stack (see `--mat-*` tokens in index.css).
//
// Colour is data: each family maps to one token so a structure reads at a glance
// (teal PET, blue BOPP, green PE, silver Alu, amber Paper, magenta Ink, rose
// Adhesive). Ink/adhesive are driven by layer TYPE; substrates by material name.

export type MaterialFamily = 'pet' | 'bopp' | 'pe' | 'alu' | 'paper' | 'ink' | 'adh';

/**
 * Resolve the material family for a layer.
 *
 * @param material Free-text material name (e.g. "LDPE natural", "Met-PET", "BOPP").
 * @param type     Layer type; `ink` and `adhesive` take precedence over the name.
 */
export function materialFamily(material: string, type?: string): MaterialFamily {
  if (type === 'ink') return 'ink';
  if (type === 'adhesive') return 'adh';

  const n = (material || '').toLowerCase();

  // Metallised / foil first — "met-pet" and "alu" must not fall through to PET/PE.
  if (n.includes('alu') || n.includes('foil') || n.includes('met')) return 'alu';
  if (n.includes('paper') || n.includes('kraft')) return 'paper';
  if (n.includes('pet') || n.includes('polyester')) return 'pet';
  if (n.includes('bopp') || n.includes('opp') || n.includes('cpp')) return 'bopp';
  if (
    n.includes('ldpe') ||
    n.includes('lldpe') ||
    n.includes('hdpe') ||
    n.includes('mdpe') ||
    n.includes('shrink') ||
    n.includes('cast') ||
    n.includes('pp') ||
    n.includes('pe')
  ) {
    return 'pe';
  }

  // Unknown substrate → PE green (the most common film family here).
  return 'pe';
}

/** CSS custom-property reference for a family's base colour (e.g. `rgb(var(--mat-pe))`). */
export function materialFamilyColorVar(family: MaterialFamily): string {
  return `rgb(var(--mat-${family}))`;
}
