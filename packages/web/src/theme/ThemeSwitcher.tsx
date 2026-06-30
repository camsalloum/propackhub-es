// Feature: es-ui-revamp — Full Theme_Switcher (Settings).
//
// The canonical, labeled theme picker hosted on the Settings page (R3.1, R23.4).
// It renders an accessible radio-group listing *every* available Theme from the
// theme registry (read from `ThemeProvider` context), showing each Theme's name,
// a color swatch, and a visible selected/active indicator for the current
// Active_Theme. Selecting an option calls `setTheme(id)` from context, which
// applies + persists the choice (R3.2, R3.5).
//
// Styling is fully token-backed (surface/border/accent/text tokens) so the
// control re-themes with the rest of the app, and each option is sized as a
// Tap_Target (≥ 48×48 CSS px) for touch (R24.4 / R11.2).
//
// This is a focused presentational control; theme application, persistence, and
// error handling all live in `ThemeProvider`.

import { Check } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { SectionTitle } from '../components/SectionTitle';
import type { ThemeId } from './types';

/**
 * A non-blocking, human-readable message for the Theme System status, surfaced
 * inline under the switcher when a selection could not be applied or saved
 * (R3.6, R4.6). Returns `null` on the happy path.
 */
function statusMessage(
  status: ReturnType<typeof useTheme>['status'],
): string | null {
  switch (status.state) {
    case 'apply-error':
      return 'That theme could not be applied. Your previous theme is still active.';
    case 'persist-error':
      return 'Theme applied, but it could not be saved for next time.';
    case 'fallback':
      return status.reason === 'no-themes'
        ? 'No selectable themes are available; using the default theme.'
        : null;
    default:
      return null;
  }
}

export function ThemeSwitcher() {
  const { activeTheme, themes, status, setTheme } = useTheme();
  const message = statusMessage(status);

  const handleSelect = (id: ThemeId) => {
    if (id !== activeTheme) {
      void setTheme(id);
    }
  };

  return (
    <div>
      <fieldset>
        <SectionTitle
          as="legend"
          className="block text-sm font-medium text-text-primary mb-3"
          hint="Choose how Estimation Studio looks. Your selection is saved for next time."
        >
          Theme
        </SectionTitle>

        <div
          role="radiogroup"
          aria-label="Color theme"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {themes.map((theme) => {
            const isActive = theme.id === activeTheme;
            return (
              <label
                key={theme.id}
                className={[
                  'tap-target relative flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer',
                  'border bg-surface-raised transition-colors duration-micro ease-micro',
                  'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring',
                  isActive
                    ? 'border-accent ring-1 ring-accent'
                    : 'border-border hover:border-border-strong',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="theme"
                  value={theme.id}
                  checked={isActive}
                  onChange={() => handleSelect(theme.id)}
                  className="sr-only"
                />

                {/* Color swatch */}
                <span
                  aria-hidden="true"
                  className="w-8 h-8 rounded-full border border-border shrink-0"
                  style={{ backgroundColor: theme.swatch }}
                />

                <span className="flex flex-col min-w-0">
                  <span className="font-medium text-text-primary truncate">
                    {theme.name}
                  </span>
                  <span className="text-xs text-text-secondary capitalize">
                    {theme.kind}
                  </span>
                </span>

                {/* Selected / active indicator */}
                <span
                  className={[
                    'ml-auto flex items-center justify-center w-6 h-6 rounded-full shrink-0',
                    isActive ? 'bg-accent text-text-on-accent' : 'text-transparent',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {isActive && <Check className="w-4 h-4" />}
                </span>

                {isActive && <span className="sr-only">(current theme)</span>}
              </label>
            );
          })}
        </div>
      </fieldset>

      {message && (
        <p role="status" className="mt-3 text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}

export default ThemeSwitcher;
