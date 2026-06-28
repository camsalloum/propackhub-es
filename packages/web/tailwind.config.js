/** @type {import('tailwindcss').Config} */

// Map a color token (declared as a space-separated RGB channel triplet, e.g.
// `--color-brand: 15 31 61`) to an `rgb(... / <alpha-value>)` expression so that
// Tailwind opacity utilities keep working (e.g. `bg-slate/40`, `bg-gold/10`,
// `bg-accent-soft`, `text-accent-text`). The triplets themselves live in the
// Token Layer in `src/index.css` and are switched at runtime by the Theme System.
const rgb = (v) => `rgb(var(${v}) / <alpha-value>)`;

// Build a 12-step ramp { '1': rgb('--ramp-1'), ..., '12': rgb('--ramp-12') }.
const ramp = (prefix) =>
  Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [String(i + 1), rgb(`${prefix}-${i + 1}`)]),
  );

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ---- semantic tokens (preserved) ----
        'surface-base':    rgb('--color-surface-base'),
        'surface-raised':  rgb('--color-surface-raised'),
        'surface-sunken':  rgb('--color-surface-sunken'),
        'surface-overlay': rgb('--color-surface-overlay'),
        scrim:             rgb('--color-scrim'),
        'text-primary':    rgb('--color-text-primary'),
        'text-secondary':  rgb('--color-text-secondary'),
        'text-inverse':    rgb('--color-text-inverse'),
        'text-on-accent':  rgb('--color-text-on-accent'),
        brand:             rgb('--color-brand'),
        accent:            rgb('--color-accent'),
        'accent-text':     rgb('--color-accent-text'),
        'accent-soft':     rgb('--color-accent-soft'),
        'focus-ring':      rgb('--color-focus-ring'),
        border:            rgb('--color-border'),
        'border-strong':   rgb('--color-border-strong'),
        success:           rgb('--color-success'),
        'success-soft':    rgb('--color-success-soft'),
        warning:           rgb('--color-warning'),
        'warning-soft':    rgb('--color-warning-soft'),
        danger:            rgb('--color-danger'),
        'danger-soft':     rgb('--color-danger-soft'),
        info:              rgb('--color-info'),
        'info-soft':       rgb('--color-info-soft'),

        // ---- 12-step ramps (NEW — Radix-style depth) ----
        neutral: ramp('--neutral'),
        accents: ramp('--accent'), // `accents` (plural) to avoid clashing with the `accent` semantic token

        // ---- badge surfaces (per status) ----
        'badge-draft-bg': rgb('--color-badge-draft-bg'),
        'badge-draft-fg': rgb('--color-badge-draft-fg'),
        'badge-quote-bg': rgb('--color-badge-quote-bg'),
        'badge-quote-fg': rgb('--color-badge-quote-fg'),
        'badge-sent-bg':  rgb('--color-badge-sent-bg'),
        'badge-sent-fg':  rgb('--color-badge-sent-fg'),
        'badge-won-bg':   rgb('--color-badge-won-bg'),
        'badge-won-fg':   rgb('--color-badge-won-fg'),
        'badge-lost-bg':  rgb('--color-badge-lost-bg'),
        'badge-lost-fg':  rgb('--color-badge-lost-fg'),

        // ---- legacy aliases (retained so existing code keeps compiling) ----
        navy:             rgb('--color-brand'),
        gold:             rgb('--color-accent'),
        'gold-accessible':rgb('--color-accent-text'),
        slate:            rgb('--color-surface-base'),
        ink:              rgb('--color-text-primary'),
        mist:             rgb('--color-text-secondary'),
      },
      fontFamily: {
        sans:    'var(--font-sans)',
        display: 'var(--font-display)',
        mono:    'var(--font-mono)',
      },
      fontSize: {
        // Fluid type scale (clamp-based). Tailwind expects [size, lineHeight]
        // tuples; pair each with a corresponding leading var.
        xs:   ['var(--text-xs)',   { lineHeight: 'var(--leading-normal)' }],
        sm:   ['var(--text-sm)',   { lineHeight: 'var(--leading-normal)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        lg:   ['var(--text-lg)',   { lineHeight: 'var(--leading-snug)' }],
        xl:   ['var(--text-xl)',   { lineHeight: 'var(--leading-snug)' }],
        '2xl':['var(--text-2xl)',  { lineHeight: 'var(--leading-tight)' }],
        '3xl':['var(--text-3xl)',  { lineHeight: 'var(--leading-tight)' }],
        '4xl':['var(--text-4xl)',  { lineHeight: 'var(--leading-tight)' }],
      },
      letterSpacing: {
        tight:  'var(--tracking-tight)',
        normal: 'var(--tracking-normal)',
        wide:   'var(--tracking-wide)',
      },
      borderRadius: {
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        '2xl':'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm:  'var(--elevation-1)',
        md:  'var(--elevation-2)',
        lg:  'var(--elevation-3)',
        xl:  'var(--elevation-4)',
        '2xl':'var(--elevation-5)',
        // Focus ring used as a standalone shadow (e.g. card hover-accent).
        focus: '0 0 0 3px rgb(var(--color-focus-ring) / 0.25)',
      },
      transitionTimingFunction: {
        micro:   'var(--ease-micro)',
        enter:   'var(--ease-enter)',
        overlay: 'var(--ease-overlay)',
        page:    'var(--ease-page)',
        spring:  'var(--ease-spring)',
      },
      transitionDuration: {
        micro:    'var(--motion-micro)',
        enter:    'var(--motion-enter)',
        overlay:  'var(--motion-overlay)',
        page:     'var(--motion-page)',
        feedback: 'var(--motion-feedback)',
      },
    },
  },
  plugins: [],
};
