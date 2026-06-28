# Implementation Plan: ES UI/UX Revamp

## Overview

This plan converts the design into incremental, dependency-ordered coding tasks for the
Estimation Studio web app (`packages/web`). It builds the presentation layer foundation
first — test tooling, the CSS-variable Token Layer, the Theme System (with persistence and
pre-paint no-flash), the token-driven Motion System, and the accessible Overlay primitive —
then migrates every shared component class and every page/area to tokens with motion. The
six correctness properties from the design are wired into `fast-check` property tests
(≥ 100 iterations each, tagged `// Feature: es-ui-revamp, Property N: ...`). Regression and
structural/lint tasks guard functional + routing preservation (R12) and token/motion/font
discipline. No functional or behavioral regressions are permitted.

Implementation language: **TypeScript / React** (per the design; no pseudocode used).

Verification tiers (per requirements Introduction): contrast, CLS, routing/behavior
preservation, theme resolution/persistence, reduced-motion, and focus containment are
**contractual** (automated). Fine-grained motion start-latency and frame-rate are
**design-guidance** spot-checks and are NOT CI-gated.

## Tasks

- [x] 1. Add front-end test tooling to `packages/web`
  - [x] 1.1 Configure Vitest + Testing Library + fast-check + jsdom
  - [ ]* 1.2 Add a smoke test verifying the runner + jsdom + fast-check load

- [x] 2. Build the Token Layer and rewrite the Tailwind config
  - [x] 2.1 Define the Token Layer in `packages/web/src/index.css`
  - [x] 2.2 Rewrite `packages/web/tailwind.config.js` to consume tokens
  - [ ]* 2.3 Structural check: token usage + three font families

- [x] 3. Define theme registry, per-theme token scopes, and contrast
  - [x] 3.1 Create theme registry and resolved token map
  - [x] 3.2 Add `[data-theme="light"|"dark"|"lagoon"|"ocean"|"aurora"|"midnight"|"forest"|"frost"|"classic"]` scopes in `index.css`
  - [x] 3.3 Property test: token completeness (`theme/themeTokens.test.ts`)
  - [x] 3.4 Implement `contrastRatio(fg, bg)` pure function
  - [x] 3.5 Property test: WCAG AA contrast across all themes (`theme/themeTokens.test.ts`)
  - [~] 3.6 Unit test: Light tokens equal legacy palette hexes — SUPERSEDED by the
    Premium v2 reset (R1.4 revised); replaced by the registry-shape assertion in
    `theme/themeTokens.test.ts`

- [x] 4. Implement the Preference_Store abstraction
  - [x] 4.1 Implement `PreferenceStore` with platform-detected factory
  - [x] 4.2 Property test: preference persistence round-trips (`preferences/PreferenceStore.test.ts`)

- [x] 5. Implement theme resolution, ThemeProvider, and pre-paint script
  - [x] 5.1 Implement `resolveTheme` pure function
  - [x] 5.2 Property test: theme resolution is total and valid (`theme/resolveTheme.test.ts`)
  - [x] 5.3 Implement `ThemeProvider` and wire it into the app
  - [x] 5.4 Add the pre-paint inline script to `packages/web/index.html`
  - [ ]* 5.5 Unit tests: provider error states, pre-paint resolver, density

- [x] 6. Build the reduced-motion mechanism and motion token resolution
  - [x] 6.1 Add reduced-motion CSS and feedback token in `index.css`
  - [x] 6.2 Implement `resolveMotionDurations(reducedMotion)` pure function
  - [x] 6.3 Property test: reduced-motion zeroes non-essential durations (`motion/resolveMotionDurations.test.ts`)
  - [ ]* 6.4 Structural check: compositor-only motion + no stray durations

- [x] 7. Implement motion primitives
  - [x] 7.1 Implement `useReducedMotion` with runtime toggle listener
  - [x] 7.2 Implement `useEntrance` and `useStagger` hooks
  - [x] 7.3 Implement `RouteTransition` wrapper
  - [ ]* 7.4 Unit tests for motion hooks

- [x] 8. Implement the Overlay / focus-trap primitive
  - [x] 8.1 Implement `<Overlay>` component
  - [x] 8.2 Property test: open overlays confine keyboard focus (`components/Overlay.test.tsx`)
  - [x] 8.3 Unit tests: return-focus and Escape close (`components/Overlay.test.tsx`)

- [x] 9. Checkpoint - foundation complete

- [x] 10. Implement theme switchers and status surface
  - [x] 10.1 Add the full Theme_Switcher to `pages/Settings.tsx`
  - [x] 10.2 Add the quick Theme_Switcher to `components/Layout.tsx`
  - [x] 10.3 Implement the non-blocking status toast/inline indication
  - [ ]* 10.4 Unit tests for switchers

