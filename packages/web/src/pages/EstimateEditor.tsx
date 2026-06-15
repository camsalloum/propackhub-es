import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Download, ArrowLeft, Layers, Calculator, Ruler, DollarSign } from 'lucide-react';

const EstimateEditor = () => {
  const [activeSection, setActiveSection] = useState<'structure' | 'dimensions' | 'slabs' | 'markup'>('structure');
  const [printingWebClass, setPrintingWebClass] = useState<'wide_web' | 'narrow_web'>('wide_web');

  // Mock data
  const estimate = {
    id: 'QT-2026-00142',
    jobName: 'Chips duplex laminate',
    customer: 'Acme Snacks Ltd',
    status: 'draft',
    totalGsm: 78.4,
    totalMicron: 67,
    salePricePerKg: 12.48,
    displayCurrency: 'AED'
  };

  const layers = [
    { id: 1, type: 'substrate', material: 'PET Transparent', micron: 12, gsm: 16.56, costPerKg: 8.70 },
    { id: 2, type: 'ink', material: 'Ink SB', micron: 2, gsm: 0.6, costPerKg: 12.00 },
    { id: 3, type: 'adhesive', material: 'Adhesive SB', micron: 3, gsm: 3.0, costPerKg: 6.50 },
    { id: 4, type: 'substrate', material: 'LDPE Natural', micron: 50, gsm: 46.0, costPerKg: 2.10 },
  ];

  const slabs = [
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
            <button className="btn-secondary inline-flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button className="btn-primary inline-flex items-center space-x-2">
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

                {/* Layers table */}
                <div className="overflow-x-auto">
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
                              defaultValue={layer.micron}
                              className="input w-20 font-mono text-sm"
                            />
                          </td>
                          <td className="py-4 px-4 font-mono text-sm">{layer.gsm.toFixed(1)}</td>
                          <td className="py-4 px-4 font-mono text-sm">{layer.costPerKg.toFixed(2)}</td>
                          <td className="py-4 px-4">
                            <button className="text-sm text-mist hover:text-danger">
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
                  <button className="btn-secondary">+ Add Layer</button>
                  <button className="btn-secondary">Add Metallized Barrier</button>
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
                    {slabs.map((slab, index) => (
                      <tr key={index} className="border-b border-border last:border-0 hover:bg-slate/50">
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            defaultValue={slab.quantityKg}
                            className="input w-32 font-mono"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            defaultValue={slab.pricePerKg}
                            step="0.01"
                            className="input w-32 font-mono"
                          />
                        </td>
                        <td className="py-4 px-4 font-display font-semibold">
                          {estimate.displayCurrency} {slab.total.toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <button className="text-sm text-mist hover:text-danger">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button className="btn-secondary">+ Add Slab Row</button>
            </div>
          )}

          {activeSection === 'markup' && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Markup & Additional Costs</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Markup %</label>
                  <input type="number" defaultValue="15" className="input w-full" />
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
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className="flex items-center justify-between py-2 px-3 rounded"
                    style={{
                      backgroundColor: layer.type === 'substrate' ? '#1D5FA3' :
                                       layer.type === 'ink' ? '#9B4CA0' : '#2E8B6E',
                      opacity: layer.type === 'ink' ? 0.7 : 1,
                      height: `${Math.max(20, layer.micron)}px`
                    }}
                  >
                    <span className="text-white text-sm font-medium">{layer.material}</span>
                    <span className="text-white text-sm font-mono">{layer.micron}µ</span>
                  </div>
                ))}
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
                {estimate.displayCurrency} {estimate.salePricePerKg.toFixed(2)} /kg
              </div>
              <div className="text-sm text-mist">
                Base cost: {estimate.displayCurrency} 9.80/kg + markup + extras
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Cost Breakdown</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Material</span>
                  <span className="text-sm font-semibold">78%</span>
                </div>
                <div className="w-full bg-slate rounded-full h-2">
                  <div className="bg-blue-500 rounded-full h-2" style={{ width: '78%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Waste</span>
                  <span className="text-sm font-semibold">4%</span>
                </div>
                <div className="w-full bg-slate rounded-full h-2">
                  <div className="bg-yellow-500 rounded-full h-2" style={{ width: '4%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Markup</span>
                  <span className="text-sm font-semibold">15%</span>
                </div>
                <div className="w-full bg-slate rounded-full h-2">
                  <div className="bg-gold rounded-full h-2" style={{ width: '15%' }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Process</span>
                  <span className="text-sm font-semibold">3%</span>
                </div>
                <div className="w-full bg-slate rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2" style={{ width: '3%' }}></div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button className="btn-primary w-full">Save Estimate</button>
              <button className="btn-secondary w-full">Generate Proposal PDF</button>
              <button className="text-sm text-mist hover:text-ink w-full text-center py-2">
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