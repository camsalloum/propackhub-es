/**
 * TemplateBuilder — unified create + edit modal (Smart Template Builder Task 4.1–4.4).
 *
 * Design principles:
 * - Declare → Scaffold → Constrain (same in both create and edit modes).
 * - Engine is the single source of truth for PE family rules and scaffolding.
 * - Nothing hardcoded; every layer references a real material by type/family.
 * - Layer order is free (move up / move down).
 * - printMode stored in defaultDimensions jsonb (Option A, no migration).
 */

import { useState, useCallback, useId } from 'react';
import { X, ArrowLeft, Trash2, GripVertical } from 'lucide-react';
import LaminateVisualizer from './LaminateVisualizer';
import { Overlay } from './Overlay';
import {
  filterMaterialsForTemplateLayer,
  materialAllowedForTemplateLayer,
  scaffoldLayerDescriptors,
  reconcileTierToSubstrateCount,
  tierToStructureType,
  TIER_SUBSTRATE_COUNT,
  deriveProcessesFromStructure,
  type StructureTier,
  type PrintMode,
  type ProcessCatalog,
} from '@es/engine';
import type { ProductTypeCode } from '@es/engine';
import { getTemplateClassification, structureTierLabel } from '../lib/templateCatalog';
import { apiClient } from '../lib/api';
import { engineTypeForFamily, subtypesForFamily } from '../lib/productCatalog';
import type { ProductSubtypeOption, ProcessOption } from '../lib/masterDataReference';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuilderLayer {
  /** Client-only id for React key */
  clientId: string;
  layer_type: 'substrate' | 'ink' | 'adhesive';
  materialId: string | null;
  default_micron: number;
}

interface MaterialOption {
  id: string;
  name: string;
  type: string;
  substrateFamily?: string | null;
  isSolventBased?: boolean;
}

interface TemplateForEdit {
  id: string;
  name: string;
  /** Canonical cross-table key (preserved on tenant copies). */
  templateKey?: string | null;
  productType: 'roll' | 'sleeve' | 'pouch';
  productSubtype?: string | null;
  materialClass?: string | null;
  structureType?: string | null;
  /** Product-group margin over raw material, USD/kg (admin-defined). */
  marginOverRmPerKgUsd?: string | number | null;
  defaultLayers?: Array<{
    layer_order?: number;
    layer_type: 'substrate' | 'ink' | 'adhesive';
    materialId?: string | null;
    default_micron?: number;
  }> | null;
  defaultProcesses?: Array<{ process_key: string; enabled: boolean; process_quantity?: number }> | null;
  defaultDimensions?: Record<string, unknown> | null;
  isStandard?: boolean;
}

interface TemplateBuilderProps {
  mode: 'create' | 'edit';
  template?: TemplateForEdit;
  materials: MaterialOption[];
  productTypeOptions: Array<{ label: string; value: string }>;
  productSubtypeOptions: ProductSubtypeOption[];
  processOptions: ProcessOption[];
  isAdmin: boolean;
  /**
   * True when the caller's user role is `platform_admin`. Unlocks the
   * "Save as platform standard" switch in the builder header.
   */
  isPlatformAdmin?: boolean;
  /**
   * Initial value for the "Save as platform standard" switch (only meaningful
   * when `isPlatformAdmin` is true). Used by the "Clone to platform standard…"
   * card action to land the builder pre-toggled on.
   */
  defaultSaveAsPlatformStandard?: boolean;
  /**
   * @param template the saved row
   * @param meta.savedAsPlatformStandard true when the row was written to the
   *        platform catalog (create-with-toggle or edit-of-standard), so the
   *        page can land on the Standard Templates tab.
   */
  onSaved: (template: TemplateForEdit, meta: { savedAsPlatformStandard: boolean }) => void;
  onClose: () => void;
}

const STRUCTURE_TIERS: Array<{ label: string; value: StructureTier }> = [
  { label: 'Mono (1 substrate)', value: 'Mono' },
  { label: 'Duplex (2 substrates)', value: 'Duplex' },
  { label: 'Triplex (3 substrates)', value: 'Triplex' },
  { label: 'Quadriplex (4 substrates)', value: 'Quadriplex' },
];

/** Build the shared-engine process catalog (label + costPerKgUsd) from Master Data options. */
function buildProcessCatalogFromOptions(processOptions: ProcessOption[]): ProcessCatalog {
  const catalog: ProcessCatalog = {};
  for (const opt of processOptions) {
    (catalog as Record<string, { label: string; costPerKgUsd: number }>)[opt.code] = {
      label: opt.label,
      costPerKgUsd: opt.costPerKgUsd ?? 0,
    };
  }
  return catalog;
}

/**
 * Derive the sensible default process set from declared attributes, via the
 * SAME shared derivation used by estimates (`@es/engine` deriveProcessesFromStructure`).
 * Lamination quantity = adhesive-layer count (e.g. Triplex → ×2); extrusion is
 * enabled by default (assumed in-house, qty 1 — user can set 1/2 or disable).
 * `processOptions` is the live list from Master Data — used to filter out any
 * process code not configured for this tenant and to price each process.
 * `productFamily` is the UI family code: roll | sleeve | pouch | bag | custom.
 */
