# Pricing Architecture v2 — Implementation Plan (for tomorrow)

Corrections from the user on where pricing config lives and how the estimate
presents price. **This is a plan only — do not implement until reviewed.** Build
state today is green (engine 169 tests, web `tsc` clean); this plan re‑locates
several pieces that were wrongly put inside the estimate.

---

## 0. The core principle

**Config that is common across orders/templates lives OUTSIDE the estimate
(platform / template / user settings). The estimate only consumes it and adds the
per‑order inputs (tooling, delivery, quantities to quote).**

| Thing | Common to… | Lives in | Who sets it | Estimate behaviour |
|---|---|---|---|---|
| Waste bands (qty → waste %) | all orders | **Platform** (Master Data) | owner / manager | read‑only, consumed |
| Margin over RM (USD/kg) | a product group | **Template** | admin | inherited, read‑only |
| Pricing method (markup % vs margin/kg) | a user | **User setting** | owner / manager | applied, not chosen |
| Tooling (plates/cylinders) charge | one order | **Estimate** | estimator | per‑order input |
| Delivery term + charge | one order | **Estimate** | estimator | per‑order input |
| Quantities to quote (1T/3T/5T) | one order | **Estimate** | estimator | per‑order input |

---

## 1. Platform area — Waste bands (NEW) — **single source, variable**

- Add a **"Waste bands"** tab to Master Data (`MasterData.tsx`), editable by
  `platform_admin` (owner) and `tenant_admin` (manager) — the **single source**.
- Table: `Min kg | Max kg | Waste %` rows (the 0–80 … 100,000+ ladder). Add/remove
  rows, edit %s freely. **Seed placeholder figures now** (engine defaults
  30%→1%); admin/manager will adjust.
- **Storage:** platform‑level config readable by every tenant (single source — no
  per‑tenant override). Options:
  - (a) new table `waste_bands` (platform‑scoped, like `platform_master_materials`); or
  - (b) a JSON blob on `platform_master_state` / a `platform_reference` category.
  Recommend **(a)** a small dedicated table for clean editing + ordering.
- **API:** `GET /api/v1/platform/waste-bands`, `PUT` (admin only). Expose via the
  master‑data reference payload so the editor can read it without a separate call.
- The engine already accepts bands (`wastePercentForQuantity(qty, bands)`); the
  estimate passes the **global** bands.

### Undo from today
- Remove the **editable waste %** inputs from the estimate slab tab.
- Stop sending/seeding `estimates.waste_bands` from the estimate. (Keep the column
  nullable as a possible future per‑estimate override, but the UI won't edit it.)

---

## 2. Template (product group) — Margin over raw material — **variable, in platform master**

- Margin/kg lives **per product group = per template**, managed in the platform/
  admin template editor (part of the platform master single source).
  `structure_templates.margin_over_rm_per_kg_usd` already exists + is wired in the
  Template Builder. ✅ keep. **Seed any figures now**; admin/manager edits them.
- **Estimate change:** remove the editable margin input from "Costs & Terms".
  Show the inherited value **read‑only** (e.g. "Margin: from <template> — X USD/kg").

---

## 3. User setting — Pricing method (per user, variable)

- Pricing method is **per user** (`users.pricing_method`, already exists + flows
  through `/auth`). ✅ The estimate uses the user's assigned method, **read‑only**.
- **Remove the pricing‑method dropdown from the estimate** (Costs & Terms).
- **Default method by tenant context (then overridable):**
  - **Standalone tenant** (not part of a manager‑run group) → **markup %**.
  - **User under a managed group** → **margin per kg**.
  - The owner/manager can override any user's method afterwards (variable).
- **OPEN — group representation:** there is no "managed group" concept in the
  schema yet. Need to decide how a tenant is flagged as "under a group" (e.g.
  `tenants.group_id` / a boolean, or via the owner→manager→tenant hierarchy). Until
  that exists, default everyone to `markup` and let admins switch users to margin/kg.
- **Admin control to set it:** per‑user assignment by owner/manager — add to a User
  Management screen (or, interim, a Settings control).

---

## 4. Estimate — Selling price block (reorder + product‑type aware)

Show the selling price **in the order's selected unit first**, then the other
**applicable** units underneath.

**Base:** engine returns `salePricePerKg` (USD). Convert:
```
price/kg   = salePricePerKg
price/m²   = salePricePerKg ÷ sqmPerKg
price/piece= salePricePerKg ÷ piecesPerKg     (×1000 → price/Kpcs)
price/LM   = salePricePerKg ÷ linearMPerKgReel
```
Display all converted to the tenant display currency via fx.

**Unit applicability by product type:**

| Product | kg | m² | pieces (Kpcs) | LM |
|---|---|---|---|---|
| roll | ✓ | ✓ | ✓ *(if pieces/cut + cut‑off set)* | ✓ |
| sleeve | ✓ | ✓ | ✓ *(if applicable)* | ✓ |
| pouch | ✓ | ✓ | ✓ | ✗ **no LM** |
| bag | ✓ | ✓ | ✓ | ✗ **no LM** |

- **Primary** = the order's selected unit (kgs/kpcs/sqm/lm/custom). Render it first
  and larger; render the remaining applicable units as secondary rows.
- A unit that can't be computed is hidden, not shown as "—".
- **Pieces require a cut‑off** (and pieces/cut). Without a cut‑off the product is
  treated as unprinted continuous film → sold by **kg / m² / LM / roll**, no pieces.

---

## 5. Estimate — Selling‑price slab table (user‑selected quantities)

Replace today's fixed‑band read‑only table with a **user‑driven quote ladder**.

- User picks the quantities to quote, in the **order's unit** (e.g. 1T, 3T, 5T →
  1,000 / 3,000 / 5,000 kg). Add / remove / edit rows. Sensible defaults seeded.
