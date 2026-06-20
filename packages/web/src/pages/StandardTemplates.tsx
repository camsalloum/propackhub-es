import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid3x3, User, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { SkeletonCard } from '../components/Skeleton';

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
  pebiParentPg?: string;
  productType: 'roll' | 'sleeve' | 'pouch';
  materialClass?: string;
  structureType?: string;
  displayOrder?: number;
  defaultDimensions?: Record<string, number>;
  defaultLayers?: TemplateLayer[];
  defaultProcesses?: { process_key: string; enabled: boolean }[];
  defaultPrintingWebClass?: 'wide_web' | 'narrow_web';
  isStandard?: boolean;
}

interface MaterialOption {
  id: string;
  name: string;
  type: string;
}

const PROCESS_KEYS = ['extrusion', 'printing', 'lamination', 'slitting', 'pouch_making', 'seaming'];

function templateGroup(t: StructureTemplate): string {
  const mc = t.materialClass || '';
  const st = t.structureType || '';
  if (mc === 'PE' && st === 'Mono') return 'PE Mono';
  if (mc === 'Non PE' && st === 'Mono') return 'Non PE Mono';
  if (st === 'Multilayer') return 'Non PE Multilayer';
  if (t.isStandard === false) return 'My Templates';
  return 'Other';
}

function visualizerLayers(template: StructureTemplate, materials: MaterialOption[]) {
  return (template.defaultLayers || []).map((l, i) => {
    const mat = materials.find((m) => m.id === l.materialId);
    return {
      id: String(i),
      type: l.layer_type || 'substrate',
      material: mat?.name || l.ref_material_key || 'Layer',
      micron: l.default_micron || 10,
    };
  });
}

