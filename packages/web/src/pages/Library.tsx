import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { apiClient } from '../lib/api';

interface Material {
  id: string;
  name: string;
  type: 'substrate' | 'ink' | 'adhesive';
  solidPercent: number;
  density: number;
  wastePercent: number;
  costPerKgUsd: number;
}

const Library = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'substrate' | 'ink' | 'adhesive'>('all');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openCreateModal = () => {
    setEditingMaterial({ id: '', name: '', type: 'substrate', solidPercent: 30, density: 0.92, wastePercent: 0, costPerKgUsd: 0 });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
  };

  const handleSaveMaterial = async () => {
    if (!editingMaterial) return;
    try {
      if (editingMaterial.id) {
        const updated = await apiClient.updateMaterial(editingMaterial.id, editingMaterial) as Material;
        setMaterials((prev) => prev.map(m => m.id === updated.id ? updated : m));
      } else {
        const created = await apiClient.createMaterial(editingMaterial) as Material;
        setMaterials((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      alert('Failed to save material: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getMaterials();
      setMaterials((data || []).map((m: any) => ({
        ...m,
        type: m.type || m.materialType,
        density: Number(m.density),
        costPerKgUsd: Number(m.costPerKgUsd),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material? This cannot be undone.')) return;
    
    try {
      setDeleting(id);
      await apiClient.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    } catch (err) {
      alert('Failed to delete material: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || material.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'substrate': return 'bg-blue-100 text-blue-800';
      case 'ink': return 'bg-purple-100 text-purple-800';
      case 'adhesive': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-mist">Loading materials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border border-red-200">
        <p className="text-red-800 font-medium">Error loading materials</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">Material Library</h1>
          <p className="text-mist mt-2">Manage your raw material prices and properties</p>
        </div>
        <button onClick={openCreateModal} className="mt-4 lg:mt-0 btn-primary inline-flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Add Material</span>
        </button>
      </div>

      {/* Search and filters */}
      <div className="card mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
          <div className="flex-1 relative mb-4 lg:mb-0">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-mist" />
            <input
              type="text"
              placeholder="Search materials..."
              className="input w-full pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'all' ? 'bg-gold text-white' : 'bg-slate text-ink hover:bg-border'}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('substrate')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'substrate' ? 'bg-blue-100 text-blue-800' : 'bg-slate text-ink hover:bg-border'}`}
            >
              Substrate
            </button>
            <button
              onClick={() => setActiveFilter('ink')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'ink' ? 'bg-purple-100 text-purple-800' : 'bg-slate text-ink hover:bg-border'}`}
            >
              Ink
            </button>
            <button
              onClick={() => setActiveFilter('adhesive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'adhesive' ? 'bg-green-100 text-green-800' : 'bg-slate text-ink hover:bg-border'}`}
            >
              Adhesive
            </button>
          </div>
        </div>
      </div>

      {/* Materials — mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((material) => (
            <div key={material.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{material.name}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-md mt-1 inline-block ${getTypeColor(material.type)}`}>
                    {material.type}
                  </span>
                </div>
                <div className="font-mono font-semibold text-gold">${material.costPerKgUsd.toFixed(2)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-mist">
                <div>Solid {material.solidPercent}%</div>
                <div>ρ {material.density.toFixed(2)}</div>
                <div>Waste {material.wastePercent}%</div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => { setEditingMaterial(material); setShowModal(true); }}
                  className="flex-1 min-h-[44px] rounded-lg bg-slate text-sm font-medium text-navy"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(material.id)}
                  disabled={deleting === material.id}
                  className="min-h-[44px] px-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12">
            <Search className="w-12 h-12 text-mist mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold text-navy mb-2">No materials found</h3>
            <button onClick={openCreateModal} className="btn-primary inline-flex items-center space-x-2 mt-4">
              <Plus className="w-5 h-5" />
              <span>Add Material</span>
            </button>
          </div>
        )}
      </div>

      {/* Materials table — desktop */}
      <div className="card hidden md:block">
        {filteredMaterials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Material</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Solid %</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Density</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Waste %</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Cost/kg (USD)</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-mist">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((material) => (
                  <tr key={material.id} className="border-b border-border last:border-0 hover:bg-slate/50">
                    <td className="py-4 px-4">
                      <div className="font-medium">{material.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs px-2 py-1 rounded-md ${getTypeColor(material.type)}`}>
                        {material.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-sm">{material.solidPercent}</td>
                    <td className="py-4 px-4 font-mono text-sm">{material.density.toFixed(2)}</td>
                    <td className="py-4 px-4 font-mono text-sm">{material.wastePercent}</td>
                    <td className="py-4 px-4">
                      <div className="font-mono font-semibold">${material.costPerKgUsd.toFixed(2)}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button onClick={() => { setEditingMaterial(material); setShowModal(true); }} className="text-sm text-gold font-medium hover:underline">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          disabled={deleting === material.id}
                          className="text-sm text-red-600 font-medium hover:underline disabled:opacity-50"
                        >
                          {deleting === material.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 hidden md:block">
            <Search className="w-12 h-12 text-mist mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold text-navy mb-2">No materials found</h3>
            <p className="text-mist mb-6">
              {searchTerm ? 'Try a different search term' : 'Add your first material to get started'}
            </p>
            <button onClick={openCreateModal} className="btn-primary inline-flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add Material</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && editingMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto safe-area-pb">
            <h3 className="font-display font-semibold text-navy mb-4">{editingMaterial.id ? 'Edit Material' : 'Add Material'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-navy mb-1">Name</label>
                <input value={editingMaterial.name} onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })} className="input w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-navy mb-1">Type</label>
                  <select value={editingMaterial.type} onChange={(e) => setEditingMaterial({ ...editingMaterial, type: e.target.value as any })} className="input w-full">
                    <option value="substrate">substrate</option>
                    <option value="ink">ink</option>
                    <option value="adhesive">adhesive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-navy mb-1">Cost/kg (USD)</label>
                  <input type="number" value={editingMaterial.costPerKgUsd} onChange={(e) => setEditingMaterial({ ...editingMaterial, costPerKgUsd: Number(e.target.value) })} className="input w-full" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button onClick={closeModal} className="btn-secondary">Cancel</button>
                <button onClick={handleSaveMaterial} className="btn-primary">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Library info */}
      <div className="mt-6 text-sm text-mist">
        <p>
          <strong>Note:</strong> Material costs are stored in USD. Display prices are converted using your tenant's exchange rate.
          Changes here affect all new estimates and re-quotes.
        </p>
      </div>
    </div>
  );
};

export default Library;