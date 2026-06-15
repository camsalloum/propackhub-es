import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Grid3x3, FileText, Layers } from 'lucide-react';

const TemplatePicker = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'standard' | 'my' | 'blank'>('standard');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // fetch customers
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiClient.getCustomers();
        if (mounted) setCustomers(data || []);
      } catch (err) {
        console.error('Failed to load customers', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Mock template data based on Decision #17 - 11 parent PGs
  const standardTemplates = [
    { id: 1, group: 'A · PE Mono', name: 'Commercial Items Plain', type: 'pouch', structure: 'PE Mono', icon: '🛍️' },
    { id: 2, group: 'A · PE Mono', name: 'Commercial Items Printed', type: 'pouch', structure: 'PE Mono + Ink', icon: '🖨️' },
    { id: 3, group: 'A · PE Mono', name: 'Industrial Items Plain', type: 'roll', structure: 'PE Mono', icon: '🏭' },
    { id: 4, group: 'A · PE Mono', name: 'Industrial Items Printed', type: 'roll', structure: 'PE Mono + Ink', icon: '🏭🖨️' },
    { id: 5, group: 'A · PE Mono', name: 'Shrink Film Plain', type: 'roll', structure: 'PE Mono', icon: '📦' },
    { id: 6, group: 'A · PE Mono', name: 'Shrink Film Printed', type: 'roll', structure: 'PE Mono + Ink', icon: '📦🖨️' },
    { id: 7, group: 'A · PE Mono', name: 'Wide Film', type: 'roll', structure: 'PE Mono', icon: '📏' },
    { id: 8, group: 'B · Non PE Mono', name: 'Mono Layer Printed', type: 'roll', structure: 'Non PE + Ink', icon: '📄' },
    { id: 9, group: 'B · Non PE Mono', name: 'Shrink Sleeves', type: 'sleeve', structure: 'PVC/PET', icon: '👕' },
    { id: 10, group: 'B · Non PE Mono', name: 'Labels', type: 'roll', structure: 'Face Stock', icon: '🏷️' },
    { id: 11, group: 'C · Non PE Multilayer', name: 'Laminates', type: 'roll', structure: 'PET/PE 4L', icon: '🥞' },
  ];

  const myTemplates = [
    { id: 12, name: 'Snack Pouch', type: 'pouch', structure: 'PET/AL/PE', lastUsed: '2 days ago' },
    { id: 13, name: 'Coffee Bag', type: 'pouch', structure: 'PET/PE', lastUsed: '1 week ago' },
    { id: 14, name: 'Pet Food Laminate', type: 'roll', structure: 'PET/AL/PE', lastUsed: '2 weeks ago' },
  ];

  const filteredStandardTemplates = standardTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.structure.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMyTemplates = myTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
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
                  const created = await apiClient.createCustomer({ companyName: name });
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
            onClick={() => setActiveTab('my')}
            className={`pb-4 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'my'
                ? 'border-gold text-gold'
                : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            <FileText className="w-4 h-4 inline-block mr-2" />
            My Templates
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
          {filteredStandardTemplates.length === 0 ? (
            <div className="card text-center py-12">
              <Grid3x3 className="w-12 h-12 text-mist mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-navy mb-2">No templates found</h3>
              <p className="text-mist">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Group templates by group */}
              {['A · PE Mono', 'B · Non PE Mono', 'C · Non PE Multilayer'].map((group) => {
                const groupTemplates = filteredStandardTemplates.filter(t => t.group === group);
                if (groupTemplates.length === 0) return null;

                return (
                  <div key={group}>
                    <h3 className="text-lg font-display font-semibold text-navy mb-4">{group}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupTemplates.map((template) => (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`card hover:shadow-md transition-shadow cursor-pointer ${selectedTemplate === template.id ? 'ring-2 ring-gold' : ''}`}
                        >
                          <div className="flex items-start space-x-4">
                            <div className="text-2xl">{template.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-display font-semibold text-navy mb-1">{template.name}</h4>
                              <p className="text-sm text-mist mb-2">{template.structure}</p>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs px-2 py-1 bg-slate rounded-md">
                                  {template.type}
                                </span>
                                <span className="text-xs text-mist">Default: Wide Web</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'my' && (
        <div>
          {filteredMyTemplates.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-12 h-12 text-mist mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-navy mb-2">No saved templates</h3>
              <p className="text-mist mb-6">Save structures from your estimates to create templates</p>
              <Link to="/estimate/new?template=blank" className="btn-secondary">
                Start with Blank Canvas
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyTemplates.map((template) => (
                <Link
                  key={template.id}
                  to={`/estimate/new?template=${template.id}`}
                  className="card hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-gold" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display font-semibold text-navy mb-1">{template.name}</h4>
                      <p className="text-sm text-mist mb-2">{template.structure}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-slate rounded-md">
                          {template.type}
                        </span>
                        <span className="text-xs text-mist">Used {template.lastUsed}</span>
                      </div>
                    </div>
                  </div>
                </Link>
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

      {/* Continue button */}
      <div className="mt-8 pt-8 border-t border-border">
          <div className="flex justify-end">
          <button
            className="btn-primary"
            disabled={!selectedTemplate}
            onClick={() => {
              if (!selectedTemplate) return;
              const url = `/estimate/new?template=${selectedTemplate}${selectedCustomer ? `&customer=${selectedCustomer}` : ''}`;
              window.location.href = url;
            }}
          >
            Continue to Estimate Editor
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePicker;