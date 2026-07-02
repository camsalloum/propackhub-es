export interface StructureSignatureLayer {
  type: string;
  position?: number | null;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeStructureSignature(
  layers: StructureSignatureLayer[],
  productType: string
): string {
  const ordered = layers
    .map((layer, index) => ({
      type: normalizeToken(layer.type),
      position:
        typeof layer.position === 'number' && Number.isFinite(layer.position)
          ? layer.position
          : Number.POSITIVE_INFINITY,
      index,
    }))
    .sort((a, b) => a.position - b.position || a.index - b.index)
    .map((layer, index) => `${index}:${layer.type}`);

  const canonical = `v1|product:${normalizeToken(productType)}|layers:${ordered.join('|')}`;
  return `v1_${fnv1a32(canonical)}`;
}
