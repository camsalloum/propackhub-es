# Estimation Studio — Session Log & Plan (2026-07-03)

## Part 1 — What was developed today

### 1.1 Cost breakdown: removed the "per-kg process cost" caption
The **Manufacturing & Operating** row in the estimate cost breakdown card used to
render a small sub-label (`per-kg process cost` / `markup over RM`). That caption
was removed per request.

- File: [EstimateEditor.tsx](../packages/web/src/pages/EstimateEditor.tsx)
- The `mfgOpLabel` / `note` mechanism on the row was dropped.

### 1.2 Cost breakdown rebuilt as a unit table
The cost breakdown card was converted from a two-column (label · value) list into
a real table:

- **Header row = the units** already defined in the platform: `{cur} / kg`,
  `{cur} / m²`, and `{cur} / LM`.
- **`/m²` column** shows only when GSM is known.
- **`/LM` column** shows only for roll/sleeve families where a reel width is set
  (pouches/bags never sell by LM), using `reelWidthMm` to convert m² → LM.
- **Rows** (each with all applicable unit values): Substrates, Ink/Solvent/
  Adhesive & Coating, Waste, Packaging (conditional), **Total RM** (bold),
  Manufacturing & Operating, PrePress / Transportation / Accessories
  (conditional), **Selling price** (bold).
- Zebra striping + right-aligned monospace figures.

File: [EstimateEditor.tsx](../packages/web/src/pages/EstimateEditor.tsx)

### 1.3 Variable-length "Roll" order-quantity unit (end-to-end)
Previously `Roll 500 LM` was a **fixed** unit (`{basis:'lm', multiplier:500}`).
It is now a **variable-length** unit: the user enters the roll's actual length
(in linear metres) on each estimate, and that value becomes the estimate's
multiplier. The stored `multiplier` (500) is kept only as a fallback default.

Mechanism: a new `variableMultiplier?: boolean` flag on a unit. When set, the UI
shows a per-estimate length input, saved into the existing `dimensions` JSONB as
`orderUnitMultiplier`, and the server uses it as the multiplier override at
calc time. **The engine itself needed no change** — it was already
multiplier-agnostic (`qty × multiplier ÷ per-kg yield`).

Files touched:
| File | Change |
|------|--------|
| [master-materials-io.ts](../packages/server/src/db/master-materials-io.ts) | `UnitRow.variableMultiplier?`; `DEFAULT_UNIT_ROWS` → `Roll (custom length)` flagged variable |
| [platform-master-data.ts](../packages/server/src/db/platform-master-data.ts) | read `variableMultiplier` from unit metadata |
| [tenant-reference-data.ts](../packages/server/src/db/tenant-reference-data.ts) | propagate flag; `resolveOrderUnitDef()` accepts a per-estimate multiplier override |
| [master-data-normalize.ts](../packages/server/src/utils/master-data-normalize.ts) | expose `variableMultiplier` on `unitOptions` |
| [estimate-calculation.ts](../packages/server/src/services/estimate-calculation.ts) | pass `dimensions.orderUnitMultiplier` into `resolveOrderUnitDef` |
| [api.ts](../packages/web/src/lib/api.ts) | `UnitRow.variableMultiplier?` |
| [masterDataReference.ts](../packages/web/src/lib/masterDataReference.ts) | `UnitOption.variableMultiplier?`; default `Roll (custom length)` |
| [MasterData.tsx](../packages/web/src/pages/MasterData.tsx) | Units tab: **Variable length** checkbox column |
| [JobHeaderFields.tsx](../packages/web/src/components/JobHeaderFields.tsx) | inline **Roll length (LM)** input when a variable unit is selected |
| [EstimateEditor.tsx](../packages/web/src/pages/EstimateEditor.tsx) | state + save/load via `dimensions.orderUnitMultiplier`; client-calc override |

### 1.4 Data migration
Idempotent migration converting the existing `roll_500_lm` row to the variable
unit (relabel + set `variableMultiplier:true`, bump master-data version).

- Script: [migrate-roll-variable-unit.ts](../packages/server/scripts/migrate-roll-variable-unit.ts)
- npm script: `db:migrate-roll-unit`
- **Ran successfully:** `Platform rows updated: 1; tenant rows updated: 0; master-data version bumped`.

### 1.5 Verification
- All edited files compile clean (no TypeScript/lint errors).
- Migration applied to the database.