function deriveDefaultProcesses(
  structureTier: StructureTier,
  printMode: PrintMode,
  productFamily: string,
  materialClass: 'PE' | 'Non PE',
  processOptions: ProcessOption[]
): Array<{ process_key: string; enabled: boolean; process_quantity: number }> {
  const availableCodes = new Set(processOptions.map((p) => p.code));
  const structureLayers = scaffoldLayerDescriptors(structureTier, printMode).map((d) => ({
    type: d.layer_type,
  }));
  const productType = (engineTypeForFamily(productFamily) ?? 'roll') as
    | 'roll'
    | 'sleeve'
    | 'pouch'
    | 'bag';

  const derived = deriveProcessesFromStructure(
    { layers: structureLayers, productType, materialClass },
    buildProcessCatalogFromOptions(processOptions)
  );

  return derived
    .filter((p) => availableCodes.has(p.process_key))
    .map((p) => ({
      process_key: p.process_key,
      enabled: p.enabled,
      process_quantity: p.process_quantity,
    }));
}

function genId() {
  return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

// ─── Helper: pick default material by type + optional PE family ──────────────

function pickDefaultMaterial(
  materials: MaterialOption[],
  type: 'substrate' | 'ink' | 'adhesive',
  materialClass?: string
): MaterialOption | undefined {
  const byType = materials.filter((m) => m.type === type);
  if (type === 'substrate' && materialClass === 'PE') {
    const pe = byType.find((m) => (m.substrateFamily || '').toUpperCase() === 'PE');
    return pe ?? byType[0];
  }
  if (type === 'substrate' && materialClass === 'Non PE') {
    // Non-PE: prefer non-PE family
    const nonPe = byType.find((m) => (m.substrateFamily || '').toUpperCase() !== 'PE');
    return nonPe ?? byType[0];
  }
  return byType[0];
}

// ─── Helper: strip trailing "(<family>)" from option label (Task 4.2 / Req 7.4) ─

function stripFamilySuffix(name: string, family: string): string {
  if (!family) return name;
  // Matches " (Family Name)" at end of string, case-insensitive
  const suffix = new RegExp(`\\s*\\(${family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*$`, 'i');
  return name.replace(suffix, '').trim();
}

// ─── Helper: build filtered material options for a layer type ─────────────────

function buildMaterialOptions(
  materials: MaterialOption[],
  layerType: 'substrate' | 'ink' | 'adhesive',
  materialClass: string,
  structureType: string,
  productType: string
) {
  const ctx = { materialClass, structureType, productType: productType as ProductTypeCode };
  return filterMaterialsForTemplateLayer(materials, layerType, ctx);
}

// ─── Helper: group options by family for <optgroup> (Task 4.2) ───────────────

interface FamilyGroup {
  family: string;
  materials: MaterialOption[];
}

function groupByFamily(materials: MaterialOption[]): FamilyGroup[] {
  const map = new Map<string, MaterialOption[]>();
  for (const m of materials) {
    const fam = m.substrateFamily || 'Other';
    if (!map.has(fam)) map.set(fam, []);
    map.get(fam)!.push(m);
  }
  return Array.from(map.entries()).map(([family, mats]) => ({ family, materials: mats }));
}

// ─── Render a substrate/ink/adhesive dropdown with family dedup ───────────────

function MaterialSelect({
  value,
  layerType,
  materials,
  materialClass,
  structureType,
  productType,
  onChange,
}: {
  value: string | null;
  layerType: 'substrate' | 'ink' | 'adhesive';
  materials: MaterialOption[];
  materialClass: string;
  structureType: string;
  productType: string;
  onChange: (id: string | null) => void;
}) {
  const options = buildMaterialOptions(materials, layerType, materialClass, structureType, productType);
  const groups = groupByFamily(options);

  return (
    <select
      className="input w-full min-w-0 text-sm"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Select material</option>
      {groups.map((g) => (
        <optgroup key={g.family} label={g.family}>
          {g.materials.map((m) => (
            <option key={m.id} value={m.id}>
              {stripFamilySuffix(m.name, g.family)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// ─── Main TemplateBuilder component ──────────────────────────────────────────

export function TemplateBuilder({
  mode,
  template,
  materials,
  productTypeOptions,
  productSubtypeOptions,
  processOptions,
  isAdmin: _isAdmin,
  isPlatformAdmin = false,
  defaultSaveAsPlatformStandard = false,
  onSaved,
  onClose,
}: TemplateBuilderProps) {
  // ── Initial state from template (edit) or defaults (create) ─────────────
  const existingDims = template?.defaultDimensions as Record<string, unknown> | null | undefined;
  const storedPrintMode = (existingDims?.printMode as PrintMode | undefined) ?? null;

  // Derive initial tier from substrate count of existing layers
  const initSubstrateCount = (template?.defaultLayers || []).filter((l) => l.layer_type === 'substrate').length;
  const initTier: StructureTier =
    mode === 'edit' && initSubstrateCount > 0
      ? reconcileTierToSubstrateCount(initSubstrateCount)
      : 'Mono';

  const initPrintMode: PrintMode =
    storedPrintMode ??
    ((template?.defaultLayers || []).some((l) => l.layer_type === 'ink') ? 'Printed' : 'Plain');

  const initMaterialClass: 'PE' | 'Non PE' =
    template?.materialClass === 'PE' || template?.materialClass === 'Non PE'
      ? template.materialClass
      : 'Non PE';

  // productFamily is the UI-level code (roll/sleeve/pouch/bag).
  // For existing templates, productType is 'roll'|'sleeve'|'pouch' (engine type).
  // We need to recover the family: if there's a subtype starting with 'bag_', family is 'bag'.
  const initFamily = (() => {
    if (!template) return 'roll';
    if (template.productSubtype?.startsWith('bag_')) return 'bag';
    return template.productType ?? 'roll';
  })();

  const initSubtype = template?.productSubtype ?? null;

  const [name, setName] = useState(template?.name ?? '');
  const [productFamily, setProductFamily] = useState<string>(initFamily);
  const [productSubtype, setProductSubtype] = useState<string | null>(initSubtype);
  const [materialClass, setMaterialClass] = useState<'PE' | 'Non PE'>(initMaterialClass);
  const [structureTier, setStructureTier] = useState<StructureTier>(initTier);
  const [printMode, setPrintMode] = useState<PrintMode>(initPrintMode);
  const [marginOverRmPerKgUsd, setMarginOverRmPerKgUsd] = useState<number>(
    template?.marginOverRmPerKgUsd != null ? Number(template.marginOverRmPerKgUsd) : 0
  );
  const [saving, setSaving] = useState(false);
  const [processesOpen, setProcessesOpen] = useState(false);
  // Whether the platform_admin wants to publish this as a platform standard.
  // In edit mode of an existing platform standard, the switch is implicit
  // (we always route to PATCH /admin/platform-templates/:id) — we keep the
  // state so the header chip can render.
  const editingPlatformStandard = mode === 'edit' && template?.isStandard === true;
  const [saveAsPlatformStandard, setSaveAsPlatformStandard] = useState<boolean>(
    () => defaultSaveAsPlatformStandard || editingPlatformStandard
  );
  const titleId = useId();

  // Derive the engine costing type (roll/sleeve/pouch) from the UI family
  const engineProductType = engineTypeForFamily(productFamily) as 'roll' | 'sleeve' | 'pouch';

  // Subtypes available for the current family (empty for roll/sleeve)
  const availableSubtypes = (() => {
    // Use master-data-driven list first, fall back to static catalog
    const mdSubtypes = productSubtypeOptions.filter((s) => s.parent === productFamily);
    if (mdSubtypes.length > 0) return mdSubtypes;
    return subtypesForFamily(productFamily).map((s) => ({ label: s.label, code: s.key, parent: s.family, group: s.group }));
  })();

  // Derive structureType from tier (Property 5)
  const structureType = tierToStructureType(structureTier);

  // ── Layers ───────────────────────────────────────────────────────────────
  const buildScaffoldLayers = useCallback(
    (tier: StructureTier, pm: PrintMode, mc: string): BuilderLayer[] => {
      const descriptors = scaffoldLayerDescriptors(tier, pm);
      return descriptors.map((d) => {
        const mat = pickDefaultMaterial(materials, d.layer_type, mc);
        return {
          clientId: genId(),
          layer_type: d.layer_type,
          materialId: mat?.id ?? null,
          default_micron: 0,
        };
      });
    },
    [materials]
  );

  const [layers, setLayers] = useState<BuilderLayer[]>(() => {
    if (template?.defaultLayers?.length) {
      return template.defaultLayers.map((l) => ({
        clientId: genId(),
        layer_type: l.layer_type,
        materialId: l.materialId ?? null,
        default_micron: l.default_micron ?? 0,
      }));
    }
    return buildScaffoldLayers(initTier, initPrintMode, initMaterialClass);
  });

  // ── Processes ────────────────────────────────────────────────────────────
  const [processes, setProcesses] = useState<Array<{ process_key: string; enabled: boolean; process_quantity: number }>>(
    () => {
      if (template?.defaultProcesses?.length) {
        return template.defaultProcesses.map((p) => ({
          process_key: p.process_key,
          enabled: p.enabled,
          process_quantity: Math.max(1, Number((p as any).process_quantity) || 1),
        }));
      }
      return deriveDefaultProcesses(initTier, initPrintMode, initFamily, initMaterialClass, processOptions);
    }
  );

  // ── Attribute change handlers — re-scaffold (preserving still-valid edits) ─
  const handleTierChange = (newTier: StructureTier) => {
    setStructureTier(newTier);
    if (mode === 'create') {
      setProcesses(deriveDefaultProcesses(newTier, printMode, productFamily, materialClass, processOptions));
    }
    // Re-scaffold; preserve ink layers if printMode=Printed
    setLayers((prev) => {
      const newSubs = TIER_SUBSTRATE_COUNT[newTier];
      const existingSubs = prev.filter((l) => l.layer_type === 'substrate');
      const existingAdh = prev.filter((l) => l.layer_type === 'adhesive');
      const existingInk = prev.filter((l) => l.layer_type === 'ink');

      if (newSubs === existingSubs.length) return prev; // no-op

      // Re-scaffold from scratch preserving substrate materials where possible
      const descriptors = scaffoldLayerDescriptors(newTier, printMode);
      let subIdx = 0;
      return descriptors.map((d) => {
        if (d.layer_type === 'substrate') {
          const existing = existingSubs[subIdx++];
          return existing ? { ...existing, clientId: existing.clientId } : {
            clientId: genId(),
            layer_type: 'substrate' as const,
            materialId: pickDefaultMaterial(materials, 'substrate', materialClass)?.id ?? null,
            default_micron: 0,
          };
        }
        if (d.layer_type === 'adhesive') {
          const existing = existingAdh.shift();
          return existing ?? {
            clientId: genId(),
            layer_type: 'adhesive' as const,
            materialId: pickDefaultMaterial(materials, 'adhesive')?.id ?? null,
            default_micron: 0,
          };
        }
        // ink
        const existing = existingInk.shift();
        return existing ?? {
          clientId: genId(),
          layer_type: 'ink' as const,
          materialId: pickDefaultMaterial(materials, 'ink')?.id ?? null,
          default_micron: 0,
        };
      });
    });
  };

  const handlePrintModeChange = (newMode: PrintMode) => {
    setPrintMode(newMode);
    if (mode === 'create') {
      setProcesses(deriveDefaultProcesses(structureTier, newMode, productFamily, materialClass, processOptions));
    }
    if (newMode === 'Plain') {
      // Remove all ink layers (Property 4)
      setLayers((prev) => prev.filter((l) => l.layer_type !== 'ink'));
    } else if (newMode === 'Printed') {
      // Add an ink layer after the first substrate if none exists
      setLayers((prev) => {
        if (prev.some((l) => l.layer_type === 'ink')) return prev;
        const firstSubIdx = prev.findIndex((l) => l.layer_type === 'substrate');
        const inkLayer: BuilderLayer = {
          clientId: genId(),
          layer_type: 'ink',
          materialId: pickDefaultMaterial(materials, 'ink')?.id ?? null,
          default_micron: 0,
        };
        const next = [...prev];
        next.splice(firstSubIdx + 1, 0, inkLayer);
        return next;
      });
    }
  };

  const handleMaterialClassChange = (newClass: 'PE' | 'Non PE') => {
    setMaterialClass(newClass);
    if (mode === 'create') {
      setProcesses(deriveDefaultProcesses(structureTier, printMode, productFamily, newClass, processOptions));
    }
    // Prune substrate materials that are no longer allowed (Req 3.3)
    setLayers((prev) =>
      prev.map((l) => {
        if (l.layer_type !== 'substrate' || !l.materialId) return l;
        const mat = materials.find((m) => m.id === l.materialId);
        if (!mat) return l;
        const allowed = materialAllowedForTemplateLayer(mat, 'substrate', {
          materialClass: newClass,
          structureType: tierToStructureType(structureTier),
          productType: engineTypeForFamily(productFamily) as ProductTypeCode,
        });
        if (!allowed) {
          const newMat = pickDefaultMaterial(materials, 'substrate', newClass);
          return { ...l, materialId: newMat?.id ?? null };
        }
        return l;
      })
    );
  };

  // ── Layer mutations ───────────────────────────────────────────────────────
  const moveLayer = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= layers.length) return;
    setLayers((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  };

  // ── Drag-and-drop reordering ───────────────────────────────────────────────
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);

  const reorderLayers = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= layers.length || to >= layers.length) return;
    setLayers((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const handleLayerDrop = () => {
    if (dragFromIndex !== null && dragHoverIndex !== null) {
      reorderLayers(dragFromIndex, dragHoverIndex);
    }
    setDragFromIndex(null);
    setDragHoverIndex(null);
  };


  const removeLayer = (idx: number) => {
    setLayers((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Reconcile tier to new substrate count (Property 8 — counts are fixed by tier,
      // but user explicitly removed a layer, so reconcile the declared tier to match)
      const newSubCount = next.filter((l) => l.layer_type === 'substrate').length;
      const reconciledTier = reconcileTierToSubstrateCount(newSubCount || 1);
      setStructureTier(reconciledTier);
      return next;
    });
  };

  const updateLayerMaterial = (idx: number, materialId: string | null) => {
    setLayers((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, materialId } : l))
    );
  };

  const updateLayerType = (idx: number, layerType: BuilderLayer['layer_type']) => {
    // Ink not allowed on Plain
    if (layerType === 'ink' && printMode === 'Plain') return;
    // Adhesive not allowed on Mono
    if (layerType === 'adhesive' && structureTier === 'Mono') return;
    setLayers((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const mat = pickDefaultMaterial(materials, layerType, materialClass);
        return { ...l, layer_type: layerType, materialId: mat?.id ?? null };
      })
    );
  };

  const addLayer = (type: BuilderLayer['layer_type']) => {
    // Ink not allowed on Plain (Property 4)
    if (type === 'ink' && printMode === 'Plain') return;
    // Substrate count is fixed by the declared tier (Property 1 + 2)
    if (type === 'substrate') {
      const currentSubs = layers.filter((l) => l.layer_type === 'substrate').length;
      if (currentSubs >= TIER_SUBSTRATE_COUNT[structureTier]) return;
    }
    // Mono has zero adhesives (Property 2 — single substrate, no bonding layers)
    if (type === 'adhesive' && structureTier === 'Mono') return;
    const mat = pickDefaultMaterial(materials, type, materialClass);
    const newLayer: BuilderLayer = {
      clientId: genId(),
      layer_type: type,
      materialId: mat?.id ?? null,
      default_micron: 0,
    };
    setLayers((prev) => {
      const next = [...prev, newLayer];
      if (type === 'substrate') {
        const newSubCount = next.filter((l) => l.layer_type === 'substrate').length;
        setStructureTier(reconcileTierToSubstrateCount(newSubCount));
      }
      return next;
    });
  };

  // ── Processes ────────────────────────────────────────────────────────────
  const toggleProcess = (key: string) => {
    setProcesses((prev) => {
      const idx = prev.findIndex((p) => p.process_key === key);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], enabled: !copy[idx].enabled };
        return copy;
      }
      return [...prev, { process_key: key, enabled: true, process_quantity: 1 }];
    });
  };
  const _isProcessEnabled = (key: string) =>
    (processes || []).find((p) => p.process_key === key)?.enabled ?? false;
  void _isProcessEnabled;

  // ── Classification display ────────────────────────────────────────────────
  const catalogInput = {
    name,
    productType: engineProductType,
    materialClass,
    structureType,
    defaultLayers: layers.map((l) => ({ layer_type: l.layer_type, materialId: l.materialId })),
  };
  const classification = getTemplateClassification(catalogInput);
  const classTag = [
    materialClass,
    printMode,
    structureTierLabel(classification.structure),
  ].join(' · ');

  // ── Visualizer layers ─────────────────────────────────────────────────────
  const vizLayers = layers.map((l) => {
    const mat = materials.find((m) => m.id === l.materialId);
    return {
      id: l.clientId,
      type: l.layer_type,
      material: mat?.name ?? l.layer_type,
      micron: 1,
    };
  });

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      alert('Template name is required');
      return;
    }
    setSaving(true);
    try {
      const layerPayload = layers.map((l, i) => ({
        layer_order: i + 1,
        layer_type: l.layer_type,
        materialId: l.materialId,
        default_micron: l.default_micron > 0 ? l.default_micron : 0,
      }));

      let saved: TemplateForEdit;
      let savedAsPlatformStandard = false;
      if (mode === 'create') {
        if (saveAsPlatformStandard && isPlatformAdmin) {
          savedAsPlatformStandard = true;
          saved = await apiClient.createPlatformTemplate({
            name: name.trim(),
            productType: engineProductType,
            productSubtype: productSubtype ?? undefined,
            materialClass,
            structureTier,
            printMode,
            defaultLayers: layerPayload,
            defaultProcesses: processes,
          });
        } else {
          saved = await apiClient.createTemplateFromDefinition({
            name: name.trim(),
            productType: engineProductType,
            productSubtype: productSubtype ?? undefined,
            materialClass,
            structureTier,
            printMode,
            defaultLayers: layerPayload,
            defaultProcesses: processes,
          });
        }
      } else {
        // Edit mode — PATCH the existing template.
        // If the source row is a platform standard AND the caller is a platform_admin,
        // route to the admin PATCH by templateKey so the change reaches the platform
        // row (the local tenant copy's `id` is not what the platform table indexes).
        if (editingPlatformStandard && isPlatformAdmin && template) {
          const key = template.templateKey;
          if (!key) {
            throw new Error(
              'This template has no canonical key; cannot edit as a platform standard. Re-sync templates and try again.'
            );
          }
          savedAsPlatformStandard = true;
          // The admin PATCH returns the full platform row plus live-sync
          // telemetry ({ syncedTenants, deactivatedTenants, inserted }). The
          // row part is shape-compatible with TemplateForEdit; the telemetry
          // is ignored. Cast through `unknown` to drop the extra fields.
          saved = (await apiClient.updatePlatformTemplateByKey(key, {
            name: name.trim(),
            productType: engineProductType,
            productSubtype: productSubtype ?? null,
            materialClass,
            structureTier,
            printMode,
            defaultLayers: layerPayload,
            defaultProcesses: processes,
          })) as unknown as TemplateForEdit;
        } else {
          saved = await apiClient.updateTemplate(template!.id, {
            name: name.trim(),
            productType: engineProductType,
            productSubtype: productSubtype ?? null,
            materialClass,
            structureTier,
            printMode,
            marginOverRmPerKgUsd,
            defaultLayers: layerPayload,
            defaultProcesses: processes,
          });
        }
      }
      if (savedAsPlatformStandard || editingPlatformStandard) {
        window.dispatchEvent(new Event('platform-templates-changed'));
      }
      onSaved(saved, { savedAsPlatformStandard });
    } catch (err) {
      alert('Failed to save template: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isPlatformAdmin || !editingPlatformStandard || !template?.templateKey) return;

    const ok = window.confirm(
      `Delete platform template "${template.name}"?\n\n` +
        `This will:\n` +
        `  • mark the platform row inactive (no hard delete — reversible from the DB)\n` +
        `  • deactivate the template in EVERY tenant's catalog (live-sync)\n` +
        `  • hide it from new-estimate dropdowns everywhere\n\n` +
        `Existing estimates that reference this template will keep working.\n\n` +
        `Continue?`
    );
    if (!ok) return;

    try {
      await apiClient.deletePlatformTemplateByKey(template.templateKey);
      window.dispatchEvent(new Event('platform-templates-changed'));
      onClose();
    } catch (err) {
      alert('Failed to delete template: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const layerCount = layers.length;
  const substrateCount = layers.filter((l) => l.layer_type === 'substrate').length;

  return (
    <Overlay open onClose={onClose} variant="modal" labelledBy={titleId}>
      <div className="bg-surface-overlay flex flex-col overflow-hidden rounded-xl shadow-xl w-[min(72rem,calc(100vw-2rem))] max-h-[90vh]">
        <header className="shrink-0 flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-brand"
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to templates
          </button>
          <h2 id={titleId} className="text-lg font-display font-bold text-brand">
            {mode === 'create' ? 'New template' : 'Edit template'}
          </h2>
          <div className="flex items-center gap-2">
            {isPlatformAdmin && editingPlatformStandard && (
              <button
                type="button"
                className="p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                aria-label="Delete template"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              className="p-2 rounded-lg text-text-secondary hover:text-brand hover:bg-surface-base"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 lg:px-10 py-6">
        <div className="w-full max-w-[1600px] mx-auto space-y-6">
          {/* ── Template metadata ── */}
          <section className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-brand mb-1">Name</label>
              <input
                className="input w-full max-w-xl text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PE Plain Mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand mb-1">
                Margin over raw material (USD/kg)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input w-full max-w-xs text-sm"
                value={marginOverRmPerKgUsd}
                onChange={(e) => setMarginOverRmPerKgUsd(Number(e.target.value) || 0)}
                placeholder="e.g. 0.50"
              />
              <p className="text-xs text-mist mt-1">
                Default margin for this product group. Estimates created from this template
                inherit it (used when the user's pricing method is margin per kg).
              </p>
            </div>

            {/* Platform admin: save as platform standard */}
            {isPlatformAdmin && (
              <div data-testid="platform-standard-toggle">
                {editingPlatformStandard ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                    ★ Editing platform standard
                  </span>
                ) : (
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-text-primary">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-brand"
                      checked={saveAsPlatformStandard}
                      onChange={(e) => setSaveAsPlatformStandard(e.target.checked)}
                    />
                    Save as platform standard
                  </label>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand mb-1">Product type</label>
                <select
                  className="input w-full text-sm"
                  value={productFamily}
                  onChange={(e) => {
                    const fam = e.target.value;
                    setProductFamily(fam);
                    const subs = productSubtypeOptions.filter((s) => s.parent === fam);
                    const staticSubs = subtypesForFamily(fam);
                    const firstSub = subs[0]?.code ?? staticSubs[0]?.key ?? null;
                    setProductSubtype(firstSub);
                    if (mode === 'create') {
                      setProcesses(deriveDefaultProcesses(structureTier, printMode, fam, materialClass, processOptions));
                    }
                  }}
                >
                  {productTypeOptions.map((pt) => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand mb-1">Material class</label>
                <select
                  className="input w-full text-sm"
                  value={materialClass}
                  onChange={(e) => handleMaterialClassChange(e.target.value as 'PE' | 'Non PE')}
                >
                  <option value="PE">PE</option>
                  <option value="Non PE">Non PE</option>
                </select>
              </div>
              {availableSubtypes.length > 0 ? (
                <div>
                  <label className="block text-xs font-medium text-brand mb-1">
                    {productFamily === 'bag' ? 'Bag type' : 'Pouch type'}
                  </label>
                  <select
                    className="input w-full text-sm"
                    value={productSubtype ?? ''}
                    onChange={(e) => setProductSubtype(e.target.value || null)}
                  >
                    <option value="">— Select —</option>
                    {(() => {
                      const groups = new Map<string, typeof availableSubtypes>();
                      for (const s of availableSubtypes) {
                        const g = s.group ?? '';
                        if (!groups.has(g)) groups.set(g, []);
                        groups.get(g)!.push(s);
                      }
                      return Array.from(groups.entries()).map(([group, items]) =>
                        group ? (
                          <optgroup key={group} label={group}>
                            {items.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                          </optgroup>
                        ) : items.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)
                      );
                    })()}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-brand mb-1">Structure tier</label>
                  <select
                    className="input w-full text-sm"
                    value={structureTier}
                    onChange={(e) => handleTierChange(e.target.value as StructureTier)}
                  >
                    {STRUCTURE_TIERS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {availableSubtypes.length > 0 ? (
                <div>
                  <label className="block text-xs font-medium text-brand mb-1">Structure tier</label>
                  <select
                    className="input w-full text-sm"
                    value={structureTier}
                    onChange={(e) => handleTierChange(e.target.value as StructureTier)}
                  >
                    {STRUCTURE_TIERS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-brand mb-1">Print mode</label>
                  <select
                    className="input w-full text-sm"
                    value={printMode}
                    onChange={(e) => handlePrintModeChange(e.target.value as PrintMode)}
                  >
                    <option value="Plain">Plain</option>
                    <option value="Printed">Printed</option>
                  </select>
                </div>
              )}
              {availableSubtypes.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-brand mb-1">Print mode</label>
                  <select
                    className="input w-full text-sm"
                    value={printMode}
                    onChange={(e) => handlePrintModeChange(e.target.value as PrintMode)}
                  >
                    <option value="Plain">Plain</option>
                    <option value="Printed">Printed</option>
                  </select>
                </div>
              )}
            </div>
          </section>

          {layers.length > 0 && (
            <section className="rounded-xl border border-border bg-surface-base/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <LaminateVisualizer
                  layers={vizLayers}
                  width={480}
                  height={40}
                  orientation="horizontal"
                  labelMode="number"
                  className="w-full h-10"
                />
              </div>
              <div className="shrink-0 sm:text-right sm:pl-4 sm:border-l sm:border-border">
                <p className="text-sm font-semibold text-brand leading-snug">{classTag}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {layerCount} layers · {substrateCount} substrates
                </p>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-border overflow-hidden bg-surface-overlay">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-base/40">
              <h3 className="text-sm font-semibold text-brand uppercase tracking-wide">Layers</h3>
              <div className="flex flex-wrap gap-2">
                {layers.filter((l) => l.layer_type === 'substrate').length < TIER_SUBSTRATE_COUNT[structureTier] && (
                  <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={() => addLayer('substrate')}>
                    + Substrate
                  </button>
                )}
                {printMode === 'Printed' && (
                  <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={() => addLayer('ink')}>
                    + Ink & coating
                  </button>
                )}
                {structureTier !== 'Mono' &&
                  layers.filter((l) => l.layer_type === 'adhesive').length < TIER_SUBSTRATE_COUNT[structureTier] - 1 && (
                  <button type="button" className="btn-secondary text-xs py-1.5 px-3" onClick={() => addLayer('adhesive')}>
                    + Adhesive
                  </button>
                )}
              </div>
            </div>

            {layers.length === 0 ? (
              <p className="text-sm text-text-secondary px-4 py-8 text-center">No layers yet — add a substrate to start.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed min-w-[640px]">
                  <colgroup>
                    <col style={{ width: '5rem' }} />
                    <col style={{ width: '11rem' }} />
                    <col />
                    <col style={{ width: '7.5rem' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border text-xs font-medium text-text-secondary">
                      <th className="py-2.5 px-2 text-center">#</th>
                      <th className="py-2.5 px-3 text-left">Type</th>
                      <th className="py-2.5 px-3 text-left">Material / grade</th>
                      <th className="py-2.5 px-2 text-center">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layers.map((layer, i) => (
                      <tr
                        key={layer.clientId}
                        onDragEnter={() => {
                          if (dragFromIndex !== null) setDragHoverIndex(i);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleLayerDrop();
                        }}
                        className={`border-b border-border last:border-0 hover:bg-surface-base/30 transition-colors ${
                          dragFromIndex === i ? 'opacity-50' : ''
                        } ${
                          dragHoverIndex === i && dragFromIndex !== null && dragFromIndex !== i
                            ? 'bg-brand/5 outline outline-1 outline-brand/40'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              draggable
                              onDragStart={() => setDragFromIndex(i)}
                              onDragEnd={handleLayerDrop}
                              className="shrink-0 text-text-secondary hover:text-brand cursor-grab active:cursor-grabbing touch-none"
                              aria-label="Drag to reorder layer"
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-4 h-4" />
                            </button>
                            <span className="inline-flex w-7 h-7 rounded-md text-text-inverse text-xs font-semibold items-center justify-center bg-brand">
                              {i + 1}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 align-middle">
                          <select
                            className="input w-full text-sm"
                            value={layer.layer_type}
                            onChange={(e) => updateLayerType(i, e.target.value as BuilderLayer['layer_type'])}
                          >
                            <option value="substrate">Substrate</option>
                            <option value="ink" disabled={printMode === 'Plain'}>
                              {printMode === 'Plain' ? 'Ink (plain only)' : 'Ink & coating'}
                            </option>
                            <option value="adhesive" disabled={structureTier === 'Mono'}>
                              {structureTier === 'Mono' ? 'Adhesive (n/a)' : 'Adhesive'}
                            </option>
                          </select>
                        </td>
                        <td className="py-2 px-3 align-middle min-w-0">
                          <MaterialSelect
                            value={layer.materialId}
                            layerType={layer.layer_type}
                            materials={materials}
                            materialClass={materialClass}
                            structureType={structureType}
                            productType={engineProductType}
                            onChange={(id) => updateLayerMaterial(i, id)}
                          />
                        </td>
                        <td className="py-2 px-2 align-middle">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => moveLayer(i, -1)}
                              className="p-1.5 rounded-md text-text-secondary hover:text-brand hover:bg-surface-base disabled:opacity-25"
                              aria-label="Move up"
                            >▲</button>
                            <button
                              type="button"
                              disabled={i === layers.length - 1}
                              onClick={() => moveLayer(i, 1)}
                              className="p-1.5 rounded-md text-text-secondary hover:text-brand hover:bg-surface-base disabled:opacity-25"
                              aria-label="Move down"
                            >▼</button>
                            <button
                              type="button"
                              className="p-1.5 rounded-md text-text-secondary hover:text-danger hover:bg-danger/10"
                              onClick={() => removeLayer(i)}
                              aria-label="Remove layer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-brand">Processes</label>
              {/* Toggle for advanced / full list */}
              <button
                type="button"
                className="text-xs text-accent-text font-medium"
                onClick={() => setProcessesOpen((v) => !v)}
              >
                {processesOpen ? 'Hide advanced ▲' : 'Customise ▼'}
              </button>
            </div>

            {/* Smart summary: auto-derived enabled processes shown as badges */}
            {!processesOpen && (
              <div className="flex flex-wrap gap-2">
                {processOptions
                  .filter((opt) => processes.find((p) => p.process_key === opt.code)?.enabled)
                  .map((opt) => (
                    <span
                      key={opt.code}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand/10 text-brand"
                      title={opt.description}
                    >
                      {opt.label}
                    </span>
                  ))}
                {processes.filter((p) => p.enabled).length === 0 && (
                  <span className="text-xs text-text-secondary">No processes selected — click Customise to add.</span>
                )}
                {mode === 'create' && (
                  <span className="text-xs text-text-secondary ml-1">
                    (auto-set from structure — click Customise to override)
                  </span>
                )}
              </div>
            )}

            {/* Advanced / full checkbox list — always open for complex structures */}
            {(processesOpen || layers.length > 4) && (
              <div className="mt-2 p-3 rounded-lg border border-border bg-surface-base/20 space-y-2">
                {layers.length > 4 && !processesOpen && (
                  <p className="text-xs text-text-secondary mb-2">
                    Complex structure ({layers.length} layers) — verify all processes apply.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-3">
                  {processOptions.map((opt) => {
                    const proc = processes.find((p) => p.process_key === opt.code);
                    const isEnabled = proc?.enabled ?? false;
                    return (
                      <div key={opt.code} className="flex flex-col gap-1">
                        <label
                          className="inline-flex items-start gap-2 text-sm cursor-pointer"
                          title={opt.description}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={isEnabled}
                            onChange={() => toggleProcess(opt.code)}
                          />
                          <span>
                            <span className="font-medium text-brand">{opt.label}</span>
                            <span className="block text-xs text-text-secondary">{opt.description}</span>
                          </span>
                        </label>
                        {isEnabled && (
                          <div className="pl-6 flex items-center gap-1.5">
                            <label className="text-xs text-text-secondary whitespace-nowrap">×</label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              className="input !min-h-[26px] !py-0 !px-1.5 text-xs w-16 font-mono"
                              value={proc?.process_quantity ?? 1}
                              onChange={(e) => {
                                const val = Math.max(1, Math.round(Number(e.target.value) || 1));
                                setProcesses((prev) =>
                                  prev.map((p) =>
                                    p.process_key === opt.code ? { ...p, process_quantity: val } : p
                                  )
                                );
                              }}
                              title="Number of times this process is applied (e.g. 2 for double-lamination)"
                            />
                            <span className="text-xs text-text-secondary">times</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="shrink-0 flex items-center justify-end gap-3 px-6 lg:px-10 py-4 border-t border-border bg-surface-overlay">
        <button type="button" className="btn-secondary text-sm px-6" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary text-sm px-8"
          disabled={saving || !name.trim()}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : mode === 'create' ? 'Create template' : 'Save changes'}
        </button>
      </footer>
      </div>
    </Overlay>
  );
}

export default TemplateBuilder;
