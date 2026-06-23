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

import { useState, useCallback } from 'react';
import { X, ArrowLeft, Trash2 } from 'lucide-react';
import LaminateVisualizer from './LaminateVisualizer';
import {
  filterMaterialsForTemplateLayer,
  materialAllowedForTemplateLayer,
  scaffoldLayerDescriptors,
  reconcileTierToSubstrateCount,
  tierToStructureType,
  TIER_SUBSTRATE_COUNT,
  type StructureTier,
  type PrintMode,
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
  productType: 'roll' | 'sleeve' | 'pouch';
  productSubtype?: string | null;
  materialClass?: string | null;
  structureType?: string | null;
  defaultLayers?: Array<{
    layer_order?: number;
    layer_type: 'substrate' | 'ink' | 'adhesive';
    materialId?: string | null;
    default_micron?: number;
  }> | null;
  defaultProcesses?: Array<{ process_key: string; enabled: boolean }> | null;
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
  onSaved: (template: TemplateForEdit) => void;
  onClose: () => void;
}

const STRUCTURE_TIERS: Array<{ label: string; value: StructureTier }> = [
  { label: 'Mono (1 substrate)', value: 'Mono' },
  { label: 'Duplex (2 substrates)', value: 'Duplex' },
  { label: 'Triplex (3 substrates)', value: 'Triplex' },
  { label: 'Quadriplex (4 substrates)', value: 'Quadriplex' },
];

/**
 * Derive the sensible default process set from declared attributes.
 * `processOptions` is the live list from Master Data.
 * `productFamily` is the UI family code: roll | sleeve | pouch | bag | custom.
 */
