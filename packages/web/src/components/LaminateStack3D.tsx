// LaminateStack3D — exploded isometric layer stack for the template cards.
//
// Desktop: explode on card hover/focus (CSS on `.card[data-interactive]`).
// Touch: tap the preview toggles `expanded` (parent sets `data-stack-expanded`
// on the card). Pointer travel > 8px is treated as a carousel drag, not a tap.

import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { materialFamily, materialFamilyColorVar } from '../lib/materialFamily';

export interface LaminateStack3DLayer {
  id: string;
  type: string;
  material: string;
  micron: number;
}

const TAP_THRESHOLD_PX = 8;

interface LaminateStack3DProps {
  layers: LaminateStack3DLayer[];
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function LaminateStack3D({
  layers,
  expanded = false,
  onToggle,
  className,
}: LaminateStack3DProps) {
  const n = layers.length;
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

  return (
    <div
      className={`lam3d${onToggle ? ' lam3d--tappable' : ''} ${className ?? ''}`}
      role={onToggle ? 'button' : undefined}
      tabIndex={onToggle ? 0 : undefined}
      aria-expanded={onToggle ? expanded : undefined}
      aria-label={onToggle ? `Layer stack, ${expanded ? 'collapse' : 'expand'} layers` : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <div className="lam3d__stack">
        {layers.map((layer, i) => {
          const family = materialFamily(layer.material, layer.type);
          const z = (i - (n - 1) / 2) * 11;
          const isAdhesive = layer.type === 'adhesive';
          const style = {
            '--slab-a': materialFamilyColorVar(family),
            '--slab-z': `${z}px`,
            zIndex: i + 1,
          } as CSSProperties;
          return (
            <div key={layer.id} className={`lam3d__slab${isAdhesive ? ' is-adhesive' : ''}`} style={style}>
              <span className="lam3d__tag">
                {layer.material} · {layer.micron}µm
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LaminateStack3D;