- For each quantity `q`:
  ```
  trueKg     = convert(q, orderUnit)            # via yields
  waste%     = wastePercentForQuantity(trueKg, GLOBAL bands)
  tooling/kg = toolingChargeUsd  ÷ trueKg       # see decision D1
  logistics/kg = deliveryChargeUsd ÷ trueKg     # see decision D1
  costBase   = material×(1+waste%) + accessory + logistics + tooling
  margin     = method==='markup' ? costBase×markup% : marginPerKg
  price/kg   = costBase + margin
  ```
- Table columns: `Quantity (order unit) | Waste % (from band, read‑only) | Price/kg
  | Price/<order unit> | Line total`. Product‑type‑aware unit, as §4.
- This is the table that prints on the proposal.

---

## 6. Decisions — RESOLVED

- **D1 — Amortization in the quote ladder:** **per‑row** (each quoted quantity
  amortizes tooling & delivery over itself; 5T cheaper/kg than 1T). Supersedes the
  earlier "flat" rule. *(Assumed; user didn't object — flag if wrong.)*
- **D2 — Waste bands scope:** **platform single source** (owner/manager edit; all
  tenants read). No per‑tenant override. Values are variable; seed placeholders now.
- **D3 — Pricing method:** **per user**, variable. Default = **markup** for a
  standalone tenant, **margin/kg** for a user under a managed group; admin can
  override. (Group representation is an open sub‑item — see §3.)
- **D4 — Pieces:** require a **cut‑off** (+ pieces/cut). No cut‑off → no pieces;
  sold by kg / m² / LM / roll.

---

## 7. What to undo / change from today's build (checklist)

- [ ] Estimate "Costs & Terms": remove **pricing‑method dropdown** → read‑only label.
- [ ] Estimate "Costs & Terms": remove **editable margin/kg** → inherited read‑only.
- [ ] Estimate slab tab: remove **editable waste %**; bands come from platform (read‑only).
- [ ] Estimate slab tab: change fixed‑band table → **user‑selected‑quantity** ladder (§5).
- [ ] Selling price block: reorder to **primary unit first + product‑type units** (§4).
- [ ] Keep tooling + delivery inputs in the estimate (per‑order) — unchanged.
- [ ] Platform Master Data: add **Waste bands** editor (§1).
- [ ] Admin: add **pricing‑method** control (§3, per D3).

## 8. Migration / compatibility notes
- Engine already supports global bands + the new cost model; no engine formula
  change needed for this re‑location (only where the bands come from).
- `estimates.waste_bands` column: keep nullable; stop writing it from the estimate.
  Engine falls back to global/default bands when an estimate has none.
- Existing estimates: margin/method now resolved from template/user, not the
  estimate row — verify legacy rows still price sensibly.

## 9. Out of scope for tomorrow (later)
- Proposal/PDF rendering of the new price ladder + unit conversions.
- Full per‑user pricing‑method management UI (if D3 = tenant default first).


---

## 10. Deep review — gaps found and amendments (added 2026‑06‑30)

A final code‑grounded sweep before tomorrow's implementation. Each item below is a
real gap in the plan or in today's build that would bite us when implementing.

### G1 — Margin is duplicated, not single‑source
- **Found:** I added `margin_over_rm_per_kg_usd` only on tenant `structure_templates`.
  But the platform catalog is `platform_standard_templates` and the existing
  `syncPlatformStandardsToTenant` copies fields from platform → tenant rows.
  Editing margin on a tenant copy will be **overwritten on the next sync** — that
  contradicts "single source in platform master."
- **Amendment:**
  - Add `margin_over_rm_per_kg_usd` to **`platform_standard_templates`** (the
    single source).
  - Extend `syncPlatformStandardsToTenant` and `sourceToTenantInsertRow` to copy
    the margin into each tenant copy on seed/sync.
  - The platform/admin template editor edits the **platform** row; tenant rows are
    read‑only mirrors. (Today's Template Builder edits the tenant copy; if the
    template is a platform standard, route the edit through the existing
    `updatePlatformTemplateByKey` admin path that already exists.)
  - Tenant‑created (non‑standard) templates keep their margin on the tenant row —
    that's correct, they have no platform source.

### G2 — "Managed group" concept doesn't exist yet
- **Found:** `users.role` is `user | tenant_admin | platform_admin`; `tenants.type`
  is `individual | company`. There is **no relationship that says "this tenant
  belongs to a manager‑run group."** So the default‑method rule (standalone →
  markup, under‑group → margin/kg) can't actually be evaluated.