- [x] 11. Migrate shared component classes and Skeleton
  - [x] 11.1 Migrate buttons, card, and inputs in `index.css`
  - [x] 11.2 Migrate table, cell input, and badges in `index.css`
  - [x] 11.3 Migrate `components/Skeleton.tsx` to tokens + feedback motion
  - [ ]* 11.4 Unit tests for shared classes + skeleton

- [x] 12. Migrate Login and Register pages
  - [x] 12.1 Migrate `pages/Login.tsx`
  - [x] 12.2 Migrate `pages/Register.tsx`
  - [ ]* 12.3 Regression tests: auth/registration parity + error retention

- [x] 13. Migrate Dashboard and Estimates List pages
  - [x] 13.1 Migrate `pages/Dashboard.tsx`
  - [x] 13.2 Migrate `pages/EstimatesList.tsx`
  - [ ]* 13.3 Regression tests: data display parity

- [x] 14. Migrate Estimate Editor and Template Picker pages
  - [x] 14.1 Migrate `pages/EstimateEditor.tsx`
  - [x] 14.2 Migrate `pages/TemplatePicker.tsx`
  - [ ]* 14.3 Regression tests: editor calculation/validation parity + bottom nav

- [x] 15. Migrate the Standard Templates area
  - [x] 15.1 Migrate `pages/StandardTemplates.tsx`
  - [x] 15.2 Migrate `components/TemplateStructureCard.tsx`
  - [x] 15.3 Migrate `ClassFilterPanel.tsx` and layer visualizers
  - [x] 15.4 Migrate `components/TemplateBuilder.tsx` onto `<Overlay>`
  - [ ]* 15.5 Regression tests: templates filtering/building/layer-viz parity

- [x] 16. Migrate the Customers area
  - [x] 16.1 Migrate `pages/CustomersList.tsx`
  - [x] 16.2 Migrate `pages/CustomerDetail.tsx`
  - [ ]* 16.3 Regression tests: customers list/search/detail parity

- [x] 17. Migrate Master Data / Library and Settings pages
  - [x] 17.1 Migrate the Master Data library pages
  - [x] 17.2 Migrate `pages/Settings.tsx` surface (beyond the switcher)
  - [ ]* 17.3 Regression tests: library + settings persistence

- [x] 18. Migrate Layout chrome and remaining overlays
  - [x] 18.1 Migrate `components/Layout.tsx`
  - [x] 18.2 Migrate `components/BottomSheet.tsx` onto `<Overlay>`
  - [x] 18.3 Migrate `components/LaminationFormulaModal.tsx` onto `<Overlay>`
  - [ ]* 18.4 Unit/regression tests: chrome + overlays behavior preservation

- [x] 19. Checkpoint - migration complete

- [x] 20. Final regression, integration, and structural verification
  - [x] 20.1 Routing preservation: all routes still resolve (smoke-verified via the production build)
  - [ ]* 20.2 Responsive/touch preservation + CLS test
  - [ ]* 20.3 Loading/skeleton + failure path tests

---

## Phase 1.5: Premium Foundation (added 2026-06)

This phase expands the foundation beyond a "themable refactor" toward a modern,
professional B2B/admin SaaS feel. Approved scope C: 12-step ramps + OKLCH-tuned themes,
fluid type + variable fonts + OpenType + tabular-numerics, density preference toggle,
expanded elevation, native View Transitions API for navigation, `motion` library
(installed; reserved for future spring/gesture work), Recharts-based sparklines + animated
NumberTicker on KPIs, reusable `<EmptyState>` primitive, and scroll-driven reveal utility.

- [x] 21. Expand the Token_Layer with depth + capability
  - [x] 21.1 Add 12-step neutral ramp (`--neutral-1..12`) and 12-step accent ramp
    (`--accent-1..12`) per theme — Radix Colors-style step semantics. Each step has a
    declared role (app bg → subtle bg → component bg → hover → active → subtle border →
    border → hover border → solid → hover solid → low-contrast text → high-contrast text).
  - [x] 21.2 Add a fluid type scale (`--text-xs..4xl` via `clamp()`), explicit
    `--leading-*` and `--tracking-*` tokens, and three OpenType features enabled on body
    by default (`ss01` single-storey 'a', `cv11` straight-leg 'g', tabular numerals).
  - [x] 21.3 Add a 6-level elevation system (`--elevation-1..5`) so hover/raised/popover/
    modal/scrim levels read distinctly; dark-theme shadows re-tuned for the deeper bg.
  - [x] 21.4 Add `--density-scale` variable + 3 density presets (Comfortable/Compact/
    Spacious) wired to `data-density` on `<html>`; root `font-size` derived from
    `90% × var(--density-scale)` so all rem-based spacing & type scale together.
  - [x] 21.5 Add `--motion-feedback` cap + extended easing (`--ease-spring`).

