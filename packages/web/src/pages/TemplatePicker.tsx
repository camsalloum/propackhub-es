import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layers, Loader2 } from 'lucide-react';
import CustomerAutocomplete from '../components/CustomerAutocomplete';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { useMasterDataReference } from '../hooks/useMasterDataReference';
import { apiClient } from '../lib/api';
import {
  getTemplateClassification,
  matchesClassFilter,
  type ClassFilter,
  type TemplateStructureTier,
} from '../lib/templateCatalog';

interface TemplateLayer {
  layer_order: number;
  layer_type: 'substrate' | 'ink' | 'adhesive';
  ref_material_key?: string;
  materialId?: string | null;
  default_micron: number;
}

interface StructureTemplate {
  id: string;
  name: string;
  productType: 'roll' | 'sleeve' | 'pouch';
  pebiParentPg?: string | null;
  materialClass?: string | null;
  structureType?: string | null;
  displayOrder?: number;
  defaultLayers?: TemplateLayer[];
  isStandard?: boolean;
}

interface MaterialOption {
  id: string;
  name: string;
  type: string;
}

const EMPTY_FILTER: ClassFilter = { materialClass: null, isPrinted: null, structure: null };

const CLASS_ROW: Array<{ label: string; value: 'PE' | 'Non PE' }> = [
  { label: 'PE', value: 'PE' },
  { label: 'Non PE', value: 'Non PE' },
];

const PRINT_ROW: Array<{ label: string; value: boolean }> = [
  { label: 'Printed', value: true },
  { label: 'Plain', value: false },
];

const STRUCTURE_ROW: Array<{ label: string; value: TemplateStructureTier }> = [
  { label: 'Mono', value: 'mono' },
  { label: 'Duplex', value: 'duplex' },
  { label: 'Triplex', value: 'triplex' },
  { label: 'Quadriplex', value: 'quadriplex' },
];

function classifyTemplate(t: StructureTemplate) {
  return getTemplateClassification({
    name: t.name,
    productType: t.productType,
    pebiParentPg: t.pebiParentPg,
    materialClass: t.materialClass,
    structureType: t.structureType,
    defaultLayers: t.defaultLayers,
    isStandard: t.isStandard,
  });
}

function visualizerLayers(template: StructureTemplate, materials: MaterialOption[]) {
  return (template.defaultLayers || []).map((l, i) => ({
    id: String(i),
    type: l.layer_type || 'substrate',
    material: materials.find((m) => m.id === l.materialId)?.name || l.ref_material_key || 'Layer',
    micron: l.default_micron || 10,
  }));
}

function GridCell({
  label,
  active,
  disabled,
  wide,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-4 py-2 rounded-lg text-sm font-medium border transition-all select-none',
        wide ? 'col-span-full w-full' : '',
        active
          ? 'bg-gold/15 text-gold border-gold/40 shadow-sm'
          : disabled
          ? 'border-border text-mist/40 bg-white cursor-default'
          : 'border-border text-ink bg-white hover:border-gold/30 hover:text-gold',
      ]
        .join(' ')
        .trim()}
    >
      {label}
    </button>
  );
}

