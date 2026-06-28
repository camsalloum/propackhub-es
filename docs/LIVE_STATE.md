# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-28 (Login/Register contrast fix — text-inverse + text-on-accent Dark theme overrides + LaminateVisualizer)
**Session focus:** Fix invisible "Estimation Studio" / "Sign in" / tagline / demo creds on the Light theme Login (and Register) — token-coloured headings now follow theme.

---

## Where we stopped (read this first next session)

### Latest fix — auth screen contrast ✅

User report: "the Estimation Studio / Flexible-packaging cost estimation, refined / Sign in" was unreadable on the Light theme Login screen.

**Root cause:** `Login.tsx` and `Register.tsx` painted the headings/tagline/demo creds with inline `style={{ color: 'rgb(var(--color-text-inverse))' }}`. `text-inverse` is white in light themes — but `.auth-shell` background is `surface-base` (warm off-white in Light). White on cream = invisible. The original design assumed a dark hero surface, but the Premium v2 reset made `.auth-shell` use `surface-base` directly.

**Fixes:**
- `pages/Login.tsx` — heading "Estimation Studio" → `text-text-primary`; tagline → `text-text-secondary`; eyebrow → `text-accent-text`; logo "ES" → `text-text-on-accent`; demo credentials wrapper + `<code>` chips → `text-text-secondary` + `bg-accent-soft text-accent-text`.
- `pages/Register.tsx` — same set of replacements.
- `components/LaminateVisualizer.tsx` — 8× `fill="rgb(var(--color-text-inverse))"` → `fill="#FFFFFF"` (the bar colors are fixed hex `#1D5FA3` / `#9B4CA0` / etc. regardless of theme, so labels need to be plain white in every theme — they're a matched pair).
- `theme/registry.ts` + `index.css` `[data-theme="dark"]` — Dark theme was also missing `--color-text-inverse` override (same root pattern as the `text-on-accent` miss earlier). Added `'text-inverse': '#0F0F12'` so `bg-brand text-text-inverse` (e.g. `TemplateBuilder` numbered pills) reads dark-on-near-white instead of white-on-near-white.

**Property test extended.** Added `text-inverse on brand ≥ 4.5:1` to `theme/themeTokens.test.ts`. The new test caught the Dark regression on first run (would have been ~1.0:1 with white-on-white).

**Verified:** `npm run test` → **28/28 passed** · `npm run build` → green (CSS 75.05 kB / 13.69 kB gz, JS 907.10 kB / 263.71 kB gz).

### Previous fix carried — surface×text contrast on accent

Three root causes were producing white-on-light foreground:

1. **Dark theme didn't override `--color-text-on-accent`** → it inherited Light's `#FFFFFF`, so white was painted on Dark's lavender accent `#B275F0` and near-white brand `#F4F4F5` (logo letters, `.btn-primary` labels, accent badges, selected nav pills, layer-type icons). Fixed: `DARK_OVERRIDES` and `[data-theme="dark"]` CSS scope now set `text-on-accent: #0F0F12`.
2. **Hardcoded `text-white` on logo "ES" tiles** (3× in `Layout.tsx` + 1× in `App.tsx`). The logo gradient `--color-accent → --accent-9` is *light* in Dark/Lagoon/Ocean/Midnight themes (their accent ramps trend light), making white letters invisible. Replaced with `text-text-on-accent`.
3. **Hardcoded `bg-white` in 4 components** (`BagConfigurator`, `PouchConfigurator`, `CustomerAutocomplete` dropdown, `StructureGradeSelect` menu). Background stayed white in dark themes but child text inherited `--color-text-primary` (which is *white* in dark themes) → white-on-white. Replaced with `bg-surface-raised`; nearby `border-slate` → `border-border`, `bg-slate/10` → `bg-surface-sunken`.

**Property test strengthened.** Added two new contrast assertions to `theme/themeTokens.test.ts`:
- `text-on-accent` on `accent` ≥ 3.0:1 across all 9 themes
- `text-on-accent` on `brand` ≥ 3.0:1 across all 9 themes

Threshold is 3.0:1 (WCAG 2.1 §1.4.3 large-text / §1.4.11 UI-components) because every consumer of `text-on-accent` paints bold/large UI text (logo letters, `font-semibold` button labels, `font-medium` badges, selected nav pills). This test caught the Dark theme regression at 1.92:1 on first run.

**Verified:** `npm run test` → **27/27 passed** · `npm run build` → green (CSS 74.74 kB / 13.66 kB gz, JS 907.55 kB / 263.74 kB gz).

### Theme set (unchanged — 9 themes)

### Theme set (unchanged — 9 themes)

User explicitly disliked the gold/orange in the prior Sunset, asked for a "dark
blue + green of the layers" mix, and asked for **all PEBI themes**. Result: the
registry grew from 4 to **9 themes**, all genuinely distinct, all WCAG AA across
text/accent/focus pairings (verified by property tests).

**Themes — final set:**

| ID | Kind | Identity | Source |
|----|------|----------|--------|
| `light`    | light | clean editorial near-black + violet on warm white | preserved |
| `dark`     | dark  | Linear-esque deep ink + violet | preserved |
| `lagoon`   | dark  | **dark blue + emerald-green mix** on deep navy `#0F2540` (NEW) | in-house, replaces orange Sunset |
| `ocean`    | dark  | teal/cyan on deep teal, dark-tuned elevation | PEBI "Ocean Depths" |
| `aurora`   | light | vibrant violet + pink on lavender white | PEBI "Aurora Gradient" |
| `midnight` | dark  | deep indigo `#1E1B4B` with violet accents | PEBI "Midnight Purple" |
| `forest`   | light | natural emerald & green on mint white | PEBI "Forest Green" |
| `frost`    | light | indigo glassmorphism on indigo-tinted white | PEBI "Frosted Glass" |
| `classic`  | light | professional neutral gray | PEBI "Classic Corporate" |

PEBI's orange `sunset` and luxury-gold `gold` themes are **intentionally NOT
imported** — the user explicitly dislikes orange/gold accents.

**Legacy persisted ids** (`indigo`, `emerald`, the interim `sunset`) fail the
registry check → resolved as invalid → OS default applied + stored value
overwritten (R4.5). No manual user reset required.

**Property tests still passing for all 9 themes:**
- Property 3 (token completeness) — every theme defines every `REQUIRED_TOKEN_KEYS`.
- Property 4 (WCAG AA contrast) — every theme: text-primary ≥ 4.5:1, accent-text ≥ 4.5:1, text-secondary ≥ 3:1, focus-ring ≥ 3:1 against `surface-raised`.

**Verified:** `npm run test` → **25/25 passed** · `npm run build` → green (CSS 74.65 kB / 13.67 kB gz, JS 905 kB / 263.3 kB gz; CSS grew ~6 kB due to 7 colorful theme scopes).

### Spec & docs reconciled

- `requirements.md` — R1.4 rewritten (Premium v2 reset acknowledged), R1.7 at 95%
- `design.md` — architecture diagram, ThemeId type, pre-paint script, registry block, **and all 9 per-theme token tables** updated with measured AA contrast
- `phase-1.5-premium.md` — Block E rewritten to describe 9 themes, OKLCH anchor table updated, ThemeId/THEMES code blocks updated, legacy-id migration list extended to include `sunset`
- `tasks.md` — 3.2 scope list updated to all 9 theme scopes; 22.2/22.3 reworked + new 22.3a for the 5 PEBI imports

### Premium v2 visuals carried over

- Violet gradient buttons with shine-sweep + glow shadow + scale press
- Cards with multi-layer shadow + accent ring on hover (translateY -4px spring)
- Sidebar: glowing logo tile, sliding accent indicator on active nav, labeled pill theme switcher (now lists 9 themes)
- Mobile chrome: glass `backdrop-filter` blur on header + bottom nav
- Auth screens: animated mesh-gradient background, drifting page-ambient blob
- Sparklines (Recharts) + spring-physics NumberTicker on every dashboard KPI
- Reusable `<EmptyState>` on Dashboard / EstimatesList / CustomersList
- Native View Transitions API on list → detail navigation
- Density toggle (Comfortable / Compact / Spacious) in Settings → General
- All motion reduced-motion guarded (media query + `data-reduced-motion` attribute + zeroed motion tokens)

### Foundation primitives (all wired, tested where pure)

```text
src/index.css                                    Token Layer (9 themes), reduced-motion CSS, view-transitions, component classes
src/tailwind.config.js                           Tokens → utilities (semantic + 12-step ramps + fluid type)
src/theme/registry.ts                            9 themes (2 base + 7 colorful)
src/theme/resolveTheme.ts                        Pure theme resolver  ✓ property-tested
src/theme/contrast.ts                            WCAG luminance + contrast  ✓ asserts in DEV
src/theme/ThemeProvider.tsx                      Context, pre-paint reconcile, OS-color-scheme follow
src/theme/ThemeSwitcher.tsx                      Settings full radio-group (auto-lists all 9 themes)
src/components/QuickThemeSwitcher.tsx            Sidebar/header labeled pill popover (auto-lists all 9 themes)
src/preferences/PreferenceStore.ts               Web + native (Capacitor) + sync localStorage mirror  ✓ property-tested
src/preferences/densityStore.ts                  Density persistence + resolver
src/hooks/useReducedMotion.ts                    matchMedia listener → data-reduced-motion sync
src/hooks/useEntrance.ts                         motion library spring
src/hooks/useStagger.ts                          --motion-stagger-step driven cascade
src/hooks/useViewTransition.ts                   document.startViewTransition wrapper
src/hooks/useDensity.ts                          Density preference React hook
src/motion/resolveMotionDurations.ts             Pure motion-mode resolver  ✓ property-tested
src/components/Overlay.tsx                       Portal + scrim + WAAPI + focus trap  ✓ property-tested
src/components/RouteTransition.tsx               Path-keyed cross-fade
src/components/NumberTicker.tsx                  motion library spring count-up
src/components/Sparkline.tsx                     Recharts area/line
src/components/EmptyState.tsx                    Reusable empty surface
src/components/Layout.tsx                        Chrome (sidebar/drawer/bottom nav) + RouteTransition
src/components/BottomSheet.tsx                   Built on <Overlay>
src/components/LaminationFormulaModal.tsx        Built on <Overlay>
src/components/TemplateBuilder.tsx               Built on <Overlay>
index.html                                       Pre-paint script (theme + density + reduced-motion, all 9 theme ids valid)
```

### Open follow-ups (optional, not blocking)

- [ ] Property test for `useDensity` resolution (Phase 1.5 Property 8)
- [ ] Property test for `NumberTicker` termination (Phase 1.5 Property 9)
- [ ] Shared-element view transitions (assign `view-transition-name` on list rows + detail headers)
- [ ] Optional regression suites in tasks.md (20.2 responsive/CLS; 20.3 skeleton failure path) — `*`-marked, lower priority
- [ ] Apply `useHoverSpring` to dashboard `StatCard` for physical-feeling hover

### Prior session work (still valid)

| Area | Status |
|------|--------|
| Bag configurator 2D | ✅ All 9 subtypes |
| Template ink controls | ✅ 4% column vertical `+▲▼✕`; structure lock = stack only |
| Engine SB/UV | ✅ Layer `isSolventBased`; 86 engine tests |
| Master Data Excel sync | ✅ All sheets → materials + reference API |

