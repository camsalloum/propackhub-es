// TemplateDeck — depth-stack gallery for the Templates page.
//
// Cards do NOT scroll along a rail. The active card sits centered; the others
// recede backward in 3D (translateZ) fanned to the sides. Moving through them
// pushes the current card "into" the screen while the next comes forward.
// Progress is a single shared motion value; every card derives its transform
// from its signed distance to it.
//
// Contained + horizontal by design:
//   - Scroll mode fills remaining viewport under filters (parent flex-1); L/R
//     nav only — no need to scroll the page for a typical laptop height.
//   - `touch-action: pan-y` hands residual vertical gestures back to the page,
//     and a pointer move that is mostly vertical is abandoned.
//   - A horizontal swipe moves between CARDS only — never pages/history: we own
//     the horizontal gesture and `preventDefault` it, and the stage clips
//     overflow so there is no scrollbar and nothing to navigate to.
//
// Advance via horizontal drag/swipe, prev/next buttons, arrow keys, the dot
// rail, or clicking a receded neighbour to bring it forward. Only the front
// card is interactive; a rail-level click guard stops a drag from firing card
// buttons.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate, type MotionValue } from 'motion/react';
import { useReducedMotion } from '../hooks/useReducedMotion';

const RECEDE_Z = 280; // px a neighbour recedes into depth per unit of distance
const ROT_Y = 20; // deg of turn per unit of distance
const SCALE_STEP = 0.16;
const OPACITY_STEP = 0.5;
const WHEEL_STEP_PX = 200; // horizontal wheel delta that advances one card (trackpad)
const DRAG_THRESHOLD = 8; // px before a pointer move counts as a drag
const NEIGHBOUR_CLICK_RANGE = 2; // how many cards each side accept click-to-front
/** Side fan (px per unit of distance) scales with card width so larger cards do not overlap. */
const fanXForWidth = (width: number) => Math.round(width * 0.66);
const dragStepForWidth = (width: number) => Math.max(260, Math.round(width * 0.75));
/** Default fan offset for the default 400px card — kept so transforms never rely on a removed literal. */
const FAN_X = fanXForWidth(400);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface TemplateDeckProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  ariaLabel: string;
  itemWidth?: number;
  className?: string;
}

interface DeckCardProps {
  progress: MotionValue<number>;
  index: number;
  active: number;
  reduced: boolean;
  width: number;
  onSelect: (index: number) => void;
  children: ReactNode;
}

function DeckCard({ progress, index, active, reduced, width, onSelect, children }: DeckCardProps) {
  const fanX = width > 0 ? fanXForWidth(width) : FAN_X;
  const delta = useTransform(progress, (p) => index - p);
  const x = useTransform(delta, (d) => d * fanX);
  const z = useTransform(delta, (d) => (reduced ? 0 : -Math.abs(d) * RECEDE_Z));
  const rotateY = useTransform(delta, (d) => (reduced ? 0 : d * -ROT_Y));
  const scale = useTransform(delta, (d) => Math.max(0.55, 1 - Math.abs(d) * SCALE_STEP));
  const opacity = useTransform(delta, (d) => Math.max(0, 1 - Math.abs(d) * OPACITY_STEP));
  const zIndex = useTransform(delta, (d) => 100 - Math.round(Math.abs(d) * 10));
  const filter = useTransform(delta, (d) => {
    if (reduced) return 'none';
    const b = (Math.abs(d) - 0.6) * 3;
    return b > 0.05 ? `blur(${Math.min(b, 4)}px)` : 'none';
  });

  const isActive = active === index;
  const near = Math.abs(active - index) <= NEIGHBOUR_CLICK_RANGE;

  return (
    <motion.li
      className="deck__card"
      style={{
        x,
        y: '-50%',
        z,
        rotateY,
        scale,
        opacity,
        zIndex,
        filter,
        width,
        marginLeft: -width / 2,
        pointerEvents: isActive || near ? 'auto' : 'none',
      }}
      aria-hidden={!isActive}
    >
      <div className="deck__card-inner" style={{ pointerEvents: isActive ? 'auto' : 'none' }}>
        {children}
      </div>
      {!isActive && near && (
        <button
          type="button"
          className="deck__select"
          aria-label="Bring this template to the front"
          onClick={() => onSelect(index)}
        />
      )}
    </motion.li>
  );
}

