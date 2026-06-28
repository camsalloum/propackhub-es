import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { Overlay } from './Overlay';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const MOBILE_QUERY = '(max-width: 767.98px)';

function readIsMobile(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia(MOBILE_QUERY).matches;
}

/**
 * Mobile bottom sheet — used by EstimateEditor for layer edit / add layer.
 *
 * PREMIUM v2 — adds swipe-to-dismiss gesture via `useSwipeToDismiss`, which
 * uses motion library's spring physics for the snap-back and dismiss-slide.
 * Drag handle is exposed at the top of the sheet so users see the affordance.
 *
 * Portal, scrim, focus trap, return-focus, Escape, body scroll lock, reduced
 * motion, and the enter/exit slide are provided by `<Overlay variant="sheet">`.
 */
const BottomSheet = ({ open, onClose, title, children, footer }: BottomSheetProps) => {
  const titleId = useId();
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(readIsMobile);

  // Swipe down to dismiss — motion-library-powered spring for the snap-back.
  const { ref: handleRef } = useSwipeToDismiss<HTMLDivElement>({
    onDismiss: onClose,
    dismissThreshold: 0.30,
    velocityThreshold: 0.5,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    const onResize = () => {
      if (!vv) return;
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    vv?.addEventListener('resize', onResize);
    vv?.addEventListener('scroll', onResize);
    onResize();

    return () => {
      vv?.removeEventListener('resize', onResize);
      vv?.removeEventListener('scroll', onResize);
      setKeyboardOffset(0);
    };
  }, [open]);

  return (
    <Overlay open={open && isMobile} onClose={onClose} variant="sheet" labelledBy={titleId}>
      <div
        ref={handleRef}
        className="w-full bg-surface-overlay rounded-t-2xl flex flex-col max-h-[85vh] touch-pan-y"
        style={{
          boxShadow: 'var(--elevation-5)',
          marginBottom: keyboardOffset,
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          maxHeight:
            keyboardOffset > 0
              ? `min(85vh, ${window.visualViewport?.height ?? window.innerHeight}px)`
              : '85vh',
        }}
      >
        {/* Drag handle — visual affordance for the swipe gesture */}
        <div className="flex justify-center py-2.5 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 rounded-full bg-border-strong" aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border shrink-0">
          <h3 id={titleId} className="font-display font-semibold text-text-primary">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-base text-text-secondary tap-target"
            aria-label="Close sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4 overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 px-4 py-3 border-t border-border bg-surface-overlay">{footer}</div>
        )}
      </div>
    </Overlay>
  );
};

export default BottomSheet;
