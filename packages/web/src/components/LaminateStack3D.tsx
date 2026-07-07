// LaminateStack3D — exploded isometric substrate stack for template cards.
//
// Shows substrate films only (no ink/adhesive). Flat color per material family.

import { useMemo, useRef, type CSSProperties, type PointerEvent } from 'react';
import { isSubstrateLayerType, substrateFilmStyle } from '../lib/materialFamily';

export interface LaminateStack3DLayer {
  id: string;
  type: string;
  material: string;
  micron: number;
  family?: string | null;
}

const TAP_THRESHOLD_PX = 8;

interface LaminateStack3DProps {
  layers: LaminateStack3DLayer[];
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

/** Z offsets — layer 1 (print side) is closest / on top. */
function substrateZOffsets(count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [0];
  const step = 26;
  const mid = (count - 1) / 2;
  return Array.from({ length: count }, (_, i) => (mid - i) * step);
}

export function LaminateStack3D({
  layers,
  expanded = false,
  onToggle,
  className,
}: LaminateStack3DProps) {
  const substrates = useMemo(
    () => layers.filter((l) => isSubstrateLayerType(l.type)),
    [layers],
  );
  const zOffsets = useMemo(() => substrateZOffsets(substrates.length), [substrates.length]);

  const downRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!onToggle || e.button !== 0) return;
    downRef.current = { x: e.clientX, y: e.clientY };
    draggedRef.current = false;
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = downRef.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_THRESHOLD_PX) {
      draggedRef.current = true;
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!onToggle || e.button !== 0) return;
    const d = downRef.current;
    downRef.current = null;
    if (!d || draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  };

  const onPointerCancel = () => {
    downRef.current = null;
    draggedRef.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onToggle) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  if (substrates.length === 0) return null;

  return (
    <div
      className={`lam3d${onToggle ? ' lam3d--tappable' : ''} ${className ?? ''}`}
      role={onToggle ? 'button' : undefined}
      tabIndex={onToggle ? 0 : undefined}
      aria-expanded={onToggle ? expanded : undefined}
      aria-label={onToggle ? `Substrate stack, ${expanded ? 'collapse' : 'expand'}` : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <div className="lam3d__stack">
        {substrates.map((layer, i) => (
          <div
            key={layer.id}
            className="lam3d__slab"
            style={
              {
                '--slab-z': `${zOffsets[i]}px`,
                zIndex: substrates.length - i,
                ...substrateFilmStyle(layer.material, layer.family),
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

export default LaminateStack3D;