export function TemplateDeck<T>({
  items,
  getKey,
  renderItem,
  ariaLabel,
  itemWidth = 400,
  className,
}: TemplateDeckProps<T>) {
  const reduced = useReducedMotion();
  const n = items.length;
  const progress = useMotionValue(0);
  const [active, setActive] = useState(0);
  const deckRef = useRef<HTMLDivElement>(null);
  const progressAnim = useRef<ReturnType<typeof animate> | null>(null);
  const dragStepPx = dragStepForWidth(itemWidth);

  const setActiveClamped = useCallback((i: number) => setActive((_) => clamp(i, 0, n - 1)), [n]);

  // Spring the shared progress toward the active index (instant under reduced motion).
  useEffect(() => {
    progressAnim.current = animate(
      progress,
      active,
      reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 32 },
    );
    const controls = progressAnim.current;
    return () => controls?.stop();
  }, [active, reduced, progress]);

  // Trackpad two-finger horizontal swipe drives the deck. A native, NON-passive
  // wheel listener is required: React's onWheel is passive, so it cannot
  // preventDefault the browser's horizontal-overscroll back/forward navigation
  // (the "pages go out from template" bug). Vertical wheel is left untouched so
  // the page keeps scrolling normally.
  useEffect(() => {
    const el = deckRef.current;
    if (!el) return;
    let settle: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical → page scroll
      e.preventDefault();
      progressAnim.current?.stop();
      progress.set(clamp(progress.get() + e.deltaX / WHEEL_STEP_PX, 0, n - 1));
      if (settle) clearTimeout(settle);
      settle = setTimeout(() => setActiveClamped(Math.round(progress.get())), 120);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (settle) clearTimeout(settle);
    };
  }, [n, progress, setActiveClamped]);

  // Active-set reset: a new tab/filter list starts at the first card.
  const firstKey = n > 0 ? getKey(items[0]) : '';
  const lastKey = n > 0 ? getKey(items[n - 1]) : '';
  useEffect(() => {
    setActive(0);
    progress.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, firstKey, lastKey]);

  // ── Pointer drag. Horizontal-dominant gestures drive the deck; vertical ones
  // are abandoned so the page scrolls. We never navigate history on swipe.
  const drag = useRef<{ startX: number; startY: number; startProg: number; moved: boolean; id: number } | null>(null);
  const justDragged = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag.current = { startX: e.clientX, startY: e.clientY, startProg: progress.get(), moved: false, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical gesture → let the page scroll; stop tracking this pointer.
        drag.current = null;
        return;
      }
      d.moved = true;
      progressAnim.current?.stop();
      (e.currentTarget as HTMLElement).setPointerCapture?.(d.id);
    }
    e.preventDefault();
    progress.set(clamp(d.startProg - dx / dragStepPx, 0, n - 1));
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.moved) {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(d.id);
      justDragged.current = true;
      setActiveClamped(Math.round(progress.get()));
    }
  };

  // Capture-phase guard: swallow the click that trails a drag so card buttons
  // (and the neighbour "bring to front" overlay) never fire on a swipe.
  const onClickCapture = (e: React.MouseEvent) => {
    if (justDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    justDragged.current = false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveClamped(active + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveClamped(active - 1);
    }
  };

  const navBase =
    'deck__nav focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[rgb(var(--color-focus-ring))] focus-visible:ring-offset-2';

  return (
    <div
      ref={deckRef}
      className={`deck ${className ?? ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      <ul key={reduced ? 'reduced' : 'motion'} className="deck__stage">
        {items.map((item, i) => (
          <DeckCard
            key={getKey(item)}
            progress={progress}
            index={i}
            active={active}
            reduced={reduced}
            width={itemWidth}
            onSelect={setActiveClamped}
          >
            {renderItem(item, i)}
          </DeckCard>
        ))}
      </ul>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous template"
            onClick={() => setActiveClamped(active - 1)}
            disabled={active === 0}
            className={`${navBase} deck__nav--prev`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next template"
            onClick={() => setActiveClamped(active + 1)}
            disabled={active === n - 1}
            className={`${navBase} deck__nav--next`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="deck__dots" role="tablist" aria-label="Templates">
            {items.map((item, i) => (
              <button
                key={getKey(item)}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Template ${i + 1} of ${n}`}
                className={`deck__dot${i === active ? ' is-active' : ''}`}
                onClick={() => setActiveClamped(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TemplateDeck;