- **Amendment (proposed minimum):**
  - Add `tenants.managed_group_id uuid` (nullable). Null = standalone tenant.
  - Optional: a small `tenant_groups` table (`id`, `name`, `manager_user_id`) so
    the manager is identifiable. Owner = `platform_admin`.
  - Default method resolution becomes: `tenants.managed_group_id IS NULL ? 'markup' : 'margin_per_kg'`.
  - **User override always wins** — `users.pricing_method` (already exists) is the
    final value; only NEW users default from the group rule above. Existing users
    keep their stored value.
- **UI implication:** owner needs a screen to assign tenants to groups and pick a
  group manager. This is a bigger admin feature; if we want to ship pricing v2
  faster, ship the column + default rule first, ship the UI after.

### G3 — Waste bands: platform‑scoped table, not estimate‑scoped
- **Found today's build:** `estimates.waste_bands` jsonb was added. Per the new
  decision the bands are a single platform source, so per‑estimate storage is
  wrong (it would let users diverge silently).
- **Amendment:**
  - New table `platform_waste_bands` (`id`, `min_kg`, `max_kg nullable`, `waste_percent`,
    `sort_order`, `updated_at`), platform‑scoped (no tenantId), editable only by
    `platform_admin` (owner) and `tenant_admin` (manager).
  - Expose via `GET /api/v1/platform/waste-bands` and the master‑data reference
    payload so the editor + the estimate calc fetch it once.
  - **Keep `estimates.waste_bands` for backward compat** but stop reading/writing it
    from the editor; the engine already accepts bands at calc time.
  - Engine `wastePercentForQuantity(qty, bands)` is already band‑agnostic — no
    engine change needed. Just pass the global list.

### G4 — Pricing‑method resolution chain
- **Found:** today the estimate writes `pricing_method` on each row from the form
  dropdown. We're removing the dropdown, so the **resolution rule** must be clear.
