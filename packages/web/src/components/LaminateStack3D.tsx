// LaminateStack3D — photorealistic exploded laminate preview for template cards.
// Substrate count maps to pre-rendered monochrome stack assets (1–5+).

import { useMemo, useRef, type PointerEvent } from 'react';
import { isSubstrateLayerType } from '../lib/materialFamily';

export interface LaminateStack3DLayer {
  id: string;
  type: string;
  material: string;
  micron: number;
  family?: string | null;
}

const TAP_THRESHOLD_PX = 8;

/** Public assets — monochrome premium isometric renders. */
const STACK_SRC: Record<number, string> = {
  1: '/laminate-stacks/stack-1.png',
  2: '/laminate-stacks/stack-2.png',
  3: '/laminate-stacks/stack-3.png',
  4: '/laminate-stacks/stack-4.png',
  5: '/laminate-stacks/stack-5.png',
};

function stackSrcForCount(count: number): string {
  if (count <= 1) return STACK_SRC[1];
  if (count >= 5) return STACK_SRC[5];
  return STACK_SRC[count] ?? STACK_SRC[4];
}

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
  const substrates = useMemo(
    () => layers.filter((l) => isSubstrateLayerType(l.type)),
    [layers],
  );
  const count = substrates.length;
  const src = stackSrcForCount(count);

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

  if (count === 0) return null;

  return (
    <div
      className={`lam3d${onToggle ? ' lam3d--tappable' : ''}${expanded ? ' lam3d--expanded' : ''} ${className ?? ''}`}
      role={onToggle ? 'button' : undefined}
      tabIndex={onToggle ? 0 : undefined}
      aria-expanded={onToggle ? expanded : undefined}
      aria-label={
        onToggle
          ? `Substrate stack, ${count} layers, ${expanded ? 'collapse' : 'expand'}`
          : `Substrate stack, ${count} layers`
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <img
        className="lam3d__render"
        src={src}
        alt=""
        draggable={false}
        decoding="async"
      />
    </div>
  );
}

export default LaminateStack3D;
