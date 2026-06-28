import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export type GradeOption = {
  id: string;
  name: string;
  hoover?: string | null;
};

type Props = {
  value: string;
  options: GradeOption[];
  disabled?: boolean;
  onChange: (materialId: string) => void;
};

/** Table-cell grade picker — closed state truncates; menu expands to fit full laminate names. */
export default function StructureGradeSelect({ value, options, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.id === value);

  const updateMenuPosition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const minW = Math.max(r.width, 280);
    const maxW = Math.min(420, window.innerWidth - 16);
    const width = Math.min(Math.max(minW, 280), maxW);
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - 8 - width);
    }
    setMenuStyle({
      position: 'fixed',
      top: r.bottom + 4,
      left,
      width,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const onScrollOrResize = () => updateMenuPosition();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDocClick);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open]);

  const displayName = selected?.name ?? 'Select grade';
  const title = selected?.hoover?.trim() || selected?.name || '';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        className="cell-input w-full text-xs text-left flex items-center gap-1 min-w-0 disabled:opacity-60"
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
      >
        <span className="truncate flex-1 min-w-0 text-navy">{displayName}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-mist transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && menuStyle && typeof document !== 'undefined' &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            className="max-h-60 overflow-y-auto rounded-lg border border-border bg-surface-raised shadow-lg py-1 text-xs"
            style={menuStyle}
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-mist">No grades in this family</li>
            ) : (
              options.map((m) => {
                const isSelected = m.id === value;
                return (
                  <li key={m.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`w-full text-left px-3 py-2 hover:bg-slate transition-colors ${
                        isSelected ? 'bg-gold/10 text-navy font-semibold' : 'text-navy'
                      }`}
                      title={m.hoover?.trim() || m.name}
                      onClick={() => {
                        onChange(m.id);
                        setOpen(false);
                      }}
                    >
                      <span className="block whitespace-normal break-words leading-snug">{m.name}</span>
                      {m.hoover?.trim() && m.hoover !== m.name && (
                        <span className="block text-mist text-[10px] mt-0.5 leading-snug">{m.hoover}</span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body
        )}
    </>
  );
}