const TemplatePicker = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { reference: masterRef } = useMasterDataReference();

  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [jobName, setJobName] = useState('');
  const [templates, setTemplates] = useState<StructureTemplate[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [instantiating, setInstantiating] = useState<string | null>(null);
  const [filter, setFilter] = useState<ClassFilter>(EMPTY_FILTER);

  useEffect(() => {
    const c = searchParams.get('customer');
    if (c) setSelectedCustomer(c);
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const [tmpl, mats] = await Promise.all([
        apiClient.getTemplates(true),
        apiClient.getMaterials().catch(() => []),
      ]);
      const unique = new Map<string, StructureTemplate>();
      for (const t of (tmpl || []) as StructureTemplate[]) {
        const key = t.name.trim().toLowerCase();
        if (!unique.has(key)) unique.set(key, t);
      }
      setTemplates([...unique.values()].sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)));
      setMaterials(
        (mats || []).map((m: any) => ({ id: m.id, name: m.name, type: m.type || m.materialType }))
      );
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isAllActive =
    filter.materialClass === null && filter.isPrinted === null && filter.structure === null;

  const filtered = useMemo(
    () =>
      isAllActive
        ? templates
        : templates.filter((t) =>
            matchesClassFilter(
              {
                name: t.name,
                productType: t.productType,
                pebiParentPg: t.pebiParentPg,
                materialClass: t.materialClass,
                structureType: t.structureType,
                defaultLayers: t.defaultLayers,
                isStandard: t.isStandard,
              },
              filter
            )
          ),
    [templates, filter, isAllActive]
  );

  function countWithFilter(partial: Partial<ClassFilter>) {
    const test = { ...filter, ...partial };
    return templates.filter((t) =>
      matchesClassFilter(
        {
          name: t.name,
          productType: t.productType,
          pebiParentPg: t.pebiParentPg,
          materialClass: t.materialClass,
          structureType: t.structureType,
          defaultLayers: t.defaultLayers,
          isStandard: t.isStandard,
        },
        test
      )
    ).length;
  }

  const toggleClass = (v: 'PE' | 'Non PE') =>
    setFilter((f) => ({ ...f, materialClass: f.materialClass === v ? null : v }));
  const togglePrint = (v: boolean) =>
    setFilter((f) => ({ ...f, isPrinted: f.isPrinted === v ? null : v }));
  const toggleStructure = (v: TemplateStructureTier) =>
    setFilter((f) => ({ ...f, structure: f.structure === v ? null : v }));

  const handleUseTemplate = async (template: StructureTemplate) => {
    if (instantiating) return;
    setInstantiating(template.id);
    try {
      const created = await apiClient.instantiateTemplate(template.id, {
        customerId: selectedCustomer || undefined,
        jobName: jobName.trim() || template.name,
      });
      navigate(`/estimate/${created.id}`);
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e.status === 409) {
        alert('This template has unresolved materials. Ask your admin to relink layers in Standard Templates.');
      } else {
        alert(e.message || 'Failed to create estimate');
      }
    } finally {
      setInstantiating(null);
    }
  };

  const blankQuery = new URLSearchParams();
  if (selectedCustomer) blankQuery.set('customer', selectedCustomer);
  if (jobName.trim()) blankQuery.set('jobName', jobName.trim());

  return (
    <div className="max-w-5xl mx-auto pb-28 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy mb-1">New estimate</h1>
        <p className="text-mist text-sm">Select a structure below, or start from a blank canvas.</p>
      </div>

      {/* Customer + job */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Customer</label>
            <CustomerAutocomplete value={selectedCustomer || ''} onChange={setSelectedCustomer} />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Job name</label>
            <input
              type="text"
              placeholder="e.g. Chips duplex laminate"
              className="input w-full"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Classification grid */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-navy mb-3">Choose a structure</h2>
        <div className="space-y-2">
          {/* Row 1 — All */}
          <div>
            <GridCell
              label="All"
              active={isAllActive}
              disabled={false}
              wide
              onClick={() => setFilter(EMPTY_FILTER)}
            />
          </div>

          {/* Row 2 — Material class */}
          <div className="grid grid-cols-2 gap-2">
            {CLASS_ROW.map(({ label, value }) => (
              <GridCell
                key={value}
                label={label}
                active={filter.materialClass === value}
                disabled={!isAllActive && filter.materialClass !== value && countWithFilter({ materialClass: value }) === 0}
                onClick={() => toggleClass(value)}
              />
            ))}
          </div>

          {/* Row 3 — Printed / Plain */}
          <div className="grid grid-cols-2 gap-2">
            {PRINT_ROW.map(({ label, value }) => (
              <GridCell
                key={label}
                label={label}
                active={filter.isPrinted === value}
                disabled={countWithFilter({ isPrinted: value }) === 0}
                onClick={() => togglePrint(value)}
              />
            ))}
          </div>

          {/* Row 4 — Structure */}
          <div className="grid grid-cols-4 gap-2">
            {STRUCTURE_ROW.map(({ label, value }) => (
              <GridCell
                key={value}
                label={label}
                active={filter.structure === value}
                disabled={countWithFilter({ structure: value }) === 0}
                onClick={() => toggleStructure(value)}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-mist mt-3">
          {isAllActive ? `${templates.length} structure(s)` : `${filtered.length} of ${templates.length} structure(s) match`}
        </p>
      </div>

      {/* Template cards */}
      {loadingTemplates ? (
        <div className="flex items-center justify-center py-12 text-mist text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading structures…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-10 text-mist text-sm">
          No structures match the selected filters.{' '}
          <button type="button" className="text-gold underline" onClick={() => setFilter(EMPTY_FILTER)}>
            Reset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
          {filtered.map((template) => {
            const cls = classifyTemplate(template);
            const tag =
              cls.materialClass
                ? `${cls.materialClass} · ${cls.isPrinted ? 'Printed' : 'Plain'} · ${cls.structure.charAt(0).toUpperCase() + cls.structure.slice(1)}`
                : cls.structure.charAt(0).toUpperCase() + cls.structure.slice(1);

            return (
              <button
                key={template.id}
                type="button"
                disabled={instantiating === template.id}
                onClick={() => handleUseTemplate(template)}
                className="card p-3 text-left hover:border-gold/50 hover:shadow-sm transition-all disabled:opacity-60 group"
              >
                <div className="flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">
                    <LaminateVisualizer
                      layers={visualizerLayers(template, materials)}
                      width={24}
                      height={32}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-navy leading-tight line-clamp-2 group-hover:text-gold transition-colors">
                      {template.name}
                    </h4>
                    <p className="text-[10px] text-mist mt-0.5 truncate">{tag}</p>
                  </div>
                </div>
                {instantiating === template.id && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-gold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Creating…
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Blank canvas */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-1 py-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-mist" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy">Blank canvas</p>
              <p className="text-xs text-mist">Build layer by layer — no template</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {masterRef.productTypeOptions.map((pt) => {
              const q = new URLSearchParams(blankQuery);
              q.set('type', pt.value);
              return (
                <a
                  key={pt.value}
                  href={`/estimate/new?template=blank&${q.toString()}`}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {pt.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePicker;