function deriveDefaultProcesses(
  structureTier: StructureTier,
  printMode: PrintMode,
  productFamily: string,
  materialClass: 'PE' | 'Non PE',
  processOptions: ProcessOption[]
): Array<{ process_key: string; enabled: boolean }> {
  const has = (code: string) => processOptions.some((p) => p.code === code);

  const codes: string[] = [];

  if (structureTier === 'Mono' && materialClass === 'PE' && has('extrusion'))
    codes.push('extrusion');
  if (printMode === 'Printed' && has('printing'))
    codes.push('printing');
  if (structureTier !== 'Mono' && has('lamination'))
    codes.push('lamination');
  if (has('slitting'))
    codes.push('slitting');
  if (productFamily === 'pouch' && has('pouch_making'))
    codes.push('pouch_making');
  if (productFamily === 'bag' && has('bag_making'))
    codes.push('bag_making');
  if (productFamily === 'sleeve' && has('seaming'))
    codes.push('seaming');

  return codes.map((code) => ({ process_key: code, enabled: true }));
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
      className="input flex-1 min-w-[12rem] text-sm"
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
  const [saving, setSaving] = useState(false);
  const [processesOpen, setProcessesOpen] = useState(false);

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
    if (mode === 'edit' && template?.defaultLayers?.length) {
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
  const [processes, setProcesses] = useState<Array<{ process_key: string; enabled: boolean }>>(
    () => {
      if (mode === 'edit' && template?.defaultProcesses?.length) {
        return template.defaultProcesses.map((p) => ({ ...p }));
      }
      // create mode: derive sensible defaults from declared attributes
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
      return [...prev, { process_key: key, enabled: true }];
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
        default_micron: 0,
      }));

      let saved: TemplateForEdit;
      if (mode === 'create') {
        saved = await apiClient.createTemplateFromDefinition({
          name: name.trim(),
          productType: engineProductType,
          materialClass,
          structureTier,
          printMode,
          defaultLayers: layerPayload,
          defaultProcesses: processes,
        });
      } else {
        // Edit mode — PATCH the existing template
        saved = await apiClient.updateTemplate(template!.id, {
          name: name.trim(),
          productType: engineProductType,
          materialClass,
          structureTier,
          printMode,
          defaultLayers: layerPayload,
          defaultProcesses: processes,
        });
      }
      onSaved(saved);
    } catch (err) {
      alert('Failed to save template: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSaving(false);
    }
  };

  const layerCount = layers.length;
  const substrateCount = layers.filter((l) => l.layer_type === 'substrate').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-medium text-mist hover:text-navy"
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to templates
          </button>
          <button
            type="button"
            className="p-2 rounded-lg text-mist hover:text-navy hover:bg-slate"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-lg font-display font-bold text-navy mb-4">
          {mode === 'create' ? 'New template' : 'Edit template'}
        </h2>

        <div className="space-y-3">
          {/* Row 1: Name (full width) */}
          <div>
            <label className="block text-xs font-medium text-navy mb-1">Name</label>
            <input
              className="input w-full text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PE Plain Mono"
            />
          </div>

          {/* Row 2: Product type + Material class */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-navy mb-1">Product type</label>
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
              <label className="block text-xs font-medium text-navy mb-1">Material class</label>
              <select
                className="input w-full text-sm"
                value={materialClass}
                onChange={(e) => handleMaterialClassChange(e.target.value as 'PE' | 'Non PE')}
              >
                <option value="PE">PE</option>
                <option value="Non PE">Non PE</option>
              </select>
            </div>
          </div>

          {/* Row 3: Subtype (when Pouch/Bag) + Structure tier — or just tier if no subtype */}
          <div className="grid grid-cols-2 gap-2">
            {availableSubtypes.length > 0 ? (
              <div>
                <label className="block text-xs font-medium text-navy mb-1">
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
              // Roll/Sleeve: no subtype — structure tier takes col 1
              <div>
                <label className="block text-xs font-medium text-navy mb-1">Structure tier</label>
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
              // Pouch/Bag: structure tier goes in col 2
              <div>
                <label className="block text-xs font-medium text-navy mb-1">Structure tier</label>
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
              // Roll/Sleeve: print mode in col 2
              <div>
                <label className="block text-xs font-medium text-navy mb-1">Print mode</label>
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

          {/* Row 4: Print mode (only for Pouch/Bag where row 3 is subtype+tier) */}
          {availableSubtypes.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-navy mb-1">Print mode</label>
                <select
                  className="input w-full text-sm"
                  value={printMode}
                  onChange={(e) => handlePrintModeChange(e.target.value as PrintMode)}
                >
                  <option value="Plain">Plain</option>
                  <option value="Printed">Printed</option>
                </select>
              </div>
              <div /> {/* spacer */}
            </div>
          )}

          {/* Classification + compact visualizer */}
          {layers.length > 0 && (
            <div className="rounded-lg border border-border bg-slate/30 px-3 py-2 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <LaminateVisualizer
                  layers={vizLayers}
                  width={240}
                  height={28}
                  orientation="horizontal"
                  labelMode="number"
                  className="w-full h-7"
                />
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-navy leading-snug">{classTag}</p>
                <p className="text-xs text-mist">
                  {layerCount}L · {substrateCount}S
                </p>
              </div>
            </div>
          )}

          {/* Layer stack */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-navy uppercase tracking-wide">Layers</label>
              <div className="flex gap-2">
                {layers.filter((l) => l.layer_type === 'substrate').length < TIER_SUBSTRATE_COUNT[structureTier] && (
                  <button type="button" className="text-xs text-gold font-medium" onClick={() => addLayer('substrate')}>
                    + Sub
                  </button>
                )}
                {printMode === 'Printed' && (
                  <button type="button" className="text-xs text-gold font-medium" onClick={() => addLayer('ink')}>
                    + Ink
                  </button>
                )}
                {structureTier !== 'Mono' &&
                  layers.filter((l) => l.layer_type === 'adhesive').length < TIER_SUBSTRATE_COUNT[structureTier] - 1 && (
                  <button type="button" className="text-xs text-gold font-medium" onClick={() => addLayer('adhesive')}>
                    + Adh
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              {layers.map((layer, i) => (
                <div key={layer.clientId} className="flex gap-1.5 items-center">
                  {/* Position badge */}
                  <span className="w-5 h-5 shrink-0 rounded text-white text-xs font-semibold flex items-center justify-center bg-navy">
                    {i + 1}
                  </span>

                  {/* Layer type */}
                  <select
                    className="input text-xs py-1 w-28 shrink-0"
                    value={layer.layer_type}
                    onChange={(e) => updateLayerType(i, e.target.value as BuilderLayer['layer_type'])}
                  >
                    <option value="substrate">Substrate</option>
                    <option value="ink" disabled={printMode === 'Plain'}>
                      {printMode === 'Plain' ? 'Ink (Plain)' : 'Ink & Coating'}
                    </option>
                    <option value="adhesive" disabled={structureTier === 'Mono'}>
                      {structureTier === 'Mono' ? 'Adhesive (Mono)' : 'Adhesive'}
                    </option>
                  </select>

                  {/* Material picker */}
                  <MaterialSelect
                    value={layer.materialId}
                    layerType={layer.layer_type}
                    materials={materials}
                    materialClass={materialClass}
                    structureType={structureType}
                    productType={engineProductType}
                    onChange={(id) => updateLayerMaterial(i, id)}
                  />

                  {/* Reorder + remove — compact icon group */}
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveLayer(i, -1)}
                      className="text-mist hover:text-navy disabled:opacity-20 px-1 text-xs leading-none"
                      aria-label="Move up"
                    >▲</button>
                    <button
                      type="button"
                      disabled={i === layers.length - 1}
                      onClick={() => moveLayer(i, 1)}
                      className="text-mist hover:text-navy disabled:opacity-20 px-1 text-xs leading-none"
                      aria-label="Move down"
                    >▼</button>
                    <button
                      type="button"
                      className="text-red-400 hover:text-red-600 px-1"
                      onClick={() => removeLayer(i)}
                      aria-label="Remove layer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {layers.length === 0 && (
                <p className="text-xs text-mist py-1">No layers yet.</p>
              )}
            </div>
          </div>

          {/* Processes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-navy">Processes</label>
              {/* Toggle for advanced / full list */}
              <button
                type="button"
                className="text-xs text-gold font-medium"
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-navy/10 text-navy"
                      title={opt.description}
                    >
                      {opt.label}
                    </span>
                  ))}
                {processes.filter((p) => p.enabled).length === 0 && (
                  <span className="text-xs text-mist">No processes selected — click Customise to add.</span>
                )}
                {mode === 'create' && (
                  <span className="text-xs text-mist ml-1">
                    (auto-set from structure — click Customise to override)
                  </span>
                )}
              </div>
            )}

            {/* Advanced / full checkbox list — always open for complex structures */}
            {(processesOpen || layers.length > 4) && (
              <div className="mt-2 p-3 rounded-lg border border-border bg-slate/20 space-y-2">
                {layers.length > 4 && !processesOpen && (
                  <p className="text-xs text-mist mb-2">
                    Complex structure ({layers.length} layers) — verify all processes apply.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {processOptions.map((opt) => (
                    <label
                      key={opt.code}
                      className="inline-flex items-start gap-2 text-sm cursor-pointer"
                      title={opt.description}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={processes.find((p) => p.process_key === opt.code)?.enabled ?? false}
                        onChange={() => toggleProcess(opt.code)}
                      />
                      <span>
                        <span className="font-medium text-navy">{opt.label}</span>
                        <span className="block text-xs text-mist">{opt.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-border">
          <button type="button" className="btn-secondary flex-1 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1 text-sm"
            disabled={saving || !name.trim()}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create template' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateBuilder;
