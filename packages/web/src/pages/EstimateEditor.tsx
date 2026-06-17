import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Save, Download, ArrowLeft, Layers, Calculator, Ruler, DollarSign, Loader2 } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import LaminateVisualizer from '../components/LaminateVisualizer';
import { apiClient } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

interface MaterialItem {
  id: string; name: string; type: string; solidPercent: number;
  density: string; costPerKgUsd: string; wastePercent: number; isSolventBased: boolean;
}

interface LayerItem {
  id: string; materialId: string; materialName: string; materialType: string;
  micron: number; gsm: number; costPerKgUsd: number; isSolventBased: boolean; position: number;
}

interface DimensionState {
  reelWidthMm: number; cutoffMm: number; numberOfUps: number;
  extraPrintingTrimMm: number; piecesPerCut: number; openWidthMm: number; openHeightMm: number;
}

const EstimateEditor = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Core state
  const [estimate, setEstimate] = useState<any>(null);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [slabsState, setSlabsState] = useState<any[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // UI state
  const [activeSection, setActiveSection] = useState<'structure' | 'dimensions' | 'slabs' | 'markup'>('structure');
  const [printingWebClass, setPrintingWebClass] = useState<'wide_web' | 'narrow_web'>('wide_web');
  const [productType, setProductType] = useState<'roll' | 'sleeve' | 'pouch'>('roll');
  const [jobName, setJobName] = useState('New estimate');
  const [customerId, setCustomerId] = useState<string>('');
  const [markupPercent, setMarkupPercent] = useState(15);
  const [platesPerKg, setPlatesPerKg] = useState(0);
  const [deliveryPerKg, setDeliveryPerKg] = useState(0);
  const [solventCostPerKgUsd, setSolventCostPerKgUsd] = useState(2.0);
  const [solventRatio, setSolventRatio] = useState(0.5);
  const [dimensions, setDimensions] = useState<DimensionState>({
    reelWidthMm: 800, cutoffMm: 600, numberOfUps: 1,
    extraPrintingTrimMm: 0, piecesPerCut: 1, openWidthMm: 200, openHeightMm: 250,
  });

  const isAdmin = user?.role === 'tenant_admin' || user?.role === 'platform_admin';

  // Load materials + customers on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [mats, custs] = await Promise.all([apiClient.getMaterials(), apiClient.getCustomers()]);
        setMaterials(mats || []);
        setCustomers(custs || []);

        if (id) {
          await fetchEstimate(id);
        } else {
          const templateId = searchParams.get('template') ? Number(searchParams.get('template')) : null;
          const paramCustomer = searchParams.get('customer') || '';
          const paramJobName = searchParams.get('jobName') || 'New estimate';
          const paramProductType = (searchParams.get('productType') || 'roll') as 'roll' | 'sleeve' | 'pouch';
          const defaultLayers = getTemplateLayers(templateId, mats || []);
          setJobName(paramJobName);
          setCustomerId(paramCustomer);
          setProductType(paramProductType);
          setLayers(defaultLayers);
          setSlabsState([
            { quantityKg: 1000, pricePerKg: 0, total: 0 },
            { quantityKg: 2000, pricePerKg: 0, total: 0 },
            { quantityKg: 5000, pricePerKg: 0, total: 0 },
          ]);
          setEstimate({ id: undefined, status: 'draft', displayCurrency: 'AED', salePricePerKg: 0, materialCostPerKg: 0, totalGsm: 0, totalMicron: 0 });
          setPrintingWebClass('wide_web');
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load base data:', err);
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // Map template ID → layers using real material IDs
  function getTemplateLayers(templateId: number | null, mats: MaterialItem[]): LayerItem[] {
    const findMat = (name: string) => mats.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
    const defaultSubstrate = findMat('pe plain') || findMat('pe') || mats.find(m => m.type === 'substrate');
    const defaultInk = findMat('ink sb') || findMat('ink') || mats.find(m => m.type === 'ink');
    const defaultAdhesive = findMat('adhesive sb') || findMat('adhesive') || mats.find(m => m.type === 'adhesive');
    const toLayer = (mat: MaterialItem | undefined, micron: number, position: number, gsmHint?: number): LayerItem => ({
      id: crypto.randomUUID(), materialId: mat?.id || '', materialName: mat?.name || 'Select material',
      materialType: mat?.type || 'substrate', micron, gsm: gsmHint || micron * (mat?.density ? parseFloat(mat.density) : 0.9),
      costPerKgUsd: mat?.costPerKgUsd ? parseFloat(mat.costPerKgUsd) : 0, isSolventBased: mat?.isSolventBased || false, position,
    });
    if (templateId === 11) {
      const pet = findMat('pet') || defaultSubstrate;
      const pe = findMat('pe ') || defaultSubstrate;
      return [toLayer(pet, 12, 0, 18), toLayer(defaultAdhesive, 3, 1, 3), toLayer(pe, 40, 2, 36)];
    }
    return [toLayer(defaultSubstrate, 30, 0, 27), toLayer(defaultInk, 5, 1, 4.5)];
  }

  const fetchEstimate = async (estimateId: string) => {
    try {
      setLoading(true);
      const data = await apiClient.getEstimate(estimateId);
      const mappedLayers: LayerItem[] = (data.layers || []).map((l: any) => ({
        id: l.id, materialId: l.materialId, materialName: l.materialName || 'Unknown',
        materialType: l.materialType || 'substrate', micron: parseFloat(l.micron) || 0,
        gsm: parseFloat(l.gsm) || 0, costPerKgUsd: parseFloat(l.materialCostPerKgUsd) || 0,
        isSolventBased: l.materialIsSolventBased || false, position: l.position || 0,
      }));
      setEstimate(data);
      setLayers(mappedLayers);
      setSlabsState((data.slabs || []).map((s: any) => ({
        ...s, quantityKg: parseFloat(s.quantityKg) || 0, pricePerKg: parseFloat(s.pricePerKg) || 0,
        total: (parseFloat(s.quantityKg) || 0) * (parseFloat(s.pricePerKg) || 0),
      })));
      setPrintingWebClass(data.printingWebClass || 'wide_web');
      setProductType(data.productType || 'roll');
      setJobName(data.jobName || '');
      setCustomerId(data.customerId || '');
      setMarkupPercent(parseFloat(data.markupPercent) || 15);
      setPlatesPerKg(parseFloat(data.platesPerKg) || 0);
      setDeliveryPerKg(parseFloat(data.deliveryPerKg) || 0);
      if (data.solventCostPerKgUsd) setSolventCostPerKgUsd(parseFloat(data.solventCostPerKgUsd));
      if (data.solventRatio) setSolventRatio(parseFloat(data.solventRatio));
      if (data.dimensions) setDimensions({
        reelWidthMm: data.dimensions.reelWidthMm || 800, cutoffMm: data.dimensions.cutoffMm || 600,
        numberOfUps: data.dimensions.numberOfUps || 1, extraPrintingTrimMm: data.dimensions.extraPrintingTrimMm || 0,
        piecesPerCut: data.dimensions.piecesPerCut || 1, openWidthMm: data.dimensions.openWidthMm || 200,
        openHeightMm: data.dimensions.openHeightMm || 250,
      });
    } catch (error) {
      console.error('Failed to load estimate:', error);
      setEstimate(null);
    } finally { setLoading(false); }
  };

  const buildSavePayload = useCallback(() => ({
    jobName, customerId: customerId || undefined, productType, printingWebClass, dimensions,
    markupPercent, platesPerKg, deliveryPerKg,
    solventCostPerKgUsd: printingWebClass === 'wide_web' ? solventCostPerKgUsd : undefined,
    solventRatio: printingWebClass === 'wide_web' ? solventRatio : undefined,
    layers: layers.map((l, i) => ({ materialId: l.materialId, micron: l.micron, position: i })),
    slabs: slabsState.map(s => ({ quantityKg: s.quantityKg, pricePerKg: s.pricePerKg })),
    processes: [],
  }), [jobName, customerId, productType, printingWebClass, dimensions, markupPercent, platesPerKg, deliveryPerKg, solventCostPerKgUsd, solventRatio, layers, slabsState]);

  const handleSaveEstimate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = buildSavePayload();
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        localStorage.setItem(`offlineDraft:${estimate?.id || 'new'}`, JSON.stringify(payload));
        alert('Offline — draft saved locally');
        setSaving(false);
        return;
      }
      let saved;
      if (estimate?.id) {
        saved = await apiClient.updateEstimate(estimate.id, payload);
      } else {
        saved = await apiClient.createEstimate(payload);
        navigate(`/estimate/${saved.id}`, { replace: true });
      }
      setEstimate((prev: any) => ({ ...prev, ...saved }));
      if (saved.id) {
        setCalculating(true);
        try {
          const result = await apiClient.calculateEstimate(saved.id);
          setEstimate((prev: any) => ({ ...prev, ...result.estimate,
            salePricePerKg: result.estimate.salePricePerKg,
            materialCostPerKg: result.estimate.materialCostPerKg,
            totalGsm: result.estimate.totalGsm, totalMicron: result.estimate.totalMicron,
          }));
        } catch (calcErr) { console.error('Calculate failed:', calcErr); }
        finally { setCalculating(false); }
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      alert(`Save failed: ${err.message || 'Unknown error'}`);
    } finally { setSaving(false); }
  };

  const handleRequote = async () => {
    if (!estimate?.id) return;
    try { const res = await apiClient.requoteEstimate(estimate.id); if (res?.id) navigate(`/estimate/${res.id}`); }
    catch (err) { alert('Failed to create re-quote'); }
  };

  const downloadProposalPdf = async () => {
    try {
      const blob = await apiClient.getProposalPdf(id as string);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `proposal-${id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (error) { console.error('Failed to download proposal PDF', error); }
  };

  const changeStatus = async (newStatus: 'sent' | 'won' | 'lost') => {
    if (!estimate?.id) { alert('Save the estimate before changing status'); return; }
    try { await apiClient.updateEstimate(estimate.id, { status: newStatus }); await fetchEstimate(estimate.id); alert(`Status changed to ${newStatus}`); }
    catch (err) { alert('Failed to change status'); }
  };

  if (loading) return <div className="p-8">Loading estimate...</div>;
  if (!estimate) return <div className="p-8">Estimate not found</div>;

  const displaySlabs = slabsState.length > 0 ? slabsState : [{ quantityKg: 1000, pricePerKg: 0, total: 0 }, { quantityKg: 2000, pricePerKg: 0, total: 0 }, { quantityKg: 5000, pricePerKg: 0, total: 0 }];
  const totalMicron = layers.reduce((s, l) => s + l.micron, 0);
  const totalGsm = layers.reduce((s, l) => s + l.gsm, 0);
  const density = totalMicron > 0 ? (totalGsm / totalMicron).toFixed(2) : '0';
  const printWebWidth = (dimensions.reelWidthMm * dimensions.numberOfUps) + dimensions.extraPrintingTrimMm;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-mist hover:text-ink"><ArrowLeft className="w-5 h-5" /></Link>
            <div>
              <input type="text" value={jobName} onChange={(e) => setJobName(e.target.value)}
                className="text-2xl lg:text-3xl font-display font-bold text-navy bg-transparent border-b border-transparent hover:border-border focus:border-gold focus:outline-none w-full" placeholder="Estimate name" />
              {estimate?.sourceEstimationId && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  📋 Re-quote from <Link to={`/estimate/${estimate.sourceEstimationId}`} className="font-medium underline">{estimate.sourceEstimationId}</Link>
                </div>
              )}
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-mist">{customers.find(c => c.id === customerId)?.companyName || 'No customer'}</span>
                <span className="badge badge-draft">{estimate?.status || 'draft'}</span>
                {estimate?.refNumber && <span className="text-sm font-mono text-mist">{estimate.refNumber}</span>}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button onClick={handleSaveEstimate} disabled={saving} className="btn-secondary inline-flex items-center space-x-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
            <button onClick={handleSaveEstimate} disabled={saving || calculating} className="btn-primary inline-flex items-center space-x-2">
              {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              <span>{calculating ? 'Calculating...' : 'Save & Calculate'}</span>
            </button>
            <button onClick={downloadProposalPdf} className="btn-secondary inline-flex items-center space-x-2">
              <Download className="w-4 h-4" /><span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="lg:flex lg:space-x-8">
        {/* Left panel */}
        <div className="lg:flex-1 lg:max-w-3xl">
          {/* Navigation tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            <button onClick={() => setActiveSection('structure')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'structure' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}>
              <Layers className="w-4 h-4" /><span>Structure</span>
            </button>
            <button onClick={() => setActiveSection('dimensions')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'dimensions' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}>
              <Ruler className="w-4 h-4" /><span>Dimensions</span>
            </button>
            {isAdmin && <button onClick={() => setActiveSection('slabs')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'slabs' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}>
              <Calculator className="w-4 h-4" /><span>Quantity Slabs</span>
            </button>}
            {isAdmin && <button onClick={() => setActiveSection('markup')} className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap ${activeSection === 'markup' ? 'bg-gold/10 text-gold' : 'hover:bg-slate text-ink'}`}>
              <DollarSign className="w-4 h-4" /><span>Markup & Extras</span>
            </button>}
          </div>

          {/* Structure section */}
          {activeSection === 'structure' && (
            <div className="card space-y-6">
              <div>
                <h3 className="text-lg font-display font-semibold text-navy mb-4">Layer Stack</h3>
                <div className="mb-6 p-4 bg-slate rounded-lg">
                  <label className="block text-sm font-medium text-navy mb-2">Printing Web Class</label>
                  <div className="flex space-x-4">
                    <button onClick={() => setPrintingWebClass('wide_web')} className={`px-4 py-2 rounded-lg ${printingWebClass === 'wide_web' ? 'bg-gold text-white' : 'bg-white border border-border'}`}>Wide Web (Ink SB)</button>
                    <button onClick={() => setPrintingWebClass('narrow_web')} className={`px-4 py-2 rounded-lg ${printingWebClass === 'narrow_web' ? 'bg-gold text-white' : 'bg-white border border-border'}`}>Narrow Web (Ink UV)</button>
                  </div>
                  <p className="text-sm text-mist mt-2">{printingWebClass === 'wide_web' ? 'Ink SB (30% solid) with solvent mix' : 'Ink UV (100% solid) without solvent for ink'}</p>
                </div>

                {/* Mobile cards */}
                <div className="space-y-4 md:hidden">
                  {layers.map((layer) => (
                    <LayerCard key={layer.id} layer={{ ...layer, type: layer.materialType, material: layer.materialName, costPerKg: layer.costPerKgUsd }}
                      onMicronChange={(value) => setLayers((prev) => prev.map((l) => l.id === layer.id ? { ...l, micron: value, gsm: value * (materials.find(m => m.id === l.materialId)?.density ? parseFloat(materials.find(m => m.id === l.materialId)!.density) : 0.9) } : l))}
                      onRemove={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))} />
                  ))}
                </div>

                {/* Desktop table */}
                <div className="overflow-x-auto hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">#</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">Material</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">µ</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist">GSM</th>
                        {isAdmin && <th className="text-left py-3 px-4 text-sm font-medium text-mist">$/kg</th>}
                        <th className="text-left py-3 px-4 text-sm font-medium text-mist"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {layers.map((layer, idx) => (
                        <tr key={layer.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                          <td className="py-4 px-4 text-sm text-mist">{idx + 1}</td>
                          <td className="py-4 px-4">
                            <span className={`text-xs px-2 py-1 rounded-md ${layer.materialType === 'substrate' ? 'bg-blue-100 text-blue-800' : layer.materialType === 'ink' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>{layer.materialType}</span>
                          </td>
                          <td className="py-4 px-4">
                            <select value={layer.materialId} onChange={(e) => {
                              const mat = materials.find(m => m.id === e.target.value);
                              if (!mat) return;
                              setLayers((prev) => prev.map((l) => l.id === layer.id ? {
                                ...l, materialId: mat.id, materialName: mat.name, materialType: mat.type,
                                costPerKgUsd: parseFloat(mat.costPerKgUsd) || 0, isSolventBased: mat.isSolventBased || false,
                                gsm: l.micron * (parseFloat(mat.density) || 0.9),
                              } : l));
                            }} className="input w-full font-medium text-sm">
                              <option value="">Select material</option>
                              {materials.filter(m => m.type === layer.materialType).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              <option value="" disabled>── All ──</option>
                              {materials.filter(m => m.type !== layer.materialType).map(m => <option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}
                            </select>
                          </td>
                          <td className="py-4 px-4">
                            <input type="number" value={layer.micron} onChange={(e) => {
                              const micron = Number(e.target.value);
                              setLayers((prev) => prev.map((l) => l.id === layer.id ? {
                                ...l, micron,
                                gsm: micron * (materials.find(m => m.id === l.materialId)?.density ? parseFloat(materials.find(m => m.id === l.materialId)!.density) : 0.9),
                              } : l));
                            }} className="input w-20 font-mono text-sm" />
                          </td>
                          <td className="py-4 px-4 font-mono text-sm">{layer.gsm.toFixed(1)}</td>
                          {isAdmin && <td className="py-4 px-4 font-mono text-sm">{layer.costPerKgUsd.toFixed(2)}</td>}
                          <td className="py-4 px-4">
                            <button onClick={() => setLayers((prev) => prev.filter((l) => l.id !== layer.id))} className="text-sm text-mist hover:text-danger">Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add layer buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <select className="input w-48" onChange={(e) => {
                    const type = e.target.value as 'substrate' | 'ink' | 'adhesive';
                    if (!type) return;
                    const defaultMat = materials.find(m => m.type === type);
                    const micron = type === 'substrate' ? 25 : type === 'ink' ? 5 : 3;
                    const newLayer: LayerItem = { id: crypto.randomUUID(), materialId: defaultMat?.id || '', materialName: defaultMat?.name || 'Select material', materialType: type, micron, gsm: micron * (defaultMat?.density ? parseFloat(defaultMat.density) : 0.9), costPerKgUsd: defaultMat ? parseFloat(defaultMat.costPerKgUsd) : 0, isSolventBased: defaultMat?.isSolventBased || false, position: layers.length };
                    setLayers((prev) => [...prev, newLayer]);
                    e.target.value = '';
                  }} defaultValue="">
                    <option value="" disabled>+ Add Layer...</option>
                    <option value="substrate">Substrate</option>
                    <option value="ink">Ink</option>
                    <option value="adhesive">Adhesive</option>
                  </select>
                  <button onClick={() => {
                    const adhesive = materials.find(m => m.name.toLowerCase().includes('adhesive sb')) || materials.find(m => m.type === 'adhesive');
                    const alu = materials.find(m => m.name.toLowerCase().includes('aluminium') || m.name.toLowerCase().includes('aluminum'));
                    setLayers((prev) => [...prev,
                      { id: crypto.randomUUID(), materialId: adhesive?.id || '', materialName: adhesive?.name || 'Adhesive SB', materialType: 'adhesive', micron: 3, gsm: 3, costPerKgUsd: adhesive ? parseFloat(adhesive.costPerKgUsd) : 0, isSolventBased: true, position: prev.length },
                      { id: crypto.randomUUID(), materialId: alu?.id || '', materialName: alu?.name || 'Aluminium', materialType: 'substrate', micron: 7, gsm: 19, costPerKgUsd: alu ? parseFloat(alu.costPerKgUsd) : 0, isSolventBased: false, position: prev.length + 1 },
                      { id: crypto.randomUUID(), materialId: adhesive?.id || '', materialName: adhesive?.name || 'Adhesive SB', materialType: 'adhesive', micron: 3, gsm: 3, costPerKgUsd: adhesive ? parseFloat(adhesive.costPerKgUsd) : 0, isSolventBased: true, position: prev.length + 2 },
                    ]);
                  }} className="btn-secondary">+ Metallized Barrier</button>
                </div>

                {/* Solvent mix (admin only, wide web) */}
                {isAdmin && printingWebClass === 'wide_web' && (
                  <div className="mt-6 p-4 border border-border rounded-lg">
                    <h4 className="font-display font-semibold text-navy mb-3">Solvent Mix</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-navy mb-2">Solvent-mix $/kg</label><input type="number" value={solventCostPerKgUsd} onChange={(e) => setSolventCostPerKgUsd(Number(e.target.value))} step="0.1" className="input w-full" /></div>
                      <div><label className="block text-sm font-medium text-navy mb-2">Ink-to-solvent ratio</label><input type="number" value={solventRatio} onChange={(e) => setSolventRatio(Number(e.target.value))} step="0.1" className="input w-full" /></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dimensions */}
          {activeSection === 'dimensions' && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Dimensions</h3>
              <div className="p-4 bg-slate rounded-lg">
                <label className="block text-sm font-medium text-navy mb-2">Product Type</label>
                <div className="flex space-x-4">
                  {(['roll', 'sleeve', 'pouch'] as const).map(pt => (
                    <button key={pt} onClick={() => setProductType(pt)} className={`px-4 py-2 rounded-lg capitalize ${productType === pt ? 'bg-gold text-white' : 'bg-white border border-border'}`}>{pt}</button>
                  ))}
                </div>
              </div>
              {productType === 'roll' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-navy mb-2">Reel width (mm)</label><input type="number" value={dimensions.reelWidthMm} onChange={(e) => setDimensions(prev => ({ ...prev, reelWidthMm: Number(e.target.value) }))} className="input w-full" /></div>
                    <div><label className="block text-sm font-medium text-navy mb-2">Cut-off (mm)</label><input type="number" value={dimensions.cutoffMm} onChange={(e) => setDimensions(prev => ({ ...prev, cutoffMm: Number(e.target.value) }))} className="input w-full" /></div>
                  </div>
                  <details className="p-4 bg-slate rounded-lg">
                    <summary className="font-medium cursor-pointer">Multi-up & trim</summary>
                    <div className="mt-4 space-y-4">
                      <div><label className="block text-sm font-medium text-navy mb-2">Number of ups</label><input type="number" value={dimensions.numberOfUps} onChange={(e) => setDimensions(prev => ({ ...prev, numberOfUps: Number(e.target.value) }))} className="input w-32" /></div>
                      <div><label className="block text-sm font-medium text-navy mb-2">Extra printing trim (mm)</label><input type="number" value={dimensions.extraPrintingTrimMm} onChange={(e) => setDimensions(prev => ({ ...prev, extraPrintingTrimMm: Number(e.target.value) }))} className="input w-32" /></div>
                      <div><label className="block text-sm font-medium text-navy mb-2">Pieces per cut</label><input type="number" value={dimensions.piecesPerCut} onChange={(e) => setDimensions(prev => ({ ...prev, piecesPerCut: Number(e.target.value) }))} className="input w-32" /></div>
                    </div>
                  </details>
                </div>
              )}
              {productType === 'sleeve' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-navy mb-2">Sleeve width (mm)</label><input type="number" value={dimensions.reelWidthMm} onChange={(e) => setDimensions(prev => ({ ...prev, reelWidthMm: Number(e.target.value) }))} className="input w-full" /></div>
                  <div><label className="block text-sm font-medium text-navy mb-2">Height (mm)</label><input type="number" value={dimensions.cutoffMm} onChange={(e) => setDimensions(prev => ({ ...prev, cutoffMm: Number(e.target.value) }))} className="input w-full" /></div>
                </div>
              )}
              {productType === 'pouch' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-navy mb-2">Open width (mm)</label><input type="number" value={dimensions.openWidthMm} onChange={(e) => setDimensions(prev => ({ ...prev, openWidthMm: Number(e.target.value) }))} className="input w-full" /></div>
                  <div><label className="block text-sm font-medium text-navy mb-2">Open height (mm)</label><input type="number" value={dimensions.openHeightMm} onChange={(e) => setDimensions(prev => ({ ...prev, openHeightMm: Number(e.target.value) }))} className="input w-full" /></div>
                </div>
              )}
              <div className="pt-4 border-t border-border">
                <h4 className="font-display font-semibold text-navy mb-4">Calculated Values</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-sm text-mist">Printing web width</p><p className="font-mono font-semibold text-gold">{printWebWidth} mm</p></div>
                  <div><p className="text-sm text-mist">Total µ</p><p className="font-mono font-semibold">{totalMicron}</p></div>
                  <div><p className="text-sm text-mist">Total GSM</p><p className="font-mono font-semibold">{totalGsm.toFixed(1)}</p></div>
                  <div><p className="text-sm text-mist">Density</p><p className="font-mono font-semibold">{density}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* Slabs (admin only) */}
          {isAdmin && activeSection === 'slabs' && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Quantity Slab Pricing</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Quantity (kg)</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Price/kg ({estimate?.displayCurrency || 'USD'})</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist">Order total</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-mist"></th>
                  </tr></thead>
                  <tbody>
                    {displaySlabs.map((slab: any, index: number) => (
                      <tr key={index} className="border-b border-border last:border-0 hover:bg-slate/50">
                        <td className="py-4 px-4"><input type="number" value={slab.quantityKg} onChange={(e) => { const v = Number(e.target.value); setSlabsState((prev) => prev.map((s, i) => i === index ? { ...s, quantityKg: v, total: v * s.pricePerKg } : s)); }} className="input w-32 font-mono" /></td>
                        <td className="py-4 px-4"><input type="number" value={slab.pricePerKg} step="0.01" onChange={(e) => { const v = Number(e.target.value); setSlabsState((prev) => prev.map((s, i) => i === index ? { ...s, pricePerKg: v, total: v * s.quantityKg } : s)); }} className="input w-32 font-mono" /></td>
                        <td className="py-4 px-4 font-display font-semibold">{estimate?.displayCurrency || 'USD'} {Number((slab.quantityKg || 0) * (slab.pricePerKg || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4"><button onClick={() => setSlabsState((prev) => prev.filter((_, i) => i !== index))} className="text-sm text-mist hover:text-danger">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={() => setSlabsState((prev) => [...prev, { quantityKg: 1000, pricePerKg: 0, total: 0 }])} className="btn-secondary">+ Add Slab Row</button>
            </div>
          )}

          {/* Markup (admin only) */}
          {isAdmin && activeSection === 'markup' && (
            <div className="card space-y-6">
              <h3 className="text-lg font-display font-semibold text-navy">Markup & Additional Costs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium text-navy mb-2">Markup %</label><input type="number" value={markupPercent} onChange={(e) => setMarkupPercent(Number(e.target.value))} className="input w-full" /></div>
                <div><label className="block text-sm font-medium text-navy mb-2">Plates/kg ({estimate?.displayCurrency || 'USD'})</label><input type="number" value={platesPerKg} onChange={(e) => setPlatesPerKg(Number(e.target.value))} step="0.01" className="input w-full" /></div>
                <div><label className="block text-sm font-medium text-navy mb-2">Delivery/kg ({estimate?.displayCurrency || 'USD'})</label><input type="number" value={deliveryPerKg} onChange={(e) => setDeliveryPerKg(Number(e.target.value))} step="0.01" className="input w-full" /></div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel - sticky sidebar */}
        <div className="lg:w-80 lg:flex-shrink-0 mt-8 lg:mt-0">
          <div className="sticky top-8 space-y-6">
            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Laminate Stack</h3>
              <div className="flex items-center justify-center">
                <LaminateVisualizer layers={layers.map(l => ({ id: l.id, type: l.materialType, material: l.materialName, micron: l.micron, gsm: l.gsm }))} width={220} height={180} />
              </div>
            </div>

            <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Totals</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-mist">Total GSM</span><span className="font-mono font-semibold">{totalGsm.toFixed(1)}</span></div>
                <div className="flex justify-between"><span className="text-mist">Total µ</span><span className="font-mono font-semibold">{totalMicron}</span></div>
                {isAdmin && <div className="flex justify-between"><span className="text-mist">Film density</span><span className="font-mono font-semibold">{density}</span></div>}
              </div>
            </div>

            <div className="card bg-gold/5 border-gold/20">
              <h3 className="font-display font-semibold text-navy mb-2">Selling Price</h3>
              <div className="text-3xl font-display font-bold text-gold mb-2">{estimate?.displayCurrency || 'USD'} {Number(estimate?.salePricePerKg || 0).toFixed(2)} /kg</div>
              {isAdmin && <div className="text-sm text-mist">{calculating ? 'Recalculating...' : estimate?.salePricePerKg ? 'Save & Calculate to update' : 'Save & Calculate to get price'}</div>}
            </div>

            {isAdmin && <div className="card">
              <h3 className="font-display font-semibold text-navy mb-4">Cost Breakdown</h3>
              <div className="space-y-2">{(() => {
                const mat = Number(estimate?.materialCostPerKg) || 0;
                const sale = Number(estimate?.salePricePerKg) || 0;
                const materialPct = sale ? Math.round((mat / sale) * 100) : 0;
                const markupPct = Math.round(markupPercent);
                const processPct = Math.max(0, 100 - materialPct - markupPct);
                return (<>
                  <div className="flex items-center justify-between"><span className="text-sm">Material</span><span className="text-sm font-semibold">{materialPct}%</span></div>
                  <div className="w-full bg-slate rounded-full h-2"><div className="bg-blue-500 rounded-full h-2" style={{ width: `${materialPct}%` }}></div></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Markup</span><span className="text-sm font-semibold">{markupPct}%</span></div>
                  <div className="w-full bg-slate rounded-full h-2"><div className="bg-gold rounded-full h-2" style={{ width: `${markupPct}%` }}></div></div>
                  <div className="flex items-center justify-between"><span className="text-sm">Process</span><span className="text-sm font-semibold">{processPct}%</span></div>
                  <div className="w-full bg-slate rounded-full h-2"><div className="bg-green-500 rounded-full h-2" style={{ width: `${processPct}%` }}></div></div>
                </>);
              })()}</div>
            </div>}

            <div className="space-y-2">
              <button onClick={handleSaveEstimate} className="btn-primary w-full">Save Estimate</button>
              <button onClick={downloadProposalPdf} className="btn-secondary w-full">Generate Proposal PDF</button>
              <button onClick={handleRequote} className="text-sm text-mist hover:text-ink w-full text-center py-2">Duplicate for re-quote</button>
            </div>

            <div className="card">
              <h4 className="font-display font-semibold text-navy mb-3">Status</h4>
              <div className="flex space-x-2">
                <button onClick={() => changeStatus('sent')} className="btn-secondary flex-1">Mark Sent</button>
                <button onClick={() => changeStatus('won')} className="btn-success flex-1">Mark Won</button>
                <button onClick={() => changeStatus('lost')} className="btn-danger flex-1">Mark Lost</button>
              </div>
              <div className="mt-3 text-sm text-mist">Current: <strong>{estimate?.status || 'draft'}</strong></div>
            </div>

            <div className="card">
              <h4 className="font-display font-semibold text-navy mb-3">Activity</h4>
              <div className="space-y-2" style={{ maxHeight: 220, overflow: 'auto' }}>
                {(estimate?.activityLogs || []).length === 0 && <div className="text-sm text-mist">No activity yet.</div>}
                {(estimate?.activityLogs || []).map((a: any) => (
                  <div key={a.id} className="p-2 bg-slate rounded">
                    <div className="text-sm font-medium">{a.action}</div>
                    <div className="text-xs text-mist">{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimateEditor;
