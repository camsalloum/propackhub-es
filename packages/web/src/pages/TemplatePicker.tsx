import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Grid3x3, Layers } from 'lucide-react';
import { apiClient } from '../lib/api';

const TemplatePicker = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'standard' | 'blank'>('standard');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const tmplData = await apiClient.getTemplates();
      setTemplates(tmplData || []);
    } catch (err) {
      console.error('Failed to load templates', err);
      setTemplates([]);
      setLoadError('Could not load standard templates. Check that the API server is running, then retry.');
    }
    try {
      const custData = await apiClient.getCustomers();
      setCustomers(custData || []);
    } catch (err) {
      console.error('Failed to load customers', err);
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

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.pebiParentPg || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUseTemplate = async () => {
    if (!selectedTemplate) return;
    try {
      const jobNameInput = (document.querySelector('input[placeholder*="Chips duplex"]') as HTMLInputElement)?.value;
      const instantiated = await apiClient.instantiateTemplate(selectedTemplate, {
        customerId: selectedCustomer || undefined,
        jobName: jobNameInput || undefined,
      });
      navigate(`/estimate/${instantiated.id}`);
    } catch (err) {
      alert('Failed to create estimate from template');
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-28 lg:pb-0">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy mb-2">New Estimate</h1>
        <p className="text-mist">Start from a standard template, your saved template, or a blank canvas</p>
      </div>

      {/* Customer and job name inputs */}
      <div className="card mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Customer</label>
            <div className="flex space-x-2">
              <select className="input flex-1" value={selectedCustomer || ''} onChange={(e) => setSelectedCustomer(e.target.value || null)}>
                <option value="">Select a customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
              <button className="btn-secondary whitespace-nowrap" onClick={async () => {
                const name = prompt('Customer company name');
                if (!name) return;
                try {
                  const created = await apiClient.createCustomer({ companyName: name }) as any;
                  setCustomers((prev) => [created, ...prev]);
                  setSelectedCustomer(created.id);
                } catch (err) {
                  alert('Failed to create customer');
                }
              }}>+ New</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-2">Job Name</label>
            <input
              type="text"
              placeholder="e.g., Chips duplex laminate"
              className="input w-full"
            />
          </div>
        </div>
      </div>

      {/* Search */}
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

      {/* Tabs */}
      <div className="border-b border-border mb-8">
        <nav className="flex space-x-8">
          <button
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

      {/* Content based on active tab */}
      {activeTab === 'standard' && (
        <div>
          {loading ? (
            <div className="card text-center py-12 text-mist">Loading templates…</div>
          ) : loadError ? (
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
                {searchTerm ? 'No templates match your search' : 'No templates yet'}
              </h3>
              <p className="text-mist">
                {searchTerm
                  ? 'Try a different search term'
                  : 'Standard product-group templates are loading — refresh the page. If this persists, restart the API server.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`card hover:shadow-md transition-shadow cursor-pointer ${selectedTemplate === template.id ? 'ring-2 ring-gold' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                      <Layers className="w-5 h-5 text-gold" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display font-semibold text-navy mb-1">{template.name}</h4>
                      <p className="text-sm text-mist mb-2">{template.pebiParentPg || template.structureType || ''}</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs px-2 py-1 bg-slate rounded-md">
                          {template.productType}
                        </span>
                        <span className="text-xs text-mist">{template.materialClass || ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              <Link
                to="/estimate/new?template=blank&type=roll"
                className="btn-secondary"
              >
                Create Roll Estimate
              </Link>
              <Link
                to="/estimate/new?template=blank&type=pouch"
                className="btn-secondary"
              >
                Create Pouch Estimate
              </Link>
              <Link
                to="/estimate/new?template=blank&type=sleeve"
                className="btn-secondary"
              >
                Create Sleeve Estimate
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Continue — desktop */}
      <div className="mt-8 pt-8 border-t border-border hidden lg:block">
        <div className="flex justify-end">
          <button
            className="btn-primary"
            disabled={!selectedTemplate}
            onClick={handleUseTemplate}
          >
            Continue to Estimate Editor
          </button>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      {activeTab === 'standard' && selectedTemplate && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 px-4 safe-area-pb">
          <button
            type="button"
            className="btn-primary w-full shadow-lg"
            onClick={handleUseTemplate}
          >
            Continue to editor
          </button>
        </div>
      )}
    </div>
  );
};

export default TemplatePicker;