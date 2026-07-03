import { useRef, useState, useCallback } from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

export interface LayerCardLayer {
  id: string;
  type: string;
  material: string;
  micron: number;
  gsm?: number;
  costPerKg?: number;
}

interface LayerCardProps {
  layer: LayerCardLayer;
  index: number;
  showCost?: boolean;
  displayCurrency?: string;
  onEdit?: () => void;
  onFormula?: () => void;
  showFormula?: boolean;
  formulaOverridden?: boolean;
  onRemove?: () => void;
  onDragStart?: (index: number) => void;
  onDragEnter?: (index: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

const SWIPE_THRESHOLD = 72;

const LayerCard = ({
  layer,
  index,
  showCost = false,
  displayCurrency = 'USD',
  onEdit,
  onFormula,
  showFormula = false,
  formulaOverridden = false,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging,
}: LayerCardProps) => {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'x' | 'y' | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!locked.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        locked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
    }
    if (locked.current === 'x') {
      setOffsetX(Math.min(0, Math.max(-96, dx)));
    }
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    locked.current = null;
    if (offsetX < -SWIPE_THRESHOLD) {
      setOffsetX(-96);
    } else {
      setOffsetX(0);
    }
  }, [offsetX]);

  const confirmRemove = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onRemove?.();
    setConfirmingDelete(false);
    setOffsetX(0);
  };

  const typeColor =
    layer.type === 'substrate' ? 'bg-info' : layer.type === 'ink' ? 'bg-accent' : 'bg-success';

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex items-stretch w-24">
        <button
          type="button"
          onClick={confirmRemove}
          className="flex-1 bg-danger text-text-on-accent flex items-center justify-center min-h-[48px] text-xs font-medium"
          aria-label="Delete layer"
        >
          {confirmingDelete ? 'Confirm' : <Trash2 className="w-5 h-5" />}
        </button>
      </div>

      <div
        className={`relative bg-surface-raised border border-border rounded-xl transition-transform touch-pan-y ${
          isDragging ? 'opacity-60 scale-[0.98] shadow-lg z-10' : ''
        }`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDragEnter={() => onDragEnter?.(index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDragEnd?.();
        }}
      >
        <div className="flex items-center gap-2 p-3 min-h-[64px]">
          <button
            type="button"
            draggable
            onDragStart={() => onDragStart?.(index)}
            onDragEnd={() => onDragEnd?.()}
            className="shrink-0 w-11 h-11 flex items-center justify-center text-text-secondary cursor-grab active:cursor-grabbing touch-none"
            aria-label="Reorder layer"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-text-on-accent shrink-0 ${typeColor}`}>
            {layer.type?.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{layer.material}</div>
            <div className="text-xs text-text-secondary mt-0.5">
              {layer.micron} µ · {(layer.gsm ?? 0).toFixed(1)} GSM
              {showCost && layer.costPerKg != null ? ` · ${displayCurrency} ${layer.costPerKg.toFixed(2)}/kg` : ''}
            </div>
          </div>

          {showFormula && onFormula && (
            <button
              type="button"
              onClick={onFormula}
              className="shrink-0 px-2 h-11 flex items-center justify-center rounded-lg bg-warning/10 text-warning text-xs font-medium"
              aria-label="Edit lamination formula"
            >
              {formulaOverridden ? 'Formula*' : 'Formula'}
            </button>
          )}

          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-surface-base text-brand"
            aria-label="Edit layer"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayerCard;
