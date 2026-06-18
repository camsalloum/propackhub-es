import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const BottomSheet = ({ open, onClose, title, children, footer }: BottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

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
      document.body.style.overflow = prev;
      vv?.removeEventListener('resize', onResize);
      vv?.removeEventListener('scroll', onResize);
      setKeyboardOffset(0);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-navy/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 bg-white rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]"
        style={{
          bottom: keyboardOffset,
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
          maxHeight: keyboardOffset > 0 ? `min(85vh, ${window.visualViewport?.height ?? window.innerHeight}px)` : '85vh',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="font-display font-semibold text-navy">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-slate text-mist tap-target"
            aria-label="Close sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-4 overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 px-4 py-3 border-t border-border bg-white">{footer}</div>
        )}
      </div>
    </div>
  );
};

export default BottomSheet;
