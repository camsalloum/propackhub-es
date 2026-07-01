# Estimation Studio — Session Handoff

Working session recap for the ES UI revamp + pricing‑model‑v2 work. Build state at
handoff: **engine 169 tests pass, web `tsc --noEmit` clean**, engine `dist` rebuilt.

---

## 1. How to run / verify after reopening

```
# from apps/estimation-studio
npm run start:servers:dev      # rebuilds @es/engine, applies db patches, starts api(:5001)+web(:5000)
# login: admin@propackhub.com / Pph654883!
```

- **Always restart the API** after pulling this work so it loads the rebuilt engine
  `dist` and the new auth payload. The web live‑calc uses the engine via a `src`
  alias, so the on‑screen numbers update without a rebuild, but the server's
  persisted `/calculate` snapshot and `/auth` need the restart.
- **Hard‑reload the browser** (Ctrl+Shift+R) after HMR‑heavy edits.

Type checks: `packages/engine` → `npm test`; `packages/web` → `npx tsc --noEmit -p tsconfig.json`.

---

## 2. What was delivered this session

### A. Estimate flow / save UX
- **Cancel never saves a draft.** Back/Cancel just navigates; only "Save draft" /
  "Save" persist. (`EstimateEditor.handleCancel`)
- **Recalc‑on‑save.** After update/create, the server `/calculate` runs so the
  persisted snapshot (and PDF) match the live price. The standalone "Calculate"
  button was removed — pricing is live.
- **New‑estimate chooser** at `/estimate/choose` (`EstimateStart.tsx`): "From a
  template" (structure‑locked) vs "From scratch" (full edit). All "New estimate"
  buttons now point here. Legacy `TemplatePicker.tsx` deleted.
- **Template lock persists.** `sourceTemplateKey` is now sent on save and stored
  server‑side, so a template estimate stays structure‑locked after saving (was
  unlocking before).

### B. Structure table / layers
- **Move up/down arrows removed** everywhere; reordering is **drag‑only** with a
  clearer grip handle + an inline "Drag the handle to reorder" hint.
  (`EstimateEditor`, `LayerCard.tsx`)
- **Header alignment fixed** (Family/Grade left, GSM/$/kg/$/m² right) + uniform
  decimals.

### C. Production Summary (formerly "Web Totals")
- Compact panel: **Yield Factors** (m²/kg, LM/kg, pcs/kg, g/piece, thickness, GSM,
  density) then **Order Totals** (kg, pcs, m², LM), all live, USD base, LM =
  finished reel length. Amber hint when pieces/LM need product dimensions.

### D. Pricing model v2 (the big one)
New cost build‑up (per kg, USD base), all live:
```
wasteAdjMaterial = material × (1 + bandWaste%/100)        # band from ORDER QTY
costBase         = wasteAdjMaterial + accessory + logistics + development
margin           = markup% × costBase  OR  fixed marginValuePerKgUsd
salePricePerKg   = costBase + margin
```
- **Quantity‑band waste** (`packages/engine/src/waste-bands.ts`): global bands
  0–80 … 100,000+. **Editable** in the slab tab (admin/manager), seeded with
  defaults, persisted per estimate (`estimates.waste_bands` jsonb).
- **Tooling (development) + delivery** are lump sums amortized over the entered
  order quantity. Entered as plain fields **below the dimensions** in Job details
  (no "customer pays" toggle, no captions — removed per user). Tooling adds when
  charge > 0.
- **Two pricing methods**, selectable in **Costs & Terms** tab: **Markup %** or
  **Margin per kg** (USD/kg). Margin/kg defaults from the **template's** margin.
- **Operation/process cost removed** from the ES sale price (deferred to MES).
- **Slab tab = waste‑band ladder**: table of every band (0–100,000), Waste %,
  Price/kg, with the order's band highlighted.
- **Cost breakdown** shows explicit Material / Waste / Tooling / Logistics / Margin
  lines + bars.
- **Backward compatible:** estimates with no `pricingMethod` use the legacy
  additive formula. Opening an existing estimate adopts the user's method (agreed
  migration; tooling/delivery reset to 0, waste becomes band‑based).
- **Per‑user pricing method**: `users.pricing_method` column (default `markup`),
  returned by `/auth`, defaults new estimates. Admin assignment UI = TODO.
