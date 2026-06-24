# Estimation Studio — Save / Save & Calculate Audit

**Date**: 2026-06-22  
**Scope**: Estimate editor save flow, PATCH/POST endpoints, calculation pipeline, FX handling.  
**Files audited**:
- `packages/web/src/pages/EstimateEditor.tsx`
- `packages/web/src/lib/api.ts`
- `packages/web/src/lib/estimateConfigure.ts`
- `packages/web/src/lib/currency.ts`
- `packages/server/src/routes/estimates.ts`
- `packages/server/src/services/estimate-calculation.ts`
- `packages/server/src/utils/layer-lineage.ts`
- `packages/server/src/utils/currency.ts`
- `packages/server/src/db/schema.ts`
- `packages/engine/src/calculator.ts`

---

## 1. Executive summary

The Save flow is architecturally correct on the happy path: edits to `layers[].micron`, `layers[].costPerKgUsd`, dimensions, slabs, markup, and processes are tracked in component state, packaged by `buildSavePayload`, and sent via `PATCH /api/v1/estimates/:id`. On the server, the PATCH wraps layer/process/slab delete-and-reinsert in a single transaction.

However, this audit found **17 distinct bugs and gaps** clustered around save and calculate. Five of them are **high severity** and directly explain the symptom "I change figures and they don't save":

1. **Slab `pricePerKg` is overwritten with display-currency values on every Calculate**, causing prices to drift by the FX rate after each save (P0 for any non-USD tenant).
2. **`createEstimateRoute` silently strips `solventCostPerKgUsd`, `solventRatio`, `productSubtype` — and never persists per-layer `unitCostSnapshotUsd`** on first save.
3. **The PATCH endpoint never validates the body against `EstimateCreateSchema`**; mistyped/extra fields are silently accepted and partially ignored.
4. **Save & Calculate aborts silently on Structure validation errors** (e.g., a temporarily empty µ field) — no toast, no draft save, all unrelated edits in the form are lost.
5. **Save & Calculate destructively overwrites manual slab price overrides** with engine-computed prices, with no opt-out.