- **Amendment — final precedence:**
  1. `users.pricing_method` (the user's assigned method) — always wins for new
     estimates and for live recalculation.
  2. If `users.pricing_method` is unset (shouldn't happen — column is NOT NULL with
     default 'markup'), fall back to the tenant‑group default rule (§G2).
  3. `estimates.pricing_method` becomes a **snapshot** of what was applied at save
     time (for audit / proposal reproducibility), NOT the input.
- The engine continues to read `estimate.pricingMethod`; the editor just sets it
  from the user, doesn't expose it.

### G5 — Quote‑ladder math under per‑row amortization
- **Found:** with per‑row amortization (D1), the "this order" entered quantity has
  a slightly different role. Confirm:
  - The **headline price** in the estimate uses the entered order quantity for
    amortization (same as today).
  - Each **slab row** is computed independently with its own quantity for both
    waste % AND amortization (tooling/kg, delivery/kg both = charge ÷ row_qty).
  - Margin: same rule either way — markup % of row's cost base, or fixed
    USD/kg (template‑inherited).
- **Edge cases:**
  - Tooling = 0 (repeat orders) → tooling/kg = 0 across all rows. ✅ already handled.
  - Delivery = EXW (charge = 0) → logistics/kg = 0. ✅ handled.
  - Row qty in non‑kg units (1T, 3T, 5T or Kpcs/m²/LM) → convert to **true kg** first
    via the structure's yields (same `convertOrderQuantityToKg`), THEN apply the
    formula. The engine helper is reusable.

### G6 — Pieces / cut‑off / unprinted‑film rule
- **Found:** the unit applicability table in §4 doesn't fully match the user's
  rule. Pieces require **a cut‑off**, not just pieces/cut. Restate:
- **Amendment (final rule):**
  - **Pouch / bag:** always has a "piece" (the finished bag/pouch). Quote in kg /
    m² / pieces (Kpcs). **No LM.**
  - **Roll / sleeve WITH cut‑off:** printed/converted film, has pieces. Quote in
    kg / m² / LM / pieces (Kpcs).
  - **Roll / sleeve WITHOUT cut‑off:** unprinted continuous film. Quote in
    **kg / m² / LM / roll** (no pieces). The "roll" unit is `roll_500_lm` already
    defined in unit‑conversion.
- The selling‑price block in the estimate enables/disables each unit accordingly.

### G7 — Slab‑table input units
- **Found:** the new ladder is "user‑picked quantities," but the editor today only
  has the order‑quantity unit as a single value. The ladder needs its own input.
- **Amendment:**
  - Quantities are entered in the **order's selected unit** (e.g. if the order is
    in tonnes, rows are 1, 3, 5 → meaning 1 T / 3 T / 5 T).
  - Internally each row converts to true kg via `convertOrderQuantityToKg` for the
    formula; display row labels in the order's unit and convert price to that unit.

### G8 — Default seed values to set on day 1
So nothing is "stuck at 0":
- **Waste bands**: seed the engine defaults (30 % → 1 %) into `platform_waste_bands`.
- **Margin over RM (per template)**: seed e.g. `0.50 USD/kg` on each platform
  standard template; admin will edit after. Set 0 if you'd rather force admin to
  set it explicitly.
- **Pricing method per user**: existing default 'markup' stays.
- **Slab quantities (per estimate)**: default to `[1, 3, 5]` in the order unit.

### G9 — Legacy estimate migration
- **Found:** estimates saved before this re‑architecture have `pricing_method` =
  whatever was last selected, `margin_value_per_kg_usd` filled, etc. Now that those
  are derived (not edited), how do we treat them on reopen?
- **Amendment:**
  - When opening an estimate, **always re‑resolve** from current sources:
    - margin/kg ← linked template's current margin (overrideable per row in the
      ladder if the admin wants, but **read‑only by default**);
    - method ← `users.pricing_method`;
    - waste bands ← platform.
  - Do **not** delete the stored snapshot columns — they're the proposal audit
    trail. Pricing is recomputed live; the saved snapshot just shows what the
    customer was quoted at the time.
- **Audit trail decision:** on save, persist a snapshot of the bands actually used
  (e.g. compact json on `estimates.waste_bands_snapshot`) + the method actually
  applied. This lets us re‑print an old quote exactly as it was sent.

### G10 — Roll‑up of what to **delete** from today's WIP
To avoid ambiguity at implementation time, these go out:
- Estimate "Costs & Terms" → **pricing‑method dropdown** (remove).
- Estimate "Costs & Terms" → **margin USD/kg input** (remove → read‑only).
- Estimate slab tab → **editable waste % inputs** (remove → read‑only from platform).
- Estimate slab tab → **fixed‑band ladder** (replace with user‑picked quantities).
- `estimates.waste_bands` column: stop writing live edits (keep for snapshot).
- Engine input from web: stop passing `wasteBands` from the editor state; pass the
  platform list fetched once.

### G11 — Telemetry / verification
- Add a one‑line console log when the estimate calc runs:
  `pricingMethodResolved`, `wastePercentApplied`, `tooling/kg`, `logistics/kg`,
  `marginPerKg`, `salePricePerKg`. Makes "why didn't this change?" diagnoses 30
  seconds, not an hour.

---

## 11. Implementation order (suggested, lowest‑risk first)
1. **Waste bands platform source** (table + API + Master Data editor).
2. **Margin on platform_standard_templates** + sync + admin editor wiring.
3. **Estimate: remove dropdown, dropdown‑value reads (method/margin), refactor
   calc to read from user/template/platform; keep tooling/delivery editable.**
4. **Selling‑price block reorder** + product‑type unit applicability.
5. **User‑picked slab ladder** (replace today's fixed‑band table).
6. **Managed‑group column + default‑method rule** (column first, UI later).
7. **Snapshot persistence on save** (G9) — audit trail.
8. **Per‑user pricing‑method UI** (User Management) — last.