const StandardTemplates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'tenant_admin' || user?.role === 'platform_admin';

  const [activeTab, setActiveTab] = useState<'standard' | 'my'>('standard');
  const [searchTerm, setSearchTerm] = useState('');
  const [standardTemplates, setStandardTemplates] = useState<StructureTemplate[]>([]);
  const [myTemplates, setMyTemplates] = useState<StructureTemplate[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [instantiating, setInstantiating] = useState<string | null>(null);
  const [editing, setEditing] = useState<StructureTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [standard, mine, mats] = await Promise.all([
        apiClient.getTemplates(true),
        apiClient.getMyTemplates(),
        apiClient.getMaterials(),
      ]);
      setStandardTemplates(standard || []);
      setMyTemplates((mine || []).filter((t: StructureTemplate) => t.isStandard === false));
      setMaterials(
        (mats || []).map((m: any) => ({ id: m.id, name: m.name, type: m.type || m.materialType }))
      );
    } catch (err) {
      console.error(err);
      setLoadError('Could not load templates. Check that the API server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const listForTab = activeTab === 'my' ? myTemplates : standardTemplates;
  const filtered = listForTab.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.pebiParentPg || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, StructureTemplate[]>>((acc, t) => {
    const g = templateGroup(t);
    if (!acc[g]) acc[g] = [];
    acc[g].push(t);
    return acc;
  }, {});

  const handleUseTemplate = async (template: StructureTemplate) => {
    setInstantiating(template.id);
    try {
      const created = await apiClient.instantiateTemplate(template.id, {
        jobName: template.name,
      });
      navigate(`/estimate/${created.id}`);
    } catch {
      alert('Failed to create estimate from template');
    } finally {
      setInstantiating(null);
    }
  };

  const handleDelete = async (template: StructureTemplate) => {
    const label = template.isStandard ? 'deactivate' : 'delete';
    if (!confirm(`${template.isStandard ? 'Deactivate' : 'Delete'} template "${template.name}"?`)) return;
    setDeleting(template.id);
    try {
      await apiClient.deleteTemplate(template.id);
      await loadData();
    } catch (err) {
      alert(`Failed to ${label} template`);
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (template: StructureTemplate) => {
    if (template.isStandard && !isAdmin) return;
    setEditing({
      ...template,
      defaultLayers: (template.defaultLayers || []).map((l) => ({ ...l })),
      defaultProcesses: (template.defaultProcesses || []).map((p) => ({ ...p })),
      defaultDimensions: { ...(template.defaultDimensions || {}) },
    });
  };

  const updateEditingLayer = (index: number, patch: Partial<TemplateLayer>) => {
    if (!editing) return;
    const layers = [...(editing.defaultLayers || [])];
    layers[index] = { ...layers[index], ...patch };
    setEditing({ ...editing, defaultLayers: layers });
  };

  const addLayer = () => {
    if (!editing) return;
    const layers = editing.defaultLayers || [];
    setEditing({
      ...editing,
      defaultLayers: [
        ...layers,
        {
          layer_order: layers.length + 1,
          layer_type: 'substrate',
          materialId: materials[0]?.id || null,
          default_micron: 20,
        },
      ],
    });
  };

  const removeLayer = (index: number) => {
    if (!editing) return;
    const layers = (editing.defaultLayers || [])
      .filter((_, i) => i !== index)
      .map((l, i) => ({ ...l, layer_order: i + 1 }));
    setEditing({ ...editing, defaultLayers: layers });
  };

  const toggleProcess = (key: string) => {
    if (!editing) return;
    const procs = [...(editing.defaultProcesses || [])];
    const idx = procs.findIndex((p) => p.process_key === key);
    if (idx >= 0) {
      procs[idx] = { ...procs[idx], enabled: !procs[idx].enabled };
    } else {
      procs.push({ process_key: key, enabled: true });
    }
    setEditing({ ...editing, defaultProcesses: procs });
  };

  const isProcessEnabled = (key: string) =>
    (editing?.defaultProcesses || []).find((p) => p.process_key === key)?.enabled ?? false;

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiClient.updateTemplate(editing.id, {
        name: editing.name,
        productType: editing.productType,
        materialClass: editing.materialClass,
        structureType: editing.structureType,
        displayOrder: editing.displayOrder,
        defaultDimensions: editing.defaultDimensions,
        defaultLayers: editing.defaultLayers,
        defaultProcesses: editing.defaultProcesses,
        defaultPrintingWebClass: editing.defaultPrintingWebClass,
      });
      setEditing(null);
      await loadData();
    } catch (err) {
      alert('Failed to save template: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-28 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Standard Templates</h1>
          <p className="text-mist mt-1">
            {isAdmin
              ? 'Manage platform templates or start a quote from any stack'
              : 'Browse templates and save your own from the estimate editor'}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          onClick={() => navigate('/estimate/choose')}
        >
          <Plus className="w-4 h-4" />
          New estimate
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mist" />
          <input
            type="text"
            placeholder="Search templates..."
            className="input w-full pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border-b border-border mb-8">
        <nav className="flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('standard')}
            className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'standard' ? 'border-gold text-gold' : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            <Grid3x3 className="w-4 h-4 inline-block mr-2" />
            Standard ({standardTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'my' ? 'border-gold text-gold' : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            <User className="w-4 h-4 inline-block mr-2" />
            My Templates ({myTemplates.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : loadError ? (
        <div className="card text-center py-12">
          <p className="text-danger mb-4">{loadError}</p>
          <button type="button" className="btn-primary" onClick={loadData}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Grid3x3 className="w-12 h-12 text-mist mx-auto mb-4" />
          <h3 className="text-xl font-display font-semibold text-navy mb-2">
            {activeTab === 'my' ? 'No saved templates yet' : 'No templates found'}
          </h3>
          {activeTab === 'my' && (
            <p className="text-mist text-sm max-w-md mx-auto">
              Open a standard template, adjust layers in the editor, then use <strong>Save as Template</strong>.
            </p>
          )}
        </div>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-8">
            <h3 className="text-lg font-display font-semibold text-navy mb-4">{group}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((template) => (
                <div key={template.id} className="card flex flex-col">
                  <button
                    type="button"
                    className="flex items-start space-x-4 text-left flex-1 hover:opacity-90"
                    disabled={instantiating === template.id}
                    onClick={() => handleUseTemplate(template)}
                  >
                    <LaminateVisualizer
                      layers={visualizerLayers(template, materials)}
                      width={48}
                      height={64}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-semibold text-navy mb-1">{template.name}</h4>
                      <p className="text-sm text-mist mb-2 truncate">
                        {template.pebiParentPg || template.structureType || ''}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-slate rounded-md">{template.productType}</span>
                        <span className="text-xs text-mist">{template.materialClass || ''}</span>
                      </div>
                      {instantiating === template.id && (
                        <p className="text-xs text-gold mt-2 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Creating estimate…
                        </p>
                      )}
                    </div>
                  </button>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    {(isAdmin || !template.isStandard) && (
                      <button
                        type="button"
                        className="btn-secondary flex-1 text-sm py-2 inline-flex items-center justify-center gap-1"
                        onClick={() => openEdit(template)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                    {(isAdmin || !template.isStandard) && (
                      <button
                        type="button"
                        className="btn-secondary text-sm py-2 px-3 text-red-600 hover:bg-red-50"
                        disabled={deleting === template.id}
                        onClick={() => handleDelete(template)}
                        aria-label="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setEditing(null)}
          />
          <div className="relative bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-display font-bold text-navy mb-4">Edit template</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Name</label>
                <input
                  className="input w-full"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Product type</label>
                  <select
                    className="input w-full"
                    value={editing.productType}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        productType: e.target.value as StructureTemplate['productType'],
                      })
                    }
                  >
                    <option value="roll">Roll</option>
                    <option value="pouch">Pouch</option>
                    <option value="sleeve">Sleeve</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-1">Printing web</label>
                  <select
                    className="input w-full"
                    value={editing.defaultPrintingWebClass || 'wide_web'}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        defaultPrintingWebClass: e.target.value as 'wide_web' | 'narrow_web',
                      })
                    }
                  >
                    <option value="wide_web">Wide Web (Ink SB)</option>
                    <option value="narrow_web">Narrow Web (Ink UV)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-navy">Layers</label>
                  <button type="button" className="text-sm text-gold font-medium" onClick={addLayer}>
                    + Add layer
                  </button>
                </div>
                <div className="space-y-2">
                  {(editing.defaultLayers || []).map((layer, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        className="input flex-1 text-sm"
                        value={layer.materialId || ''}
                        onChange={(e) => updateEditingLayer(i, { materialId: e.target.value || null })}
                      >
                        <option value="">Select material</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.type})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="input w-20 text-sm"
                        value={layer.default_micron}
                        min={0}
                        step={0.5}
                        onChange={(e) =>
                          updateEditingLayer(i, { default_micron: parseFloat(e.target.value) || 0 })
                        }
                        aria-label="Micron"
                      />
                      <span className="text-xs text-mist shrink-0">µ</span>
                      <button
                        type="button"
                        className="text-red-500 p-2"
                        onClick={() => removeLayer(i)}
                        aria-label="Remove layer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy mb-2">Processes</label>
                <div className="flex flex-wrap gap-2">
                  {PROCESS_KEYS.map((key) => (
                    <label key={key} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isProcessEnabled(key)}
                        onChange={() => toggleProcess(key)}
                      />
                      {key.replace(/_/g, ' ')}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={saving}
                onClick={handleSaveEdit}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StandardTemplates;
