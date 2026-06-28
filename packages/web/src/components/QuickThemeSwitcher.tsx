// Feature: es-ui-revamp — Quick Theme_Switcher (more visible).
//
// Premium v2: the switcher is a labeled pill, not a tiny icon. Shows the
// active theme's swatch + name so users discover theming at a glance.

import { useEffect, useId, useRef, useState } from 'react';
import { Palette, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import type { ThemeId } from '../theme/types';

export interface QuickThemeSwitcherProps {
  placement?: 'sidebar' | 'header';
  className?: string;
  /** Compact icon-only on the mobile header; labeled pill in the sidebar. */
  compact?: boolean;
}

const QuickThemeSwitcher = ({ placement = 'header', className = '', compact }: QuickThemeSwitcherProps) => {
  const { activeTheme, themes, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const active = themes.find((t) => t.id === activeTheme);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (id: ThemeId) => {
    void setTheme(id);
    setIsOpen(false);
  };

  const popoverPosition =
    placement === 'sidebar'
      ? 'bottom-full mb-2 left-0'
      : 'top-full mt-2 right-0';

  const isCompact = compact ?? placement === 'header';

  return (
    <div ref={containerRef} className="relative">
      {isCompact ? (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          aria-label="Change theme"
          title="Change theme"
          onClick={() => setIsOpen((open) => !open)}
          className={`tap-target flex items-center justify-center rounded-lg text-text-primary hover:bg-surface-base transition-colors ${className}`}
        >
          <Palette className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={() => setIsOpen((open) => !open)}
          className={`w-full inline-flex items-center gap-2 px-3 py-2 min-h-[40px] rounded-lg border border-border bg-surface-raised text-text-primary text-sm font-medium hover:bg-surface-base hover:border-border-strong transition-colors ${className}`}
        >
          <Palette className="w-4 h-4 text-accent-text shrink-0" />
          <span className="flex-1 text-left">Theme</span>
          <span
            className="w-3.5 h-3.5 rounded-full ring-1 ring-border shrink-0"
            style={{ backgroundColor: active?.swatch }}
            aria-hidden
          />
          <span className="text-xs text-text-secondary hidden lg:inline">{active?.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-text-secondary shrink-0" />
        </button>
      )}

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Select theme"
          className={`absolute z-50 ${popoverPosition} w-56 rounded-xl border border-border bg-surface-raised p-1.5`}
          style={{ boxShadow: 'var(--elevation-4)' }}
        >
          <div className="px-3 pt-2 pb-1 eyebrow">Themes</div>
          {themes.map((theme) => {
            const isActive = theme.id === activeTheme;
            return (
              <button
                key={theme.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => handleSelect(theme.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-lg text-left text-sm transition-all ${
                  isActive
                    ? 'bg-accent-soft text-accent-text font-medium'
                    : 'text-text-primary hover:bg-surface-base'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full ring-2 ring-offset-2 ring-offset-surface-raised shrink-0 transition-all"
                  style={{
                    backgroundColor: theme.swatch,
                    boxShadow: isActive ? `0 0 0 2px rgb(var(--color-accent))` : 'none',
                  }}
                  aria-hidden="true"
                />
                <span className="flex-1 font-medium">{theme.name}</span>
                {isActive && <Check className="w-4 h-4 shrink-0 text-accent-text" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuickThemeSwitcher;
