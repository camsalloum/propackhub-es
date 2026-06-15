import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Trash2 } from 'lucide-react';
import { apiClient } from '../lib/api';

interface Material {
  id: string;
  name: string;
  materialType: 'substrate' | 'ink' | 'adhesive';
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

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getMaterials();
      setMaterials(data || []);
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
    const matchesFilter = activeFilter === 'all' || material.materialType === activeFilter;
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
        <button className="mt-4 lg:mt-0 btn-primary inline-flex items-center space-x-2">
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

      {/* Materials table */}
      <div className="card">
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
                      <span className={`text-xs px-2 py-1 rounded-md ${getTypeColor(material.materialType)}`}>
                        {material.materialType}
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
                        <button className="text-sm text-gold font-medium hover:underline">
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
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-mist mx-auto mb-4" />
            <h3 className="text-xl font-display font-semibold text-navy mb-2">No materials found</h3>
            <p className="text-mist mb-6">
              {searchTerm ? 'Try a different search term' : 'Add your first material to get started'}
            </p>
            <button className="btn-primary inline-flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add Material</span>
            </button>
          </div>
        )}
      </div>

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