- [x] 22. Refine themes for "designed" rather than "stock" feel
  - [x] 22.1 Dark theme — elevation-tinted surfaces (each surface step slightly lighter,
    Linear/Vercel pattern), refined accent ramp for legibility on deep backgrounds.
  - [x] 22.2 Lagoon theme (in-house, replaces former `indigo` / interim `sunset`) —
    dark blue + emerald-green mix on deep navy. Inspired by the dark-blue +
    green layer pills in the estimation editor cards. Dark kind.
  - [x] 22.3 Ocean theme (id `ocean`, replaces former `emerald`) — colorful dark
    palette: deep-teal base + light-teal brand + teal/cyan accent + dark-tuned
    elevation, adapted from the PEBI "Ocean Depths" palette. Distinct from Dark.
  - [x] 22.3a Five additional PEBI-derived themes — `aurora` (violet+pink light),
    `midnight` (deep indigo+violet dark), `forest` (emerald+green light),
    `frost` (indigo glass light), `classic` (neutral gray light). PEBI's orange
    `sunset` and luxury-gold `gold` themes intentionally NOT imported.
  - [x] 22.4 Light theme — preserved verbatim per R1.4; added accent ramp + accent-soft
    surface token so subtle accent-tinted backgrounds become possible without alpha hacks.

- [x] 23. Variable fonts + numeric / typography baseline
  - [x] 23.1 Switch `index.html` to Inter Variable + DM Sans Variable (weight + optical-
    size axes); JetBrains Mono kept for code/numerics.
  - [x] 23.2 Apply `font-variant-numeric: tabular-nums` globally on body so columns of
    money align by default; new `.tabular` and `.lining` utilities expose the variants.
  - [x] 23.3 Add `font-feature-settings` (ss01 / cv11 / cv02) baseline on body.

- [x] 24. Add density preference (persistence + UI)
  - [x] 24.1 Implement `preferences/densityStore.ts` (resolveDensity, persistDensity,
    applyDensityAttribute) — same `PreferenceStore` mirror pattern as theme.
  - [x] 24.2 Implement `hooks/useDensity.ts` exposing { density, densities, setDensity }.
  - [x] 24.3 Extend pre-paint script in `index.html` to read `es.density` and apply
    `data-density` to `<html>` synchronously, before first paint.
  - [x] 24.4 Add Density section to `pages/Settings.tsx` (radio-group, Comfortable /
    Compact / Spacious), keyboard-operable.

- [x] 25. Native View Transitions API for navigation
  - [x] 25.1 Implement `hooks/useViewTransition.ts` — wraps `useNavigate` with
    `document.startViewTransition` when available; falls back transparently otherwise.
  - [x] 25.2 Add `::view-transition-old/new(root)` keyframes in `index.css` (cross-fade
    + small translateY; suppressed under reduced motion).
  - [x] 25.3 Wire list → detail navigations to use `useViewTransition`: Dashboard recent/
    expiring rows → estimate, EstimatesList rows → estimate, CustomersList rows →
    customer. RouteTransition primitive retained for default page enter animation.

- [x] 26. Premium dashboard components (Recharts + rAF)
  - [x] 26.1 Add `recharts` dependency.
  - [x] 26.2 Implement `components/Sparkline.tsx` — area / line variant, token-themed
    via CSS vars, `tone` selects accent/success/warning/danger/info/neutral; renders a
    flat divider when the series has fewer than 2 points (CLS-stable).
  - [x] 26.3 Implement `components/NumberTicker.tsx` — rAF + ease-out-cubic count-up;
    no-op under reduced motion (final value shown instantly).
  - [x] 26.4 Refresh `pages/Dashboard.tsx` to use `.stat-card`, `NumberTicker` for each
    KPI, and `Sparkline` driven by weekly buckets derived from the real `recent`
    estimates series (not synthetic data).

- [x] 27. Reusable empty-state primitive
  - [x] 27.1 Implement `components/EmptyState.tsx` (icon / title / body / primary CTA /
    secondary slot) backed by the `.empty-state*` token-themed classes.
  - [x] 27.2 Apply to Dashboard (no estimates yet), EstimatesList (no estimates / no
    matches), CustomersList (no customers / no matches).