---

## Part 2 — Implementation plan for the new requests

### Concept confirmation (my understanding)
1. **Tab rename** — the Platform Master screen is titled **"Raw Materials"**; it
   should read **"Platform Variables"** (the page hosts far more than materials:
   units, processes, product types, waste bands, etc.).
2. **New Templates page inside Platform Master** — lists **all templates
   dynamically**. When an admin adds/removes a template elsewhere, this list
   reflects it live (no hardcoding).
   - First column = **Product Group Name** (`pebiParentPg`), list sorted by it.
   - New editable column **CoRM** (Cost of Raw Material add-on) = a fixed
     `USD/kg` amount the admin sets. It is **added on top of the calculated
     Total RM** and shown in the cost breakdown as the **Manufacturing &
     Operating** figure.
3. **Three Manufacturing & Operating methods** — today there are two
   (`process_per_kg`, `markup_over_rm`). Add a third: **fixed CoRM per product
   group / template**. Add an admin page where the method is chosen among:
   - **Fixed CoRM** (from the new Templates page — per product group), *(new)*
   - **Markup over Total RM** *(exists)*
   - **Process-based** *(exists)*

This is consistent with the current model: M&O is a single per-kg figure added
between Total RM and Selling price. The new method just sources that figure from
a per-product-group fixed value instead of a markup% or the process sum.

> Open question flagged for confirmation: is CoRM defined **per individual
> template row**, or **per product group** (shared by all templates in that
> group)? The plan below implements **per product group** (keyed by
> `pebiParentPg`) since that matches "sorted by Product Group Name" and avoids
> divergent values within one group — but the page edits it on the template list
> for convenience. Confirm before build.

---

## Part 2.5 — PROGRESS / HANDOFF (updated 2026-07-03, mid-build)

**Decision taken during build:** CoRM is stored **per product group** (Option A,
new `platform_product_group_settings` table). The Templates page lists templates
(rows) sorted by product group, but the CoRM column is per-group (all templates
in a group share one CoRM). Confirm with the user if per-template was intended.