The remaining items are correctness gaps (Cancel doesn't detect dirty layers, mobile sticky button mislabeled, structure-lock partially implemented) and architecture gaps (no schema validation on PATCH, no idempotency, error handling collapsed into `alert()`).

---

## 2. Save / Save & Calculate flow — what happens today

```
User types in field
  │
  ▼
setLayers / setSlabsState / setDimensions / set<Field>   (React state)
  │
  ▼
clientCalcResult useMemo recomputes (engine in-process, USD)
  │
  ▼
useEffect mirrors result into estimate / layers.gsm / slabsState
  │
  ▼  (user clicks Save or Save & Calculate)
persistEstimate(andCalculate)
  │
  ├─ if andCalculate: validateConfiguredEstimate()
  │     ├─ layers[].micron <= 0     → alert + RETURN (no save)            ← BUG SC-2
  │     └─ dimensions invalid       → confirm → persistEstimate(false)
  │
  ├─ buildSavePayload()
  │
  ├─ if estimate.id:
  │     PATCH /api/v1/estimates/:id          (tx: estimates → layers ↔ slabs ↔ processes)
  │   else:
  │     POST  /api/v1/estimates              (no tx; solvent/subtype/cost-override DROPPED)
  │     navigate(/estimate/:newId)           (forces useEffect re-fetch)
  │
  ├─ setEstimate(prev => ({ ...prev, ...saved }))   (saved has no nested layers)
  │
  └─ if andCalculate && saved.id:
        POST /api/v1/estimates/:id/calculate
          ├─ engine.calculateEstimate()                  (USD)
          ├─ db.update(layers).set(unit_cost_snapshot)   ✓
          ├─ db.update(estimates).set(totals, salePrice) ✓
          └─ db.update(slabs).set(pricePerKg = USD * fx) ← BUG SC-1
        applyCalculationResult(...)                      (treats USD * fx as USD)
```

---

## 3. High-severity bugs (P0 / P1)

### 🔴 SC-1 · FX double-conversion on slab `pricePerKg` after Calculate

**File**: `packages/server/src/services/estimate-calculation.ts` (~lines 130–165)  
**Severity**: P0 for non-USD tenants. Silent for USD tenants.

The engine returns slab `pricePerKg` in **USD**. The service then converts each slab to display currency for the API response, but **persists the display-currency value back into `slabs.pricePerKg`** — a column the rest of the codebase (and `createEstimateRoute`) treats as USD.

```ts
// estimate-calculation.ts (current)
const slabsWithDisplay = result.slabs.map(slab => {
  const pricePerKgDisplay = usdToDisplay(slab.pricePerKg, fxRate);   // USD * fx
  return { ...slab, pricePerKgDisplay, totalDisplay: ... };
});
...
await db.update(schema.slabs)
  .set({ pricePerKg: calcSlab.pricePerKgDisplay.toString() })        // ← stored as display
  .where(eq(schema.slabs.id, dbSlab.id));
```

On reload, the editor reads it back assuming it's USD and converts again:

```ts
// EstimateEditor.tsx fetchEstimate
const usd = parseFloat(s.pricePerKg) || 0; // server always stores USD ← false after Calculate
const display = usdToDisplay(usd, fx);     // applies fx a second time
```

**Effect**:
- USD tenant (`fx = 1`): no visible damage, prices look right.
- EUR tenant (`fx ≈ 0.92`): prices drift ~8% low after each Save & Calculate.
- INR tenant (`fx ≈ 83`): displayed slab price = `USD × 83²` ≈ 6,900× too high. After one Calculate the slab table looks "broken".

The engine ignores the input slab `pricePerKg` (it recomputes from material cost + markup + processes), so the drift doesn't compound across multiple Calculates — but a single Calculate is enough to make a non-USD tenant report "save isn't working".

**Fix**: persist the engine's USD value verbatim and only convert at the response/PDF boundary.

```ts
// fix
await db.update(schema.slabs)
  .set({ pricePerKg: slab.pricePerKg.toString() }) // engine value, USD
  .where(...);
```

The `result.slabs` returned to the caller can stay USD; the editor already calls `usdToDisplay` once on the wire. Update `apiClient.calculateEstimate` consumers in `applyCalculationResult` to read `s.pricePerKg` as USD, which they already do.

**Related**: PRD audit `SESSION_LOG.md` already lists "calculate slabs bug" and "1 failing integration test (slab pricePerKg=0)" from 2026-06-18. This is the same family.

---

### 🔴 SC-2 · `createEstimateRoute` drops solvent config, productSubtype validation, per-layer cost overrides

**File**: `packages/server/src/routes/estimates.ts` (`createEstimateRoute`, ~line 160–280) and `EstimateCreateSchema` (~line 31).  
**Severity**: P1 — affects every newly created estimate.

The Zod schema does not declare `solventCostPerKgUsd`, `solventRatio`, or other fields that the client always sends. Zod's default behavior strips unknown keys, so on POST these arrive but are then silently discarded before `db.insert(...)`:

```ts
// EstimateCreateSchema — missing fields:
//   solventCostPerKgUsd, solventRatio
const data = EstimateCreateSchema.parse(request.body);   // ← strips them
```

Then the insert call also doesn't pass them:

```ts
.values({
  ..., dimensions, markupPercent, platesPerKg, deliveryPerKg,
  status: 'draft', orderQuantityKg, orderQuantityUnit,
  // no solventCostPerKgUsd, no solventRatio
});
```

Per-layer `unitCostSnapshotUsd` is in the schema but the insert loop ignores it:

```ts
// createEstimateRoute layer loop (current)
buildLayerInsertValues({
  estimateId: estimate.id,
  materialId: layer.materialId,
  micron: layer.micron,
  position: layer.position,
  material: mat ? toMaterialLineageSource(mat) : null,
  // ← unitCostOverrideUsd not passed — first-save cost overrides are LOST
})
```

PATCH passes `unitCostOverrideUsd: layer.unitCostSnapshotUsd ?? null`. POST doesn't.

**Effect**:
1. User opens an estimate from a template, types a custom `Cost / Kg` override on a layer, clicks Save. The estimate is created via POST → navigate → re-fetch. On re-fetch the cost reverts to the library price. User says "Cost/Kg didn't save."
2. User configures solvent mix cost (`Solvent Mix` panel). Saves. Solvent values discarded → engine falls back to the hardcoded defaults `2.0` / `0.5` (`calculator.ts: calculateSolventMix`). Material cost is wrong on the first Save & Calculate of any new estimate.
3. `productSubtype` is in the schema but the URL `?type=` parameter and template instantiation often produce subtype values; if the value is more than 64 chars (some external IDs are), Zod throws and the whole save 400s — masked by the generic `Save failed: Validation failed` toast.

**Fix**:
- Add `solventCostPerKgUsd`, `solventRatio` to `EstimateCreateSchema` (both `z.number().nonnegative().optional()`).
- Pass them to the `db.insert(schema.estimates).values({...})` call.
- Pass `unitCostOverrideUsd: layer.unitCostSnapshotUsd ?? null` in the create-layer loop.

---

### 🔴 SC-3 · PATCH `/api/v1/estimates/:id` never validates the body

**File**: `packages/server/src/routes/estimates.ts` (`updateEstimateRoute`, ~line 427)  
**Severity**: P1 — silent partial saves.

The route is type-annotated as `Body: Partial<z.infer<typeof EstimateCreateSchema>>` but **never calls `.parse()` and Fastify has no `schema:` attached**. The body is consumed via raw `if (request.body.X !== undefined)` checks. Result:

- A typo in a client-sent key (e.g. `markUpPercent`) is silently ignored — no 400, no log, no error toast. User sees Save success and assumes it worked.
- Out-of-domain values (negative micron, NaN, strings) pass straight through to `db.insert(layers).values({...})`. Postgres may accept the cast (`micron` is `decimal(10,2)`), storing nonsense.
- The whole audit trail can be skipped with `note: "<huge string>"` because there's no length cap.

**Fix**: parse with the schema in `Partial` mode:

```ts
const data = EstimateCreateSchema.partial().parse(request.body);
// then use `data` instead of `request.body` everywhere below
```

Add a Zod `.refine()` that requires at least one updatable field. Add Fastify-level `schema:` so 400s are returned with `error: { code: 'VALIDATION', ... }` envelopes (matching the api.ts client).

---

### 🔴 SC-4 · Save & Calculate silently aborts and discards all field edits when validation fails

**File**: `packages/web/src/pages/EstimateEditor.tsx` (`persistEstimate`, ~line 618)  
**Severity**: P1 — easy to trigger, high frustration.

```ts
const persistEstimate = async (andCalculate: boolean) => {
  if (saving) return;
  if (andCalculate) {
    const validationError = validateConfiguredEstimate({ layers, productType, dimensions });
    if (validationError) {
      if (validationError.includes('Dimensions') || ...) {
        if (!window.confirm(`${validationError}\n\nSave structure changes without calculating?`)) return;
        return persistEstimate(false);
      }
      alert(validationError);
      if (validationError.includes('Structure')) setActiveSection('structure');
      return;                        // ← BAILS WITHOUT SAVING ANYTHING
    }
  }
  setSaving(true);
  ...
};
```

Repro:
1. Open an estimate.
2. Edit markup, dimensions, cost/kg, slab quantities.
3. Click into a µ field, hit `Backspace` to clear it, intending to type a new value.
4. While the field is empty, click **Save & Calculate**.
5. Alert says "Set thickness (µ) for every layer in Structure." → click OK.
6. Editor returns to Structure tab. **Every other change you made is still in component state and unsaved**. If the user navigates away (or refreshes), the work is gone.

Plain Save bypasses validation entirely (SC-5).

**Fix**: when validation fails on Save & Calculate, persist a draft (no calculate) and surface the validation error as a non-blocking inline notice instead of `alert()`. Don't `return` without saving.

---

### 🔴 SC-5 · Plain "Save" button skips all validation, persists `micron = 0`

**File**: `EstimateEditor.tsx` (`handleSaveDraft`, `persistEstimate(false)` path)  
**Severity**: P2 — corrupts data, then SC-1's downstream effects compound.

`validateConfiguredEstimate` only runs when `andCalculate === true`. The plain Save button calls `persistEstimate(false)`, which sends `layers[].micron = 0` (or NaN if the input is blank, because `Number('') === 0`) without complaint. PATCH has no Zod parse (SC-3), so the server stores `0`. Subsequent Calculates compute `gsm = 0`, `materialCostPerKg = 0`, `salePricePerKg = 0`. The editor shows `0.00 /kg` and the "live preview" sidebar reads "Save & Calculate to refresh" indefinitely.

**Fix**: run `validateConfiguredEstimate` on Save too. Show inline field errors. Don't block the save outright — just block fields with `<= 0` from being included in the payload, or short-circuit with an explicit confirm.

---

## 4. Medium-severity bugs (P2)

### 🟡 SC-6 · Save & Calculate destroys manual slab price overrides

**File**: `packages/server/src/services/estimate-calculation.ts`  
**File**: `packages/engine/src/calculator.ts` (`slabsWithTotals`)

The engine ignores `slab.pricePerKg` from the input and recomputes every slab's price from material cost + markup + per-slab process cost:

```ts
const slabsWithTotals = estimate.slabs.map(slab => {
  ...
  const slabSalePricePerKg = calculateSalePrice(...);
  return { ...slab, pricePerKg: slabSalePricePerKg, total: ... };
});
```

The service then writes that recomputed value to the DB (modulo SC-1).

The editor allows inline editing of slab `Price/kg`, suggesting an override is supported. It isn't — the next Save & Calculate replaces it. Sales reps cannot honor a manually agreed slab price.

**Fix options**:
- Add `slabs.pricePerKgOverride` (nullable). When set, engine returns that value verbatim and the markup section shows a "manual" badge.
- Or: drop the slab price input from the editor entirely; the slab table becomes read-only after Calculate.

The user expectation should be one or the other — currently the UI lies.

---

### 🟡 SC-7 · Cancel button doesn't detect layer / dimension / markup edits

**File**: `EstimateEditor.tsx` (`handleCancel`)

```ts
const leaving =
  needsConfiguration ||
  jobName.trim() !== (estimate?.jobName || '').trim() ||
  customerId !== (estimate?.customerId || '');
```

A user who changed micron, cost, dimensions, slabs, or markup but didn't touch jobName/customerId will leave without a confirm prompt and lose the changes. The "Your draft stays in the estimates list" copy implies there's an autosave — there isn't.

**Fix**: track a dirty flag derived from a deep diff against the loaded snapshot (or a simple `isDirty` ref toggled by every set call), and gate the prompt on it.

---

### 🟡 SC-8 · Cleared `Cost / Kg` reverts to library price on save (override drop is silent)

**File**: `EstimateEditor.tsx` `buildSavePayload` and `server/src/utils/layer-lineage.ts`

```ts
// buildSavePayload (web)
unitCostSnapshotUsd: l.costPerKgUsd > 0 ? l.costPerKgUsd : undefined,
```

```ts
// buildLayerInsertValues (server) — always spreads snapshotsFromMaterial
const base = {
  ...,
  ...(args.material ? snapshotsFromMaterial(args.material) : {}),  // sets unit_cost_snapshot_usd to library price
};
if (args.unitCostOverrideUsd != null) {
  (base as any).unit_cost_snapshot_usd = String(args.unitCostOverrideUsd); // overrides only if > 0
}
```

If the user clears the cost field intending "no cost yet", the override is sent as `undefined`, the server falls back to library price, and on reload the field shows the library price. The cleared state is unreachable — even after the user explicitly typed `0`.

**Fix**: send `unitCostSnapshotUsd: l.costPerKgUsd >= 0 ? l.costPerKgUsd : null`, and on the server treat `null` as "drop snapshot". Add a sentinel ("library default" badge) when no override is set.

---

### 🟡 SC-9 · `setEstimate({ ...prev, ...saved })` keeps stale joined arrays after PATCH

**File**: `EstimateEditor.tsx` (`persistEstimate` after PATCH)

PATCH returns the bare `estimates` row. The merge keeps `prev.layers`, `prev.slabs`, `prev.processes`, `prev.activityLogs` from the initial fetch — but the server has already deleted-and-reinserted layers/slabs/processes with new UUIDs.

Direct visible bug: the **Activity panel** in the right sidebar (`estimate.activityLogs`) still shows the pre-save state until a full reload. The proposal history section is also driven from a separate fetch and is correct, but the activity log mismatch will surface in audit reviews.

The `layers` state is the source of truth in the UI, but anything reading `estimate.layers` (e.g. proposal preview, requote diff in the future) will see stale data.

**Fix**: re-issue `apiClient.getEstimate(saved.id)` after a PATCH and replace `estimate` with the fresh row, rather than merging.

---

### 🟡 SC-10 · `structureLocked` is incomplete — Family/Grade dropdowns and µ input remain editable

**File**: `EstimateEditor.tsx` desktop table render

`structureLocked` (driven by `estimate.sourceTemplateKey`) only hides the Add-layer / Remove / Reorder controls. The Family `<select>`, Grade `<select>`, µ input, and Cost/Kg input have no `disabled={structureLocked}` and remain interactive. A user can switch a substrate from PE to PET in a "locked" template estimate, defeating the lock.

**Fix**: gate every editable input on `!structureLocked` (or read the visibility profile) and show a small "Locked from template" badge near the table header. Admins should still be able to override via a secondary action; current code grants admins no special path.

---

### 🟡 SC-11 · Mobile sticky Save button calls Save & Calculate

**File**: `EstimateEditor.tsx` mobile bottom bar

```tsx
<button onClick={handleSaveAndCalculate} ...>
  {saving ? 'Saving...' : 'Save'}
</button>
```

Label says "Save". Action runs the full validate + save + calculate pipeline. Inconsistent with desktop where Save and Save & Calculate are deliberately separate. Mobile users who want to save a draft on a partially configured estimate get blocked by SC-4.

**Fix**: rename the mobile button "Save & Calc" to match desktop, or add a kebab menu with "Save draft" alongside.

---

### 🟡 SC-12 · Auto-calculate on load swallows errors

**File**: `EstimateEditor.tsx` `fetchEstimate`

```ts
if (!fromTemplate && (!data.salePricePerKg || parseFloat(data.salePricePerKg) === 0)) {
  try {
    const result = await apiClient.calculateEstimate(estimateId);
    applyCalculationResult(data, result);
  } catch (calcErr) {
    console.warn('Auto-calculate skipped:', calcErr);
  }
}
```

If the auto-calculate fails (missing material, server 500), the user sees a draft with `0.00 /kg` salePrice and no indication that something went wrong. The "Save & Calculate to refresh" microcopy is unhelpful because clicking it will also fail with the same error.

**Fix**: surface a banner (the existing `loadError` banner already exists) when the auto-calc fails, with the engine's `MissingMaterialsError.materialIds` listed inline.

---

### 🟡 SC-13 · Slab `quantityKg` change updates `total` from display price but never `pricePerKgUsd`

**File**: `EstimateEditor.tsx` slabs table inputs

```tsx
onChange={(e) => { const v = Number(e.target.value);
  setSlabsState(prev => prev.map((s, i) =>
    i === index ? { ...s, quantityKg: v, total: v * s.pricePerKg } : s
  )); }}
```

`s.pricePerKg` is the display value; `s.pricePerKgUsd` is the canonical USD value used by `buildSavePayload`. Changing only quantity recomputes the `total` but leaves `pricePerKg` and `pricePerKgUsd` in their previous state, which is fine — but it also leaves a stale `total` display when the user changes `quantityKg` while `pricePerKgUsd` was set by the engine and `pricePerKg` reflects the old display rate. After a currency change in tenant settings, slab totals will show wrong rounding.

**Fix**: derive `total` in render rather than in state, or always recompute `total = quantityKg * pricePerKg` at render time.

---

## 5. Lower-severity gaps (P3)

| # | File | Gap |
|---|------|-----|
| SC-14 | `estimate-calculation.ts` | `await db.insert(schema.estimationCosts).values({ breakdownJson: JSON.stringify(...) })` runs outside any transaction with the slab/layer updates. If the snapshot insert fails, slabs already have the wrong (display-currency) value persisted (see SC-1). |
| SC-15 | `estimates.ts` | `createEstimateRoute` runs `db.insert(estimates) → for layers → for processes → for slabs` without a transaction. A network drop mid-loop leaves an estimate with partial children. PATCH already uses `db.transaction`; POST should too. |
| SC-16 | `estimates.ts` | `requoteEstimateRoute` and `duplicateEstimateRoute` (lines 700+ and 892+) repeat the same insert pattern as POST, so SC-2 (dropped solvent + cost overrides) recurs there. |
| SC-17 | `EstimateEditor.tsx` | `clientCalcResult` `useEffect` `setLayers` writes `gsm` but the deps array `[clientCalcResult, estimate?.exchangeRateUsdToDisplay]` doesn't include `layers`. With React 18 concurrent rendering this is an obvious lint warning and a potential out-of-order update if multiple state changes race. The current code only reads `prev` so it's safe-ish, but a lint exception should be documented. |
| SC-18 | `EstimateEditor.tsx` | All errors render via `alert()` and `console.error()`. There's no toast system — users cannot copy the message, accessibility tooling sees a modal mid-flow, and offline saves use `localStorage.setItem('offlineDraft:...')` with no UI to recover them. |
| SC-19 | `api.ts` | The 401 path doesn't auto-refresh the token. If the access token expires while the editor is open, the next Save returns 401 and the user sees "API error: 401" with no retry. Refresh-token flow exists (`refreshToken()`) but isn't wired into the request loop. |
| SC-20 | Schema | `schema.estimates.solventCostPerKgUsd` and `solventRatio` exist in the DB but `EstimateCreateSchema` doesn't, so they're stripped on POST (SC-2 root cause). |

---

## 6. The reported symptom — root-cause attribution

> "Whenever I change some figures in the variable fields it is not saved."

The most likely chain, given the screenshot shows a USD tenant on a template-instantiated estimate:

| Field changed | Path | Why it appears "not saved" |
|---|---|---|
| µ (Value) on a layer | µ field cleared mid-edit, then Save & Calculate clicked | **SC-4** aborts silently. No error visible because the alert fires after the click and the user dismisses it. |
| Cost / Kg on a new estimate | Type override → Save → POST → re-fetch | **SC-2** — POST drops `unitCostSnapshotUsd`, fetch returns library price. |
| Cost / Kg cleared to 0 | Save → reload | **SC-8** — server defaults back to library price; cleared state is unreachable. |
| Slab Price/kg manually edited | Save & Calculate | **SC-6** — engine recomputes and overwrites. |
| Slab Price/kg on non-USD tenant | Single Calculate | **SC-1** — DB now contains `USD × fx`, displayed as `USD × fx²`. |
| Family or Grade dropdown on a template estimate | Save | **SC-10** — change is allowed, then on reload the activity log says "no edits detected" because the template lock isn't enforced server-side either. |
| Markup / Plates / Delivery | Click Save & Calculate while a layer's µ is empty | **SC-4** swallows the entire save. |
| Anything else, then Cancel | **SC-7** — Cancel doesn't see the dirt, leaves silently. |

For the screenshot specifically (USD tenant, two layers with non-zero values, template-locked structure), the most probable scenario is a combination of **SC-4 + SC-7**: user clears a value mid-edit to retype it, clicks Save & Calculate, gets the alert, dismisses, then continues editing other fields. When they later navigate away the browser doesn't warn (SC-7) and the work is gone.

---

## 7. Plan — fix order and grouping

**Phase 1: stop the bleeding (P0/P1)**

1. **SC-1** — fix slab persistence in `estimate-calculation.ts`. Persist USD; convert at the response/PDF boundary only. Add a regression test asserting `db.slabs.pricePerKg` is unchanged-ish after Calculate when fxRate ≠ 1.
2. **SC-2** — extend `EstimateCreateSchema` to include `solventCostPerKgUsd`, `solventRatio`. Pass them and `unitCostOverrideUsd` to the layer insert in `createEstimateRoute`, `requoteEstimateRoute`, `duplicateEstimateRoute`.
3. **SC-3** — call `EstimateCreateSchema.partial().parse(request.body)` at the top of `updateEstimateRoute` and use the parsed object thereafter. Update tests.
4. **SC-4** — in `persistEstimate`, when `andCalculate` validation fails for "Structure", first persist a draft (no calculate), then show an inline non-blocking notice. Never return without saving when the user already has unsaved changes.

**Phase 2: correctness around overrides (P1/P2)**

5. **SC-5** — run `validateConfiguredEstimate` on plain Save too; allow saving but mark fields with `<= 0` as draft-incomplete via a banner.
6. **SC-6** — pick one of: persist `slabs.pricePerKgOverride` (preferred) or make slab Price/kg read-only after Calculate.
7. **SC-8** — round-trip cost overrides faithfully, including `0`. Use a sentinel (`null` vs `undefined`) instead of `> 0` checks.

**Phase 3: UX hygiene (P2/P3)**

8. **SC-7** — track an `isDirty` flag and gate `handleCancel`'s confirm on it.
9. **SC-9** — re-fetch the estimate after a successful PATCH instead of merging stale arrays.
10. **SC-10** — wire `disabled={structureLocked}` on every editable input, with an admin escape hatch.
11. **SC-11** — rename mobile button to match its action.
12. **SC-12** — surface auto-calculate failures via the existing `loadError` banner; include `MissingMaterialsError.materialIds`.
13. **SC-18 / SC-19** — replace `alert()` with a toast system; wire token refresh into `request()`.

**Phase 4: structural cleanup (P3)**

14. **SC-15 / SC-16** — wrap POST/duplicate/requote inserts in transactions to match PATCH.
15. **SC-13 / SC-17** — derive slab `total` at render; document `useEffect` deps consciously or fix.

---

## 8. Suggested verification steps after fixes

- Add a Vitest test in `packages/server/src/test/auth-estimates.integration.test.ts` covering:
  - POST with `solventCostPerKgUsd: 1.85` → GET returns `1.85`.
  - POST with a layer carrying `unitCostSnapshotUsd: 2.20` → GET layer has snapshot `2.20`.
  - POST → calculate → GET — slab `pricePerKg` stays equal to engine's USD output (within a tolerance) regardless of `tenant.exchangeRateUsdToDisplay`.
  - PATCH with an unknown key → 400 with `error.code === 'VALIDATION'`.
- Add a property-based test (fast-check) on `calculateAndPersistEstimate`: round-trip stability — a second Calculate on an unchanged estimate should not mutate `slabs.pricePerKg` more than ε.
- Manual smoke for the editor: micron 25 → 30 → Save → reload → assert 30 visible. Repeat with Family change, Cost/Kg override, slab quantity, markup. Run on both a USD tenant and an INR tenant (`scripts/wait-api-health.bat` then seed an INR tenant locally).

---

## 9. Inventory — what's healthy

For balance, the following are working as designed and should not be churned:

- The PATCH transaction for layers/slabs/processes (`db.transaction` in `updateEstimateRoute`) is correct and atomic. Earlier audit notes (`BUG-1: full fix`) are honored.
- The visibility profile stripping (`stripEstimateRow`, `stripCalculationResult`) cleanly enforces field-level RBAC server-side.
- The engine's calc formulas (`calculator.ts`) match `COSTING_NOTES.md` and have golden fixtures.
- `derivePrintingWebClass` is deterministic and shared between client and server (`@es/engine`), so the wide_web/narrow_web badge in the editor matches what's persisted.
- Network errors surface a typed error (`code === 'NETWORK'`) from `api.ts` — the only place where the user actually sees a meaningful failure.
- The refresh-token mechanism, token store abstraction, and Capacitor-native API base resolution are clean.

---

## 10. Appendix — exact line references

| Bug | File | Anchor |
|---|---|---|
| SC-1 | `packages/server/src/services/estimate-calculation.ts` | `await db.update(schema.slabs).set({ pricePerKg: calcSlab.pricePerKgDisplay.toString(), ... })` |
| SC-2 | `packages/server/src/routes/estimates.ts` | `EstimateCreateSchema = z.object({...})` and `createEstimateRoute` insert block |
| SC-3 | `packages/server/src/routes/estimates.ts` | `async function updateEstimateRoute(...)` — no `EstimateCreateSchema.partial().parse()` |
| SC-4 | `packages/web/src/pages/EstimateEditor.tsx` | `const persistEstimate = async (andCalculate: boolean)` — `return;` after `alert(validationError)` |
| SC-5 | same | `const handleSaveDraft = () => persistEstimate(false);` |
| SC-6 | `packages/engine/src/calculator.ts` | `slabsWithTotals` recomputes; `estimate-calculation.ts` overwrites `slabs.pricePerKg` |
| SC-7 | `EstimateEditor.tsx` | `handleCancel` |
| SC-8 | `EstimateEditor.tsx` (`buildSavePayload`) and `utils/layer-lineage.ts` (`buildLayerInsertValues`) |
| SC-9 | `EstimateEditor.tsx` | `setEstimate((prev: any) => ({ ...prev, ...saved }))` |
| SC-10 | `EstimateEditor.tsx` desktop table | `structureLocked` only gates Add/Remove/Reorder |
| SC-11 | `EstimateEditor.tsx` | mobile sticky bar |
| SC-12 | `EstimateEditor.tsx` `fetchEstimate` | `console.warn('Auto-calculate skipped:', calcErr)` |
| SC-13 | `EstimateEditor.tsx` slabs table | quantity onChange recomputes `total` only |
| SC-14/15/16 | `estimates.ts`, `estimate-calculation.ts` | non-transactional flows |
| SC-17 | `EstimateEditor.tsx` | `useEffect([clientCalcResult, ...])` writes `setLayers` |
| SC-18 | `EstimateEditor.tsx` and others | `alert(...)` everywhere |
| SC-19 | `packages/web/src/lib/api.ts` `request()` | no 401 → refresh hook |
| SC-20 | `packages/server/src/db/schema.ts` vs `EstimateCreateSchema` | column exists, schema doesn't declare it |

---

*Audit performed by reading source only — no runtime traces, no DB introspection. Recommend pairing this with a 15-minute end-to-end repro for each P0/P1 to confirm the user-visible symptom matches the predicted chain before merging fixes.*