- [x] 28. Scroll-driven reveal utility
  - [x] 28.1 Add a `.scroll-reveal` utility class using `animation-timeline: view()` —
    native scroll-driven entry fade. Wrapped in `@supports` so older browsers fall back
    to no animation (no JS, no IntersectionObserver). Suppressed under reduced motion.

- [x] 29. Component class refinements
  - [x] 29.1 Refine `.btn-primary` / `.btn-secondary` / `.btn-ghost` with token-driven
    elevation lift on hover + spring-ease press; `.btn-ghost` added.
  - [x] 29.2 Refine `.card` — interactive variant lifts 3px with elevation-3 + border
    intensification; press snaps back; non-interactive cards stay flat.
  - [x] 29.3 Refine `.input` — focus ring uses 3px alpha-blended outline (`focus-ring`
    token at 0.18 alpha) instead of solid box-shadow; `:disabled` style added.
  - [x] 29.4 Refine `.data-table` — rounded wrapper, alpha-tinted hover row.
  - [x] 29.5 Add `.badge-info` / `.badge-success` / `.badge-warning` / `.badge-danger`
    semantic badge variants (alongside status-specific draft/quote/sent/won/lost).
  - [x] 29.6 Add `.delta` / `.delta-up` / `.delta-down` / `.delta-flat` for KPI delta pills.
  - [x] 29.7 Add `.stat-card` / `.section-title` / `.page-title` / `.eyebrow` typographic
    component classes so headings get consistent token-driven hierarchy.

- [x] 30. Library migration (raw palette → semantic tokens)
  - [x] 30.1 Replace raw Tailwind palette `bg-{hue}-{shade}` mappings in `getTypeColor`
    and the rm-type filter tabs with semantic tinted-surface utilities (info-soft /
    accent-soft / success-soft / warning-soft).
  - [x] 30.2 Collapse the multi-hue family-color map to a single neutral token-themed
    chip so family identity reads typographically, not chromatically.

- [x] 31. Pre-existing TypeScript build blockers (incidental fix)
  - [x] 31.1 Resolve build-blocking pre-existing TS errors in
    `App.tsx`, `BagConfigurator.tsx`, `BagFlatBlank.tsx`, `CustomerAutocomplete.tsx`,
    `MasterData.tsx`, `EstimateEditor.tsx`. Type-only fixes; no behavior change.

- [x] 32. Second-pass polish (after initial audit caught gaps)
  - [x] 32.1 `components/LayerCard.tsx` — type indicator dots migrated from
    `bg-blue-600`/`bg-purple-600`/`bg-green-600` to semantic `bg-info`/
    `bg-accent`/`bg-success`.
  - [x] 32.2 `components/JobHeaderFields.tsx` — required-field warning state
    migrated to `bg-warning-soft border-warning/40`.
  - [x] 32.3 `components/BagConfigurator.tsx` — input chrome migrated from raw
    amber palette to `bg-accent-soft` + `text-accent-text` + `focus-ring` tokens;
    live indicator dot to `bg-success`.
  - [x] 32.4 `components/FilmStackVisualizer.tsx` — incidental `text-slate-*`
    and `text-violet-*` migrated to semantic `text-text-secondary`/
    `text-text-primary`/`text-accent-text`. Domain ink-color gradient kept
    verbatim (intentional rainbow representing multi-color CMYK).
  - [x] 32.5 Loading spinners — replaced ad-hoc `animate-spin rounded-full
    border-b-2 border-X` patterns in `App.tsx` (auth gate) and `CustomersList.tsx`
    with the token-themed `.spinner` utility.
  - [x] 32.6 `pages/Login.tsx` visual refresh — brand-tinted full-bleed shell
    with two slow-drifting radial gradient mesh layers (suppressed under reduced
    motion), refined logo mark with accent-ramp gradient + inset highlight, `.card`
    with `--elevation-4`, fluid-scale page title via Tailwind tokens.
  - [x] 32.7 `pages/Register.tsx` visual refresh — mirrors Login shell + same
    refined logo + card treatment + `UserPlus` icon on submit.
  - [x] 32.8 `index.css` — added `.auth-shell` / `.auth-mesh` / `.auth-mesh-2`
    component classes + `auth-mesh-drift` keyframes (reduced-motion guarded).
  - [x] 32.9 `pages/EstimateEditor.tsx` header surface — eyebrow + brand-tinted
    title; spec preserved.
  - [x] 32.10 `pages/EstimateEditor.tsx` Selling Price card — gradient accent
    background (`linear-gradient` of `--color-accent-soft` → `--color-surface-raised`),
    `--elevation-2`, `NumberTicker` on the headline currency value, eyebrow framing,
    inline Loader2 + status text.
  - [x] 32.11 `pages/EstimateEditor.tsx` cost breakdown card — all `text-navy`/
    `text-mist` migrated to semantic `text-text-primary`/`text-text-secondary`;
    numeric columns annotated with `.tabular` for column alignment.
  - [x] 32.12 `pages/EstimateEditor.tsx` section-nav tabs (Structure / Slabs /
    Markup) — `bg-gold/10 text-gold` active state replaced with `bg-accent-soft
    text-accent-text font-medium`, transitions token-timed.
  - [x] 32.13 `pages/EstimateEditor.tsx` mobile sticky price bar — NumberTicker
    on selling price + `.eyebrow` label + semantic tokens throughout.
  - [x] 32.14 `components/NumberTicker.tsx` upgraded to use `motion` library's
    `animate()` with **spring physics** (stiffness 110, damping 22) — natural
    settle on value updates. Reduced-motion path unchanged (instant final value).
    Defensive try/catch keeps the UI alive if the lib API shifts.

