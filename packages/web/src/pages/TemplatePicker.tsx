import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Grid3x3, Layers, User, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api';
import CustomerAutocomplete from '../components/CustomerAutocomplete';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { SkeletonCard } from '../components/Skeleton';

function templateGroup(t: any): string {
  const mc = t.materialClass || '';
  const st = t.structureType || '';
  if (mc === 'PE' && st === 'Mono') return 'PE Mono';
  if (mc === 'Non PE' && st === 'Mono') return 'Non PE Mono';
  if (st === 'Multilayer') return 'Non PE Multilayer';
  return 'Other';
}

const TemplatePicker = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'standard' | 'my' | 'blank'>('standard');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [jobName, setJobName] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [myTemplates, setMyTemplates] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [instantiating, setInstantiating] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const tmplData = await apiClient.getTemplates(true);
      setTemplates(tmplData || []);
    } catch (err) {
      console.error('Failed to load templates', err);
      setTemplates([]);
      setLoadError('Could not load standard templates. Check that the API server is running, then retry.');
    }
    try {
      const mine = await apiClient.getMyTemplates();
      setMyTemplates((mine || []).filter((t: any) => t.isStandard === false));
    } catch {
      setMyTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const customerFromUrl = searchParams.get('customer');
    if (customerFromUrl) {
      setSelectedCustomer(customerFromUrl);
    }
    loadData();
  }, []);

  const listForTab = activeTab === 'my' ? myTemplates : templates;
  const filteredTemplates = listForTab.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.pebiParentPg || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filteredTemplates.reduce<Record<string, any[]>>((acc, t) => {
    const g = templateGroup(t);
    if (!acc[g]) acc[g] = [];
    acc[g].push(t);
    return acc;
  }, {});

  const handleUseTemplate = async (templateId: string, templateName: string) => {
    setInstantiating(templateId);
    try {
      const instantiated = await apiClient.instantiateTemplate(templateId, {
        customerId: selectedCustomer || undefined,
        jobName: jobName.trim() || templateName,
      });
      navigate(`/estimate/${instantiated.id}`);
    } catch (err) {
      alert('Failed to create estimate from template');
    } finally {
      setInstantiating(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-28 lg:pb-0">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy mb-2">New Estimate</h1>
        <p className="text-mist">
          Click a template to open the editor, or start from a blank canvas
        </p>
      </div>

      <div className="card mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Customer</label>
            <CustomerAutocomplete value={selectedCustomer || ''} onChange={setSelectedCustomer} />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Job Name</label>
            <input
              type="text"
              placeholder="e.g., Chips duplex laminate"
              className="input w-full"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-mist" />
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
              activeTab === 'standard'
                ? 'border-gold text-gold'
                : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            <Grid3x3 className="w-4 h-4 inline-block mr-2" />
            Standard Templates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'my'
                ? 'border-gold text-gold'
                : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            <User className="w-4 h-4 inline-block mr-2" />
            My Templates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blank')}
            className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'blank'
                ? 'border-gold text-gold'
                : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            <Layers className="w-4 h-4 inline-block mr-2" />
            Blank Canvas
          </button>
        </nav>
      </div>

      {(activeTab === 'standard' || activeTab === 'my') && (
        <div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : loadError && activeTab === 'standard' ? (
            <div className="card text-center py-12">
              <p className="text-danger mb-4">{loadError}</p>
              <button type="button" className="btn-primary" onClick={loadData}>
                Retry
              </button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="card text-center py-12">
              <Grid3x3 className="w-12 h-12 text-mist mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-navy mb-2">
                {activeTab === 'my' ? 'No saved templates yet' : searchTerm ? 'No templates match your search' : 'No templates yet'}
              </h3>
              {activeTab === 'my' && (
                <p className="text-mist text-sm mt-2 max-w-md mx-auto">
                  Start from a standard template, edit layers in the estimate editor, then use{' '}
                  <strong>Save as Template</strong> to add it here.
                </p>
              )}
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-8">
                <h3 className="text-lg font-display font-semibold text-navy mb-4">{group}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      disabled={instantiating !== null}
                      onClick={() => handleUseTemplate(template.id, template.name)}
                      className={`card hover:shadow-md transition-shadow cursor-pointer text-left w-full ${
                        instantiating === template.id ? 'ring-2 ring-gold opacity-90' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <LaminateVisualizer
                          layers={(template.defaultLayers || []).map((l: any, i: number) => ({
                            id: String(i),
                            type: l.layer_type || 'substrate',
                            material: l.ref_material_key || 'Layer',
                            micron: l.default_micron || 10,
                          }))}
                          width={48}
                          height={64}
                        />
                        <div className="flex-1">
                          <h4 className="font-display font-semibold text-navy mb-1">{template.name}</h4>
                          <p className="text-sm text-mist mb-2">{template.pebiParentPg || template.structureType || ''}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 bg-slate rounded-md">{template.productType}</span>
                            <span className="text-xs text-mist">{template.materialClass || ''}</span>
                          </div>
                          {instantiating === template.id && (
                            <p className="text-xs text-gold mt-2 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Opening editor…
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'blank' && (
        <div className="card">
          <div className="text-center py-12">
            <Layers className="w-16 h-16 text-mist mx-auto mb-6" />
            <h3 className="text-2xl font-display font-semibold text-navy mb-3">Start from Scratch</h3>
            <p className="text-mist max-w-md mx-auto mb-8">
              Build your structure layer by layer. Choose your product type and add materials from your library.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/estimate/new?template=blank&type=roll" className="btn-secondary">
                Create Roll Estimate
              </Link>
              <Link to="/estimate/new?template=blank&type=pouch" className="btn-secondary">
                Create Pouch Estimate
              </Link>
              <Link to="/estimate/new?template=blank&type=sleeve" className="btn-secondary">
                Create Sleeve Estimate
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatePicker;