- **Notes field removed** from Job details (DB column kept for MES; existing notes
  preserved — payload omits it).

### E. Flexo/Roto solvent (multiplier model — updated 2026‑06‑30)
- The ink‑makeup solvent is now a **multiplier**: `makeup GSM = dry ink GSM × ratio`,
  with **flexo = 1.0** and **roto = 2.0** (1 vs 2 parts solvent per part ink; roto
  consumes more). Constants in `engine/src/ink-printing.ts`; the live ratio field
  (`÷`/`×` box) is still the per‑estimate bypass.
- Earlier save/load bug also fixed: the ratio is persisted **only when the user
  types a custom value**; standard ratios are treated as process‑derived so the
  Flexo/Roto toggle keeps driving the formula.
- Golden fixtures (`golden-fixtures.ts`) updated for the 3 SB‑ink rows to match the
  new formula; all 169 engine tests pass.

### F. Diagnostics
- `/estimates/:id` (update) and `/templates/:id/instantiate` now return a `detail`
  field on 500s, and the client surfaces it — so opaque "Failed to save/instantiate"
  errors now show the real cause.

---

## 3. Files touched

**engine/** `src/waste-bands.ts` (new), `src/calculator.ts`, `src/types.ts`,
`src/index.ts`, `src/pricing-model.test.ts` (new), `src/ink-printing.ts` (flexo/roto
multiplier), `src/ink-printing.test.ts`, `src/golden-fixtures.ts` (SB‑ink rows).
`dist/` rebuilt.

**server/** `scripts/schema-patches.sql`, `src/db/schema.ts`,
`src/routes/estimates.ts`, `src/routes/templates.ts`, `src/routes/auth.ts`,
`src/utils/visibility.ts`, `src/utils/estimate-engine-input.ts`.

**web/** `src/pages/EstimateEditor.tsx` (major), `src/pages/EstimateStart.tsx` (new),
`src/components/TemplateBuilder.tsx`, `src/components/LayerCard.tsx`,
`src/components/JobHeaderFields.tsx`, `src/lib/estimateCalc.ts`, `src/lib/api.ts`,
`src/hooks/useAuth.ts`, `src/App.tsx`, `src/pages/{StandardTemplates,EstimatesList,Dashboard,CustomersList,CustomerDetail}.tsx`,
`src/components/Layout.tsx`. Deleted `src/pages/TemplatePicker.tsx`.

**DB columns added** (idempotent, via `npm run db:patch`):
- `estimates`: `pricing_method`, `margin_value_per_kg_usd`, `tooling_charge_usd`,
  `tooling_billed_to_customer`, `delivery_term`, `delivery_charge_usd`, `waste_bands`.
- `structure_templates`: `margin_over_rm_per_kg_usd`.
- `users`: `pricing_method` (default `markup`).

---

## 4. OPEN / pending (decisions needed)

1. **Global waste‑band defaults in Master Data.** Waste % is now editable
   per‑estimate (seeded from engine defaults, persisted in `estimates.waste_bands`).
   A tenant/platform‑level default editor (set bands once for everyone) is a follow‑up.
2. **Admin UI to assign `users.pricing_method`** per user (column + flow exist; no UI).
3. **Slab ladder in the selected order unit** — currently shows kg ranges; user
   wanted quantities in the chosen unit (Kpcs/m²/LM). Quick follow‑up.
4. **Proposal/PDF** — not yet updated for the new breakdown line items.
5. **Pre‑existing server type errors (NOT from this work, 10 total):**
   `templates.ts` (ref.label, materialId null ×2, resolveOwnership unused),
   `proposal-pdf.ts` (×4), 2 test files. Unrelated; left as‑is.

### Resolved this session
- **Roto solvent:** multiplier model confirmed — flexo 1.0, roto 2.0, `makeup = ink × ratio`.
- **Editable waste %:** editable inputs in the slab tab, defaults preloaded, persisted.

---

## 5. Notes
- All monetary engine values are **USD base**; the UI converts to display currency.
- LM everywhere = **finished reel running length** (`linearMPerKgReel`).
- Live calc lives in `EstimateEditor.clientCalcResult` (useMemo) →
  `lib/estimateCalc.runClientCalculation` → `@es/engine` (src alias).