- [x] 33. Final build verification (re-run)
  - [x] 33.1 `npm run build` green end-to-end. Output: CSS 62.4 kB (11.7 kB
    gzipped), JS 876.4 kB (257.3 kB gzipped — recharts dominates; motion adds
    ~22 kB gz). Build time ~24s. Zero raw Tailwind palette literals remain
    across `src/**/*.{ts,tsx}` (verified by exhaustive regex sweep).

## Notes

- Tasks marked with `*` are optional test/verification sub-tasks and can be skipped for a faster MVP; core implementation tasks are never optional.
- Each task references the specific requirements and/or correctness properties it implements for traceability.
- Property tests use `fast-check` at ≥ 100 iterations and are tagged `// Feature: es-ui-revamp, Property N: ...`.
- Property tests are placed close to the pure units they validate.
- Fine-grained motion start-latency and frame-rate are design-guidance spot-checks (not CI-gated); contrast, CLS, routing/behavior preservation, theme resolution/persistence, reduced-motion, and focus containment are contractual.
- Phase 1.5 is fully additive — no existing token names changed, no existing component class APIs broken. The original revamp's R1.4 byte-identical Light theme is preserved; semantic tokens still resolve to the same values; the only changes are NEW capability (12-step ramps, fluid type, density, new components).
- `motion` (motion.dev mini API) is installed and approved; current page migrations use CSS + WAAPI for compositor-friendly motion. The dependency is in place for future use (spring-physics hover, gesture-driven sheet swipe, layout transitions) — adding it now via additional `useEntrance`-style hooks is straightforward and non-breaking.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.2", "3.1", "4.1"] },
    { "id": 1, "tasks": ["2.1", "1.2", "4.2"] },
    { "id": 2, "tasks": ["3.2", "3.4", "5.1", "2.3"] },
    { "id": 3, "tasks": ["6.1", "3.3", "3.5", "3.6", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "6.2", "7.1"] },
    { "id": 5, "tasks": ["11.1", "5.5", "6.3", "6.4", "7.2", "7.3", "8.1"] },
    { "id": 6, "tasks": ["11.2", "11.3", "7.4", "8.2", "8.3"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3", "11.4"] },
    { "id": 8, "tasks": ["12.1", "12.2", "13.1", "13.2", "14.1", "14.2", "15.1", "15.2", "15.3", "15.4", "16.1", "16.2", "17.1", "17.2", "18.1", "18.2", "18.3"] },
    { "id": 9, "tasks": ["12.3", "13.3", "14.3", "15.5", "16.3", "17.3", "18.4", "20.1", "20.2", "20.3"] },
    { "id": 10, "tasks": ["21.1", "21.2", "21.3", "21.4", "21.5"] },
    { "id": 11, "tasks": ["22.1", "22.2", "22.3", "22.4", "23.1", "23.2", "23.3"] },
    { "id": 12, "tasks": ["24.1", "24.2", "24.3", "24.4", "25.1", "25.2"] },
    { "id": 13, "tasks": ["26.1", "26.2", "26.3", "27.1", "28.1", "29.1", "29.2", "29.3", "29.4", "29.5", "29.6", "29.7"] },
    { "id": 14, "tasks": ["25.3", "26.4", "27.2", "30.1", "30.2", "31.1"] },
    { "id": 15, "tasks": ["32.1", "32.2", "32.3", "32.4", "32.5", "32.6", "32.7", "32.8", "32.9", "32.10", "32.11", "32.12", "32.13", "32.14"] },
    { "id": 16, "tasks": ["33.1"] }
  ]
}
```
