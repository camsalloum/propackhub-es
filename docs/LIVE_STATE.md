# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-25 (template ink editing + fullscreen TemplateBuilder)
**Session focus:** Ink/coating on standard templates; TemplateBuilder fullscreen

---

## Where we stopped (read this first tomorrow)

### Done this session

| Area | Status |
|------|--------|
| **Template estimates — ink & coating** | ✅ Standard-template quotes stay locked for substrate/adhesive; user can add/remove/reorder ink & coating (e.g. varnish on top layer); family/grade editable for ink only |
| **TemplateBuilder** | ✅ Edit/create modal is full-screen (header + scroll body + sticky footer) |
| **Table alignment** | ✅ Family/Grade left + wider Family col; GSM/$ right-aligned; compact `cell-input` in cells |
| **Build-up legend** | ✅ 32px stack bar; labels evenly spaced; diagonal leaders to thin bands — no overlap |
| **Structure panel sync** | ✅ Table sets row height; build-up stretches to match; stack fills panel height |
| **FilmStackVisualizer** | ✅ White/light ink layers; µ scale left |
| **Structure UX** | ✅ One table (layers + solvents + $/kg + $/m² + Total); Film Structure + Layer build-up top row; **Selling Price / Cost Breakdown below** (no right sidebar) |
| **Lamination EA** — GP/MP/HP recipes + per-quote `laminationRecipeOverrides` | ✅ (prior session; still active) |
| **Estimate editor — compact solvent bar** | ✅ One row under layer table: Print Flexo/Roto, EA picker, $/kg, Clean kg |
| **Structure table — Solvents row** | ✅ Last row before footer; **+** expands ink makeup / lamination / cleaning with Cost/kg + Cost/m² |
| **Total RM footer** | ✅ Second footer row: total RM **$/kg** and **$/m²** (layers + all solvents) |
| **Cost breakdown sidebar** | ✅ **Total RM** with /kg and /m² (solvents included in `materialCostPerKg`) |
| **Engine RM fields** | ✅ `layerRmCostPerKg`, `layerRmCostPerM2`, `rmCostPerM2`, `solventMixCostPerM2`, per-component $/m² |
| **Visibility bug** | ✅ `getEffectiveProfile` merges role defaults — old profiles missing `solventMixCost` no longer hide UI |
| **PWA / dev** | ✅ Service worker registers **prod only**; unregisters in dev |
| **TemplateBuilder crash** | ✅ `export * from './template-scaffolding'` in `engine/index.ts` |
| **Tests** | ✅ Engine **75/75**; visibility merge test added |

### Key files (tomorrow)

```
packages/engine/src/
  ink-printing.ts          # flexo/roto defaults + makeup GSM
  solvent-costing.ts       # lamination EA + ink makeup + cleaning
  calculator.ts            # rmCostPerM2, layer vs solvent split
  types.ts                 # per-m² output fields

packages/web/src/pages/EstimateEditor.tsx
  # compact solvent bar, Solvents expandable table row, Total RM footer/breakdown
  # canConfigureSolvent = solventMixCost || markupPercent

packages/server/
  drizzle/0006_ink_printing_process.sql
  src/utils/visibility.ts  # profile merge + strip new m² fields
```

### Costing rules (locked for continuation)

1. **Layers** — user dry GSM; cost/m² = (dry_gsm/1000) × dry-equiv $/kg from library.
2. **Solvents (not a layer)** — EA $/kg from library; three lines when applicable:
   - **Ink makeup** — dry ink GSM ÷ ratio (flexo 1.5, roto 1.0); only SB ink stacks.
   - **Lamination EA** — from SB adhesive recipe (Formula on layer row).
   - **Press cleaning** — kg/job ÷ order kg (default 20 kg/job).
3. **Total RM** — `materialCostPerKg` = layers + solvents (used in markup/sale price).
4. **Total RM m²** — `rmCostPerM2` = sum(layer cost/m²) + `solventMixCostPerM2` (engine-native, not UI-derived).

### Not done / verify tomorrow

- [ ] **Save + reload** estimate: confirm `inkPrintingProcess`, solvent picker, cleaning kg persist and reload in editor.
- [ ] **PRD §7.3** — add short ink-makeup subsection (flexo/roto, RM table row); ES_MEMORY solvent section still mentions old 1:1 ratio in places — align docs.
- [ ] **Deployed DB** — run `0006` on any env that only has 0005 (local already migrated).
- [ ] **Integration tests** — server tests for new engine output fields optional.
- [ ] **User polish** — confirm compact bar + expandable row UX on real quotes (e.g. Commercial Items Printed, bag + PE + SB ink).
- [x] **Solvent Cost/m² = 0.0000** — fixed: use `usdToDisplayPrecise` for all cost/m² columns (values ~0.002 were rounded away by `usdToDisplay`).
- [ ] SC-7/SC-8 from SAVE_AND_CALCULATE audit still open.

---

## Architecture (unchanged)

- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`
- **Migrations:** 0000–**0006** applied locally
- **Engine tests:** 75/75 ✅

---

## Transcript

Full agent chat: parent workspace agent-transcripts — search `ink phase 2`, `solvent`, `rmCostPerM2`, `canConfigureSolvent`.
