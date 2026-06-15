import { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Save, Download, ArrowLeft, Layers, Calculator, Ruler, DollarSign } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import { apiClient } from '../lib/api';

const EstimateEditor = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [estimate, setEstimate] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [slabsState, setSlabsState] = useState<any[]>([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<'structure' | 'dimensions' | 'slabs' | 'markup'>('structure');
  const [printingWebClass, setPrintingWebClass] = useState<'wide_web' | 'narrow_web'>('wide_web');

  useEffect(() => {
    if (id) {
      fetchEstimate(id);
    } else {
      // New estimate flow: initialize from template query param
      const template = searchParams.get('template');
      const customer = searchParams.get('customer');
      const templateId = template ? Number(template) : null;
      const defaultLayers = getTemplateLayers(templateId);
      const newEstimate = {
        id: undefined,
        jobName: 'New estimate',
        customer: customer || '',
        status: 'draft',
        displayCurrency: 'AED',
        salePricePerKg: 0,
        materialCostPerKg: 0,
        totalGsm: defaultLayers.reduce((s: number, l: any) => s + (l.gsm || 0), 0),
        totalMicron: defaultLayers.reduce((s: number, l: any) => s + (l.micron || 0), 0),
        markupPercent: 15,
      };
      setEstimate(newEstimate);
      setLayers(defaultLayers);
      setSlabsState([]);
      setPrintingWebClass('wide_web');
      setLoading(false);
    }
  }, [id]);

  const fetchEstimate = async (estimateId: string) => {
    try {
      setLoading(true);
      const data = await apiClient.getEstimate(estimateId);
      setEstimate(data);
      setLayers(data.layers || []);
      setSlabsState(data.slabs || []);
      setPrintingWebClass(data.printingWebClass || 'wide_web');
    } catch (error) {
      console.error('Failed to load estimate:', error);
      setEstimate(null);
    } finally {
      setLoading(false);
    }
  };

  function getTemplateLayers(templateId: number | null) {
    // Minimal mapping for standard templates — extend as needed
    if (templateId === 6) {
      return [
        { id: 1, type: 'substrate', material: 'PE Plain', micron: 30, gsm: 27, costPerKg: 1.2 },
        { id: 2, type: 'ink', material: 'Ink SB', micron: 5, gsm: 4.5, costPerKg: 8 },
      ];
    }
    if (templateId === 11) {
      return [
        { id: 1, type: 'substrate', material: 'PET', micron: 12, gsm: 18, costPerKg: 2.5 },
        { id: 2, type: 'substrate', material: 'PE', micron: 40, gsm: 36, costPerKg: 1.1 },
      ];
    }
    // default simple stack
    return [
      { id: 1, type: 'substrate', material: 'PE Plain', micron: 30, gsm: 27, costPerKg: 1.2 },
      { id: 2, type: 'ink', material: 'Ink SB', micron: 5, gsm: 4.5, costPerKg: 8 },
    ];
  }

  const handleSaveEstimate = async () => {
    try {
      const payload = {
        jobName: estimate.jobName,
        customerId: estimate.customer,
        printingWebClass,
        layers,
        slabs: slabsState,
        markupPercent: estimate.markupPercent,
      } as any;

      if (estimate.id) {
        const updated = await apiClient.updateEstimate(estimate.id, payload);
        setEstimate(updated);
        alert('Estimate saved');
      } else {
        const created = await apiClient.createEstimate(payload);
        navigate(`/estimate/${created.id}`);
      }
    } catch (err) {
      alert('Failed to save estimate');
    }
  };

  const handleRequote = async () => {
    if (!estimate?.id) return;
    try {
      const res = await apiClient.requoteEstimate(estimate.id);
      if (res && res.id) {
        navigate(`/estimate/${res.id}`);
      }
    } catch (err) {
      alert('Failed to create re-quote');
    }
  };

  const downloadProposalPdf = async () => {
    try {
      const blob = await apiClient.getProposalPdf(id as string);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download proposal PDF', error);
      // Fallback: open in new tab
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/estimates/${id}/proposal-pdf`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
        const text = await resp.text();
        const w = window.open();
        if (w) w.document.write(text);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return <div className="p-8">Loading estimate...</div>;
  }

  if (!estimate) {
    return <div className="p-8">Estimate not found</div>;
  }

  const slabs = slabsState.length > 0 ? slabsState : [
    { quantityKg: 1000, pricePerKg: 12.48, total: 12480 },
    { quantityKg: 2000, pricePerKg: 11.90, total: 23800 },
    { quantityKg: 5000, pricePerKg: 11.20, total: 56000 },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-mist hover:text-ink">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">{estimate.jobName}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-mist">{estimate.customer}</span>
                <span className="badge badge-draft">{estimate.status}</span>
                <span className="text-sm font-mono text-mist">{estimate.id}</span>
              </div>
            </div>
          </div>
            <div className="flex space-x-2">
            <button onClick={handleSaveEstimate} className="btn-secondary inline-flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button onClick={downloadProposalPdf} className="btn-primary inline-flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="lg:flex lg:space-x-8">
        {/* Left panel - scrollable form */}
        <div className="lg:flex-1 lg:max-w-3xl">
          {/* Navigation tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveSection('structure')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'structure' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}
            >
              <Layers className="w-4 h-4" />
              <span>Structure</span>
            </button>
            <button
              onClick={() => setActiveSection('dimensions')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'dimensions' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}
            >
              <Ruler className="w-4 h-4" />
              <span>Dimensions</span>
            </button>
            <button
              onClick={() => setActiveSection('slabs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'slabs' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}
            >
              <Calculator className="w-4 h-4" />
              <span>Quantity Slabs</span>
            </button>
            <button
              onClick={() => setActiveSection('markup')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'markup' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Markup & Extras</span>
            </button>
          </div>

          {/* Content based on active section */}
          {activeSection === 'structure' && (
            <div className="card space-y-6">
              <div>
                <h3 className="text-lg font-display font-semibold text-navy mb-4">Layer Stack</h3>
                
                {/* Printing web class toggle */}
                <div className="mb-6 p-4 bg-slate rounded-lg">
                  <label className="block text-sm font-medium text-navy mb-2">Printing Web Class</label>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setPrintingWebClass('wide_web')}
                      className={`px-4 py-2 rounded-lg ${printingWebClass === 'wide_web' ? 'bg-gold text-white' : 'bg-white border border-border'}`}
                    >
                      Wide Web printing (Ink SB)
                    </button>
                    <button
                      onClick={() => setPrintingWebClass('narrow_web')}
                      className={`px-4 py-2 rounded-lg ${printingWebClass === 'narrow_web' ? 'bg-gold text-white' : 'bg-white border border-border'}`}
                    >
                      Narrow Web printing (Ink UV)
                    </button>
                  </div>
                  <p className="text-sm text-mist mt-2">
                    {printingWebClass === 'wide_web' 
                      ? 'Ink SB (30% solid) with solvent mix' 
                      : 'Ink UV (100% solid) without solvent for ink'}
                  </p>
                </div>

                {/* Layers - cards (mobile) and table (desktop) */}
                <div className="space-y-4 md:hidden">
                  {layers.map((layer) => (
                    <LayerCard
                      key={layer.id}
                      layer={layer}
                      onMicronChange={(value) => {
                        setLayers((prev) => prev.map((l) => (l.id === layer.id ? { ...l, micron: value } : l)));
                      }}
                      onRemove={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))}
                    />
                  ))}
                </div>

                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">#</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">Material</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">µ</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">GSM</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">$/kg</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {layers.map((layer) => (
                        <tr key={layer.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                          <td className="py-4 px-4 text-sm text-mist">{layer.id}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs px-2 py-1 rounded-md ${
                              layer.type === 'substrate' ? 'bg-blue-100 text-blue-800' :
                              layer.type === 'ink' ? 'bg-purple-100 text-purple-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {layer.type}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-medium">{layer.material}</td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              value={layer.micron}
                              onChange={(e) => setLayers((prev) => prev.map((l) => (l.id === layer.id ? { ...l, micron: Number(e.target.value) } : l)))}
                              className="input w-20 font-mono text-sm"
                            />
                          </td>
                          <td className="py-4 px-4 font-mono text-sm">{layer.gsm.toFixed(1)}</td>
                          <td className="py-4 px-4 font-mono text-sm">{layer.costPerKg.toFixed(2)}</td>
                          <td className="py-4 px-4">
                            <button onClick={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))} className="text-sm text-mist hover:text-danger">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action buttons */}
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => {
                      const newLayer = { id: Date.now(), type: 'substrate', material: 'New material', micron: 25, gsm: 30, costPerKg: 0 };
                      setLayers((prev) => [...prev, newLayer]);
                    }}
                    className="btn-secondary"
                  >
                    + Add Layer
                  </button>
                  <button onClick={() => setLayers((prev) => [...prev, { id: Date.now(), type: 'substrate', material: 'Metallized Barrier', micron: 8, gsm: 8, costPerKg: 2.5 }])} className="btn-secondary">Add Metallized Barrier</button>
                </div>

                {/* Solvent mix (when SB present) */}
                {printingWebClass === 'wide_web' && (
                  <div className="mt-6 p-4 border border-border rounded-lg">
                    <h4 className="font-display font-semibold text-navy mb-3">Solvent Mix</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">Solvent-mix $/kg</label>
                        <input type="number" defaultValue="2.0" className="input w-full" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-navy mb-2">Ink-to-solvent ratio</label>
                        <input type="number" defaultValue="0.5" step="0.1" className="input w-full" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'dimensions' && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Dimensions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Reel width (mm)</label>
                  <input type="number" defaultValue="800" className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Cut-off (mm)</label>
                  <input type="number" defaultValue="600" className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Extra printing trim (mm)</label>
                  <input type="number" defaultValue="10" className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Number of ups</label>
                  <input type="number" defaultValue="2" className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Pieces per cut</label>
                  <input type="number" defaultValue="1" className="input w-full" />
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-display font-semibold text-navy mb-4">Calculated Values</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-mist">Printing web width</p>
                    <p className="font-mono font-semibold">1610 mm</p>
                  </div>
                  <div>
                    <p className="text-sm text-mist">Pieces/kg</p>
                    <p className="font-mono font-semibold">26.5</p>
                  </div>
                  <div>
                    <p className="text-sm text-mist">Linear m/kg (web)</p>
                    <p className="font-mono font-semibold">7.8</p>
                  </div>
                  <div>
                    <p className="text-sm text-mist">Linear m/kg (reel)</p>
                    <p className="font-mono font-semibold">15.6</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'slabs' && (
            <div className="card space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-semibold text-navy">Quantity Slab Pricing</h3>
                <select className="input w-48">
                  <option>Load slab template...</option>
                  <option>Standard 4-tier (1T/2T/5T/10T)</option>
                  <option>Small quantities (500/1000/2000 kg)</option>
                  <option>Large quantities (5T/10T/20T/50T)</option>
                </select>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-mist">Quantity (kg)</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-mist">Price/kg ({estimate.displayCurrency})</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-mist">Order total</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-mist"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {slabs.map((slab: any, index: number) => (
                      <tr key={index} className="border-b border-border last:border-0 hover:bg-slate/50">
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={slab.quantityKg}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setSlabsState((prev) => prev.map((s, i) => i === index ? { ...s, quantityKg: v, total: Number((v * s.pricePerKg) || 0) } : s));
                            }}
                            className="input w-32 font-mono"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={slab.pricePerKg}
                            step="0.01"
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setSlabsState((prev) => prev.map((s, i) => i === index ? { ...s, pricePerKg: v, total: Number((v * s.quantityKg) || 0) } : s));
                            }}
                            className="input w-32 font-mono"
                          />
                        </td>
                        <td className="py-4 px-4 font-display font-semibold">
                          {estimate.displayCurrency} {Number(slab.total || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <button onClick={() => setSlabsState((prev) => prev.filter((_, i) => i !== index))} className="text-sm text-mist hover:text-danger">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={() => setSlabsState((prev) => [...prev, { quantityKg: 1000, pricePerKg: 10, total: 1000 }])} className="btn-secondary">+ Add Slab Row</button>
            </div>
          )}

          {activeSection === 'markup' && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Markup & Additional Costs</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Markup %</label>
                  <input type="number" value={estimate.markupPercent} onChange={(e) => setEstimate({ ...estimate, markupPercent: Number(e.target.value) })} className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Plates/kg ({estimate.displayCurrency})</label>
                  <input type="number" defaultValue="0" step="0.01" className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Delivery/kg ({estimate.displayCurrency})</label>
                  <input type="number" defaultValue="0" step="0.01" className="input w-full" />
                </div>
              </div>

              <div className="pt-6 border-t border-border">
                <h4 className="font-display font-semibold text-navy mb-4">Processes</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate rounded-lg">
                    <div>
                      <p className="font-medium">Extrusion</p>
                      <p className="text-sm text-mist">kg/hr · Setup: 2h</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate rounded-lg">
                    <div>
                      <p className="font-medium">Printing</p>
                      <p className="text-sm text-mist">m/min · Setup: 4h</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - sticky sidebar */}
        <div className="lg:w-80 lg:flex-shrink-0 mt-8 lg:mt-0">
          <div className="sticky top-8 space-y-6">
            {/* Laminate visualizer */}
            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Laminate Stack</h3>
              <div className="space-y-1">
                {(() => {
                  const totalMicron = layers.reduce((s, l) => s + (Number(l.micron) || 0), 0) || 1;
                  const maxHeight = 180;
                  return layers.map((layer) => {
                    const h = Math.max(12, Math.round(((Number(layer.micron) || 0) / totalMicron) * maxHeight));
                    return (
                      <div
                        key={layer.id}
                        className="flex items-center justify-between py-2 px-3 rounded"
                        style={{
                          backgroundColor: layer.type === 'substrate' ? '#1D5FA3' :
                                           layer.type === 'ink' ? '#9B4CA0' : '#2E8B6E',
                          opacity: layer.type === 'ink' ? 0.7 : 1,
                          height: `${h}px`
                        }}
                      >
                        <span className="text-white text-sm font-medium">{layer.material}</span>
                        <span className="text-white text-sm font-mono">{layer.micron}µ</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Totals */}
            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Totals</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-mist">Total GSM</span>
                  <span className="font-mono font-semibold">{estimate.totalGsm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mist">Total µ</span>
                  <span className="font-mono font-semibold">{estimate.totalMicron}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mist">Film density</span>
                  <span className="font-mono font-semibold">{(estimate.totalGsm / estimate.totalMicron).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Sale price */}
            <div className="card bg-gold/5 border-gold/20">
              <h3 className="font-display font-semibold text-navy mb-2">Selling Price</h3>
              <div className="text-3xl font-display font-bold text-gold mb-2">
                {estimate.displayCurrency} {Number(estimate.salePricePerKg).toFixed(2)} /kg
              </div>
              <div className="text-sm text-mist">
                Base cost: {estimate.displayCurrency} 9.80/kg + markup + extras
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Cost Breakdown</h3>
              <div className="space-y-2">{
                (() => {
                  const mat = Number(estimate.materialCostPerKg) || 0;
                  const sale = Number(estimate.salePricePerKg) || 0;
                  const markup = Number(estimate.markupPercent) || 0;
                  const materialPct = sale ? Math.round((mat / sale) * 100) : 0;
                  const markupPct = Math.round(markup);
                  const wastePct = 0;
                  const processPct = Math.max(0, 100 - materialPct - markupPct - wastePct);
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Material</span>
                        <span className="text-sm font-semibold">{materialPct}%</span>
                      </div>
                      <div className="w-full bg-slate rounded-full h-2">
                        <div className="bg-blue-500 rounded-full h-2" style={{ width: `${materialPct}%` }}></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Waste</span>
                        <span className="text-sm font-semibold">{wastePct}%</span>
                      </div>
                      <div className="w-full bg-slate rounded-full h-2">
                        <div className="bg-yellow-500 rounded-full h-2" style={{ width: `${wastePct}%` }}></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Markup</span>
                        <span className="text-sm font-semibold">{markupPct}%</span>
                      </div>
                      <div className="w-full bg-slate rounded-full h-2">
                        <div className="bg-gold rounded-full h-2" style={{ width: `${markupPct}%` }}></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm">Process</span>
                        <span className="text-sm font-semibold">{processPct}%</span>
                      </div>
                      <div className="w-full bg-slate rounded-full h-2">
                        <div className="bg-green-500 rounded-full h-2" style={{ width: `${processPct}%` }}></div>
                      </div>
                    </>
                  );
                })()
              }</div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={handleSaveEstimate} className="btn-primary w-full">Save Estimate</button>
              <button onClick={downloadProposalPdf} className="btn-secondary w-full">Generate Proposal PDF</button>
              <button onClick={handleRequote} className="text-sm text-mist hover:text-ink w-full text-center py-2">
                Duplicate for re-quote
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateEditor;