/** Interim source_template_key until Phase D adds structure_templates.template_key. */

function slugPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nameTierSlug(name: string): string | null {
  const dotTier = name.match(/[·•]\s*(.+)$/);
  if (dotTier) return slugPart(dotTier[1]);
  return null;
}

/** Standard template compound key — uses name tier (Duplex/Triplex) when structure_type alone collides. */
export function deriveStandardTemplateKey(template: {
  pebiParentPg: string;
  name?: string;
  materialClass?: string | null;
  structureType?: string | null;
}): string {
  const parts = [slugPart(template.pebiParentPg)];
  if (template.materialClass) parts.push(slugPart(template.materialClass));
  const tierFromName = template.name ? nameTierSlug(template.name) : null;
  if (tierFromName) parts.push(tierFromName);
  else if (template.structureType) parts.push(slugPart(template.structureType));
  return parts.filter(Boolean).join('-');
}

/** My Templates — tenant-local key (not in PEBI catalog). */
export function deriveTenantTemplateKey(name: string, templateId: string): string {
  const shortId = templateId.replace(/-/g, '').slice(0, 8);
  return `tenant-${slugPart(name)}-${shortId}`;
}

export type TemplateKeyRow = {
  id: string;
  name: string;
  pebiParentPg: string;
  materialClass: string | null;
  structureType: string | null;
  isStandard: boolean;
  isActive: boolean | null;
  templateKey: string | null;
  displayOrder: number;
  createdAt?: Date | null;
};

function expectedTemplateKey(t: TemplateKeyRow): string {
  if (t.isStandard) {
    return deriveStandardTemplateKey({
      pebiParentPg: t.pebiParentPg,
      name: t.name,
      materialClass: t.materialClass,
      structureType: t.structureType,
    });
  }
  return t.templateKey ?? deriveTenantTemplateKey(t.name, t.id);
}

/** Assign unique template_key per row; inactive duplicates lose the canonical key. */
export function resolveTemplateKeyAssignments(rows: TemplateKeyRow[]): Map<string, string | null> {
  const sorted = [...rows].sort((a, b) => {
    const aActive = a.isActive !== false ? 1 : 0;
    const bActive = b.isActive !== false ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    const aCreated = a.createdAt?.getTime() ?? 0;
    const bCreated = b.createdAt?.getTime() ?? 0;
    return aCreated - bCreated;
  });

  const result = new Map<string, string | null>();
  const usedKeys = new Set<string>();

  for (const t of sorted) {
    let assigned: string | null = expectedTemplateKey(t);

    if (assigned && usedKeys.has(assigned)) {
      if (t.isActive === false) {
        assigned = null;
      } else {
        assigned = deriveTenantTemplateKey(t.name, t.id);
        while (assigned && usedKeys.has(assigned)) {
          assigned = `${assigned}-dup`;
        }
      }
    }

    if (assigned) usedKeys.add(assigned);
    result.set(t.id, assigned);
  }

  return result;
}

export function deriveSourceTemplateKey(template: {
  name: string;
  pebiParentPg: string;
  materialClass?: string | null;
  structureType?: string | null;
  isStandard: boolean;
  templateKey?: string | null;
}): string {
  if (template.templateKey) return template.templateKey;
  if (!template.isStandard) {
    return `tenant-${slugPart(template.name)}`;
  }
  return deriveStandardTemplateKey({
    pebiParentPg: template.pebiParentPg,
    materialClass: template.materialClass,
    structureType: template.structureType,
  });
}