### DONE ✅
1. **Tab rename** — `<h1>` in [MasterData.tsx](../packages/web/src/pages/MasterData.tsx#L692)
   changed `Raw Materials` → **Platform Variables** + subtitle updated. (Nav
   entry stays "Platform Master" at [Layout.tsx](../packages/web/src/components/Layout.tsx#L39).)
2. **Enum** — `operatingCostMethodEnum` in
   [schema.ts](../packages/server/src/db/schema.ts#L24) now
   `['process_per_kg','markup_over_rm','fixed_per_group']`.
3. **Schema table** — `platformProductGroupSettings` added to
   [schema.ts](../packages/server/src/db/schema.ts) (after
   `platformStandardTemplates`): `pebi_parent_pg` (unique), `corm_per_kg_usd`
   decimal(12,4), audit cols.
4. **Migration wiring** —
   - Enum value `fixed_per_group` added via `ALTER TYPE ... ADD VALUE IF NOT EXISTS`
     in [apply-schema-patches.ts](../packages/server/scripts/apply-schema-patches.ts)
     (must commit before use).
   - Table create + index + **seed** (0 CoRM per distinct `pebi_parent_pg` from
     platform_standard_templates ∪ structure_templates) appended to
     [schema-patches.sql](../packages/server/scripts/schema-patches.sql).
   - ⚠️ **NOT YET RUN.** Run: `npm --prefix apps/estimation-studio/packages/server run db:patch`.

### TODO — REMAINING (in order)
4. **Server API** (new endpoints; add to
   [admin-platform-templates.ts](../packages/server/src/routes/admin-platform-templates.ts)
   and register in its `registerAdminPlatformTemplateRoutes` at line ~711):
   - `GET /api/v1/admin/platform-product-groups` → distinct `pebiParentPg` from
     active templates **LEFT JOIN** `platformProductGroupSettings`, returning
     `{ productGroup, templateCount, cormPerKgUsd }` sorted by group name (this
     is the live/dynamic list).
   - `PUT /api/v1/admin/platform-product-groups/:group` → upsert `cormPerKgUsd`
     (Drizzle `onConflictDoUpdate` on `pebiParentPg`), then bump master-data
     version (`UPDATE platform_master_state SET master_data_version = master_data_version + 1`).
   - Guard both with the existing `requirePlatformAdmin` helper (line ~96).
5. **Engine — third M&O method** (`fixed_per_group`):
   - Widen the union in [types.ts](../packages/engine/src/types.ts) and
     [calculator.ts](../packages/engine/src/calculator.ts#L105).
   - Add optional `cormPerKgUsd` to the engine estimate input.
   - In [priceWithNewModel()](../packages/engine/src/calculator.ts#L448) add the
     branch: `method === 'fixed_per_group' ? cormPerKgUsd : ...` for
     `mfgOperatingPerKg`. Widen its `operatingCostMethod` param type too.
   - Add a `cormPercent` (or reuse process branch) to the `costBreakdown` block
     (~line 143).
6. **Server calc wiring** —
   [estimate-calculation.ts](../packages/server/src/services/estimate-calculation.ts):
   when tenant method is `fixed_per_group`, look up the estimate's product group
   (`estimate.pebiParentPg` — comes from its source template; verify column on
   estimates or resolve via `sourceTemplateKey` → structure_templates) in
   `platformProductGroupSettings`, and pass `cormPerKgUsd` to the engine input
   (also pass through [estimate-engine-input.ts](../packages/server/src/utils/estimate-engine-input.ts)).
   - Mirror the union widening in
     [settings.ts](../packages/server/src/routes/settings.ts#L47),
     [estimate-engine-input.ts](../packages/server/src/utils/estimate-engine-input.ts#L37),
     [estimateCalc.ts](../packages/web/src/lib/estimateCalc.ts#L55),
     [useAuth.ts](../packages/web/src/hooks/useAuth.ts#L19).
7. **Client — Templates page** in
   [MasterData.tsx](../packages/web/src/pages/MasterData.tsx): add a `templates`
   value to the `RefTab` union (line ~19) + `REF_TAB_IDS` set + tab list, and a
   table: **Product Group** (sorted, 1st col) · **Templates** (count) · **CoRM
   (USD/kg)** editable. Fetch from the new GET; save via the new PUT. Add the
   `apiClient` methods in [api.ts](../packages/web/src/lib/api.ts).
8. **Client — Settings selector** in
   [Settings.tsx](../packages/web/src/pages/Settings.tsx#L32): make
   `operatingCostMethod` a 3-way choice (add **Fixed CoRM per product group**);
   widen its `useState` union and the settings load/save.
9. **Cost breakdown** — the M&O row already reads `ce.operationCostPerKg`, so it
   should "just work" once the engine returns the CoRM as `operationCostPerKg`
   for the new method. Verify the label/value in
   [EstimateEditor.tsx](../packages/web/src/pages/EstimateEditor.tsx) cost table.
10. **Tests + run migration + verify** — add a `fixed_per_group` engine test
    case; run `db:patch`; typecheck server + web.

### KEY FACTS FOR THE NEXT AGENT
- Product group name column = `pebiParentPg` (`pebi_parent_pg`) on both
  `structure_templates` and `platform_standard_templates`.
- M&O is a single per-kg figure between Total RM and Selling price; see
  [priceWithNewModel()](../packages/engine/src/calculator.ts#L448). The engine is
  the ONLY place the three methods branch.
- Route registration pattern: add `fastify.get/put(...)` inside
  `registerAdminPlatformTemplateRoutes` (line ~711), calling exported handlers.
- Master-data-version bump makes clients refetch reference data (used for "live"
  updates). Bump it on CoRM save and on template add/remove.
- Repo memory note on operating-cost methods should be updated once done.

---

### 2.1 Rename "Raw Materials" → "Platform Variables"
- Edit the `<h1>` in [MasterData.tsx](../packages/web/src/pages/MasterData.tsx#L694)
  and its subtitle copy.
- Check the sidebar/nav label and route title for the same page and update to
  match (search the nav config for the "Raw Materials"/"Master Data" entry).
- Low risk, pure copy change.

### 2.2 Data model — CoRM per product group
Add a fixed per-kg CoRM value keyed by product group. Two options:

**Option A (recommended): new `platform_product_group_settings` table**
```
platform_product_group_settings(
  id uuid pk,
  pebi_parent_pg varchar(255) unique,   -- product group name
  corm_per_kg_usd decimal(12,4) default 0,
  updated_at timestamptz
)
```
- Clean separation; one row per product group; naturally "live" because the
  Templates page derives its group list from existing templates and left-joins
  this table.

**Option B: reuse existing template columns**
- Store `corm_per_kg_usd` on `platform_standard_templates` (+ mirror to
  `structure_templates`). Simpler migration but risks divergent CoRM within a
  group and duplicates the value across every template of a group.

Plan proceeds with **Option A**.

Migration:
- New `schema.ts` table + a `scripts/` migration that creates the table and
  seeds a `0` row for each distinct `pebiParentPg` currently in
  `platform_standard_templates`.

### 2.3 Server API — templates admin list + CoRM
- New/extended route (e.g. in
  [admin-platform-templates.ts](../packages/server/src/routes/admin-platform-templates.ts)):
  - `GET /admin/platform/product-groups` → distinct `pebiParentPg` from active
    templates **left-joined** with `platform_product_group_settings`, returning
    `{ productGroup, templateCount, cormPerKgUsd }`, sorted by group name. This
    is the "dynamic, live" list.
  - `PUT /admin/platform/product-groups/:group` → upsert `cormPerKgUsd`.
- Bump master-data version on save so clients refetch.
- Guard with the existing platform-admin auth used by other admin-platform
  routes.

### 2.4 Third operating-cost method (`fixed_per_group`)
- **Enum:** extend `operatingCostMethodEnum` in
  [schema.ts](../packages/server/src/db/schema.ts#L23) to
  `['process_per_kg', 'markup_over_rm', 'fixed_per_group']` (enum-add migration).
- **Engine types:** widen the `operatingCostMethod` union in
  [types.ts](../packages/engine/src/types.ts) and
  [calculator.ts](../packages/engine/src/calculator.ts#L105).
- **Engine input:** add an optional `cormPerKgUsd` field to the engine estimate
  input (resolved server-side from the estimate's product group).
- **Pricing:** in
  [priceWithNewModel()](../packages/engine/src/calculator.ts#L448) add the third
  branch:
  ```
  mfgOperatingPerKg =
    method === 'process_per_kg'  ? mfgProcessPerKg :
    method === 'fixed_per_group' ? cormPerKgUsd    :
                                   wasteAdjustedMaterialPerKg * markup%
  ```
- **Cost breakdown %:** add a `cormPercent` (or reuse `processPercent` label)
  branch in the `costBreakdown` block.
- **Server calc wiring:** in
  [estimate-calculation.ts](../packages/server/src/services/estimate-calculation.ts),
  when method is `fixed_per_group`, look up the estimate's product group
  (`estimate.pebiParentPg` via its source template) in
  `platform_product_group_settings` and pass `cormPerKgUsd` to the engine.

### 2.5 Client — Platform Variables → Templates page
- Add a **"Templates"** ref-tab to
  [MasterData.tsx](../packages/web/src/pages/MasterData.tsx) (`RefTab` union +
  tab list).
- Table: **Product Group** (sorted, first col) · **Templates** (count) ·
  **CoRM (USD/kg)** (editable number). Data from
  `GET /admin/platform/product-groups`; saving calls the `PUT`.
- Because the group list is derived from live templates, adding/removing a
  template automatically changes the list on next load / master-data-version
  refetch (the app already refetches reference data on version bump).

### 2.6 Client — operating-cost-method admin page
- Extend the operating-cost-method control in
  [Settings.tsx](../packages/web/src/pages/Settings.tsx#L32) (and its
  `settings` route/type in
  [settings.ts](../packages/server/src/routes/settings.ts#L47)) to a
  three-way choice:
  - Markup over Total RM
  - Process-based
  - **Fixed CoRM per product group** *(new)* — with a hint linking to the
    Templates page.
- Update `useAuth.ts` `operatingCostMethod` union and any place that narrows the
  two-value type.

### 2.7 Tests & migration
- Engine: add a `fixed_per_group` case to the calculator/pricing tests
  (mirrors existing `process_per_kg` / `markup_over_rm` cases).
- Migration scripts: (a) enum value add, (b) create + seed
  `platform_product_group_settings`.
- Update the repo memory note on operating-cost methods once implemented.

### 2.8 Rollout order
1. Rename tab (2.1) — ship immediately, zero risk.
2. Table + API for product-group CoRM (2.2–2.3, 2.5).
3. Engine third method + wiring (2.4).
4. Settings method selector (2.6).
5. Tests + migrations (2.7).
