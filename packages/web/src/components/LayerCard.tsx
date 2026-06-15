import React from 'react';

interface LayerCardProps {
  layer: any;
  onMicronChange?: (value: number) => void;
  onRemove?: () => void;
}

const LayerCard: React.FC<LayerCardProps> = ({ layer, onMicronChange, onRemove }) => {
  return (
    <div className="bg-white border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center text-white ${
              layer.type === 'substrate' ? 'bg-blue-600' : layer.type === 'ink' ? 'bg-purple-600' : 'bg-green-600'
            }`}>{layer.type?.charAt(0).toUpperCase()}</div>
            <div>
              <div className="font-medium">{layer.material}</div>
              <div className="text-sm text-mist">ID: {layer.id}</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-mist">{layer.gsm?.toFixed?.(1) || layer.gsm} GSM</div>
          <div className="text-sm font-mono">{layer.costPerKg?.toFixed?.(2) || ''} $/kg</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-mist">Micron</label>
          <input
            type="number"
            value={layer.micron}
            onChange={(e) => onMicronChange?.(Number(e.target.value))}
            className="input w-full font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-mist">Type</label>
          <div className="text-sm">{layer.type}</div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button onClick={() => onRemove?.()} className="text-sm text-mist hover:text-danger">Remove</button>
      </div>
    </div>
  );
};

export default LayerCard;
