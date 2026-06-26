# ProPackHub Estimation Studio — PRD v3.4 Final Build Specification

**Document type:** Build specification (developer-ready)  
**Version:** 3.4 Audit-ready (external audit refinements)  
**Date:** 2026-06-11 (V1 build verified 2026-06-18)  
**Status:** **V1 implemented** — monorepo `packages/{engine,server,web}`; see [LIVE_STATE.md](./LIVE_STATE.md) and [ES_IMPLEMENTATION_PLAN.md](./ES_IMPLEMENTATION_PLAN.md)  
**Audit handoff:** [ES_AUDIT_HANDOFF.md](./ES_AUDIT_HANDOFF.md)  
**Living memory:** [ES_MEMORY.md](./ES_MEMORY.md) · **Wireframes:** [ES_WIREFRAMES.md](./ES_WIREFRAMES.md) · **Mockup:** [mockup/es-estimate-editor.html](./mockup/es-estimate-editor.html)  
**Supersedes:** PRD v3.0 (2026-06-11), [ES_PRD_v3_STRATEGIC.md](./ES_PRD_v3_STRATEGIC.md), [PRD_v3_Final.md](./PRD_v3_Final.md) (enterprise — mostly rejected)  
**Locked decisions:** [LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md) (#2–#23)  
**Dimension sources:** `PPH/Costing_form 25.2.25.xlsx`, `legacy-laravel/`, `PPH/Interplast_FP_Costing_*.html`  
**Tagline:** Flexible Packaging Cost Estimator  

---

## 0. How to use this document

**For auditors:** Read [ES_AUDIT_HANDOFF.md](./ES_AUDIT_HANDOFF.md) first, then this PRD and `legacy-laravel/COSTING_NOTES.md`.

**For builders:** V1 is built. Use [LIVE_STATE.md](./LIVE_STATE.md) for what works today and [ES_IMPLEMENTATION_PLAN.md](./ES_IMPLEMENTATION_PLAN.md) for phase history. New work should extend this PRD §21 (out of scope) or post-V1 items in LIVE_STATE.

This PRD includes:

- Business outcomes and **simplicity boundaries** (ES ≠ PEBI)
- **Design system**, desktop + **mobile adaptive UI** (§4.3, §5.8)
- **Cost visibility profiles** for sales reps (§6.8, Decision #20)
- **Dimensions & width chain** — reel vs printing web (§6.9, Decision #21)
- **Global currency** — USD library, auto FX to user currency (§6.10, Decision #22)
- **Pre-scaffold UX/engine refinements** from external audit (§5.7–§5.9, §6.8, §6.11, §7.1)
- **Ink SB/UV** + printing web class (§6.2.1, Decision #19)
- Laravel-aligned **pricing engine** (§7)
- Full **data model**, **REST API**, **architecture**
- **Appendix A** — session consolidation changelog

**Explicitly excluded from V1** (see §21): PEBI complexity, native mobile app, approval workflows, community marketplace, material price history.

---

## 1. Executive summary

**ProPackHub Estimation Studio** is a **standalone, simple SaaS** for packaging sales professionals. Anyone can register (individual or company). Each user gets a **personal costing library** (admin-seeded copy) and builds quotes using a **Laminate Stack Visualizer**, **quantity slab pricing**, and **branded PDF proposals**.

**Core job:** Template or blank canvas → adjust structure → see price → slab table → send PDF → track customer history → **re-quote old jobs with today's material prices**.

**Not in scope:** Factory MES, BOM2, machine routing AI, multi-level approvals — those belong to **PEBI** `/estimator`.

---

## 2. ES vs PEBI — simplicity boundary (mandatory)

| Dimension | **Estimation Studio (this PRD)** | **PEBI MES Estimator** |
|-----------|----------------------------------|-------------------------|
| **User** | Independent rep, consultant, small converter | Internal pre-sales / MES team |
| **Signup** | Self-serve individual-first | Plant / ERP tenant |
| **Steps** | **4–5 screens max** per quote | 8-step wizard (Customer → BOM → Routing → …) |
| **Structure UI** | Laminate Stack Visualizer | BOM2, product groups, machine AI |
| **Pricing** | Layer + process + margin + **slabs** | Simulation, routing, OEE |
| **Approvals** | **None V1** | Quotations, inquiries |
| **Customization** | User library + templates | Oracle master data, MES items |
| **History** | Customer estimate list + **re-quote @ current RM** | `estimator_draft` on inquiry |

**Rule:** If a feature exists primarily for manufacturing feasibility, it stays in PEBI — do not port it to ES.

---

## 3. Product vision

### 3.1 Mission

Enable packaging sales professionals to **quote flexible structures in minutes**, **reuse past work**, and **refresh prices automatically** when raw materials change — without ERP setup.

### 3.2 Primary workflow (V1)

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐    ┌─────────┐
│ Pick customer│ → │ Template or  │ → │  Laminate   │ → │  Slabs   │ → │ Proposal│
│  (or new)   │    │ Blank Canvas │    │ Visualizer  │    │  table   │    │  PDF    │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────┘    └──────────┘
                                              │
                                              ▼
                                    Cost sidebar (visibility-filtered)
                                    Sales rep: selling price only
                                    Admin: optional breakdown when allowed
```

**No approval step.** Status: `draft` → `sent` → `won` | `lost`.

### 3.3 Secondary workflow — Re-quote from history (Laravel parity + improvement)

This is **required V1** — same mental model as Laravel `duplicate` / reopen, but **prices come from the user's current material library**, not frozen copy.

```
Customer detail → Past estimates list → [Re-quote with current prices]
    ↓
New estimate (draft):
  - COPY: layer order, materials (by material_id), microns, dimensions, processes, slab quantities
  - REFRESH: `cost_per_kg_usd`, waste_%, density, solids_% from tenant materials table TODAY
  - LINK: source_estimation_id → original
    ↓
User adjusts slabs → new proposal PDF (markup applied server-side; hidden from rep if profile disallows)
```

**UI banner on re-quote:**

> Re-quoted from **QT-2026-00142** (3 Jun 2026). Material prices updated from your library. PET 12µ was **$2.23/kg → $2.37/kg** (shown as **AED 8.20 → AED 8.70/kg** at your rate).

---

## 4. Users & tenancy

### 4.1 Registration (Decision #2, #14)

- **Self-registration** on ProPackHub (individual default; optional “company” tenant)
- Registration collects **display currency** (ISO 4217, e.g. AED, EUR, INR) — see §6.10
- On first login: provision tenant + **copy master library** from `es_reference` (prices in **USD**)
- Server **auto-fetches USD → display currency** rate from web FX provider; user completes onboarding
- **Not V1:** Admin-only user creation (contrast `PRD_v3_Final.md` §5)

### 4.2 Roles & visibility (Decision #18 + #20)

| Role | Scope |
|------|--------|
| `user` | Estimates, customers, structure/templates, proposals — **selling price only** by default (no cost/markup UI) |
| `tenant_admin` | Full costing visibility + operation/process UI + machine rates + **configure what each user can see** |
| `platform_admin` | Master library seed (ProPackHub — outside ES app UI in V1) |

**First user on a tenant** → `tenant_admin`. Additional company users → `user` until promoted.

**No** `manager`, **no** approval queue.

**Sales rep rule (Decision #20):** Margins, markup, RM cost, cost/m², plates, delivery, operation, and cost breakdown **must not appear** to users whose visibility profile disables them. Engine still computes full sale price server-side; UI/API **strip** hidden fields.

See §6.8 for visibility profile schema and Settings UI.

### 4.3 Mobile & PWA (Decision #8 — one app, adaptive UI)

**Short answer:** V1 = **one web application** (React), not a separate App Store / Play Store native app. Phone users open the **same product** in the browser or install it as a **PWA** (Add to Home Screen).

**Important:** Same app ≠ same layout. Desktop and mobile use **different UI patterns** for the same features — especially layer editing.

| | Desktop (≥1024px) | Mobile / tablet (<1024px) |
|---|-------------------|---------------------------|
| **Product** | Estimation Studio webapp | **Same** webapp / PWA |
| **Native app** | — | **No** separate React Native app in V1 |
| **Layer editor** | Table rows + optional drag | **Layer cards** (one card per layer) |
| **Add layer** | Button → inline row | **FAB** or full-width button → **bottom sheet** picker |
| **Edit micron / material** | Inline table cells | Tap card → **bottom sheet** with large inputs |
| **Remove layer** | Row action / icon | **Swipe left to delete** or card ⋮ menu |
| **Reorder** | Drag handle on row | **Long-press + drag** on card (touch) |
| **Visualizer** | Sticky right panel | Collapsible block **above** layers (tap to expand) |
| **Price** | Sidebar | **Sticky bottom bar** (selling price + PDF) |
| **Cost/markup** | Admin sections when allowed | Same visibility rules — sections **omitted**, not hidden in accordion |

**Why not shrink the desktop table on phone?** A wide layer table with horizontal scroll is poor for sales reps in the field. Mobile gets **touch-first** patterns (see §5.8).

**PWA V1:** Install icon, full-screen feel, same login. Offline draft sync = Phase 2.

**Not V1:** React Native / Flutter standalone mobile app, separate mobile codebase.

```sql
tenants.type ENUM('individual', 'company')
```

All rows scoped by `tenant_id`. Corporate group hierarchy deferred.

### 4.4 Tenant types (Decision #2)

| Type | Meaning | V1 |
|------|---------|-----|
| `individual` | Solo consultant / rep — one user initially | Default at signup |
| `company` | Small converter or sales team — same product, shared library | Optional at signup |

Both types use the same currency, library, and visibility model. **No** corporate group hierarchy, **no** multi-entity “selling company” switch — one tenant = one currency profile + one material library.

---

## 5. Design system & signature UI

> Merged from [PRD_v3_Final.md](./PRD_v3_Final.md) §3 — this was the **missing UI** in the strategic draft.

### 5.1 Design principles (Decision #11)

| # | Principle | Implementation |
|---|-----------|----------------|
| 1 | Visual before numerical | Laminate Visualizer is primary; numbers in sticky sidebar |
| 2 | Engineering before data entry | Drag layers, not ERP forms |
| 3 | Instant intelligence | **Client-side engine** updates price on every edit (0ms perceived); server reconcile for persist |
| 4 | Mobile-first sales (Decision #8) | Responsive + PWA; rep quote flow ≤ 3 min |

**Personality:** Industrial Design Studio — **Figma for Packaging**. Not SAP. Not PEBI Ant Design.

### 5.2 Color palette

| Token | Hex | Usage |
|-------|-----|--------|
| `navy` | `#0F1F3D` | Top nav, headers |
| `gold` | `#C8962A` | Selling price, CTAs, slab highlights |
| `slate` | `#F4F5F7` | Page background |
| `white` | `#FFFFFF` | Cards, panels |
| `ink` | `#1A1D23` | Primary text |
| `mist` | `#8A8E97` | Labels, placeholders |
| `success` | `#1A7F5A` | Won status |
| `warning` | `#B8820A` | Draft / expiry |
| `danger` | `#C0392B` | Errors |
| `border` | `#E2E4E8` | Dividers |

**Accessibility (pre-scaffold):** Gold `#C8962A` on white for **body-sized selling price text** must pass **WCAG 2.1 AA** (4.5:1) — run contrast check before lock; use **`#9A7018`** or **DM Sans 700** if needed. Gold as **CTA fill** with dark/navy label is acceptable.

**Dark mode:** **Light-only V1** (data-dense industrial studio). Dark toggle = **Phase 2** (align with ProPackHub marketing dark aesthetic if added later).

### 5.3 Typography

| Role | Font | Size |
|------|------|------|
| Display / price | DM Sans 600 | 32–42px |
| Section headings | DM Sans 600 | 18–24px |
| Body | Inter 400 | 14px |
| Numeric (µ, GSM, costs) | JetBrains Mono 400 | 13px |
| Arabic (Phase 2) | Cairo | same scale |

### 5.4 Layer type colors — Laminate Stack Visualizer

| Layer type | Color | Pattern |
|------------|-------|---------|
| Substrate (BOPP, PET, CPP) | `#1D5FA3` | Solid |
| Ink | `#9B4CA0` | 70% opacity |
| Adhesive / Primer | `#2E8B6E` | 60% opacity |
| Aluminium foil | `#8A8A8A` | Metallic gradient |
| Extrusion (PE, PP) | `#B85C2C` | Solid |
| Coating | `#4A7CA8` | Thin semi-transparent band |

**Band height ∝ micron value** (proportional cross-section).

### 5.5 Motion

| Interaction | Duration |
|-------------|----------|
| Calculate (client) | **Immediate** on input — `packages/engine` in browser |
| Calculate (server) | Debounced **250ms** — persist, audit, visibility strip |
| Price count-up | 600ms ease-out (after client result) |

| Layer add | 200ms ease-out |
| Layer remove | 150ms ease-in |

### 5.6 Laminate Stack Visualizer — placement

| Surface | Behavior |
|---------|----------|
| **Estimate editor** | Sticky right panel (desktop ≥1024px); top block (mobile) |
| **Template cards** | Compact thumbnail stack |
| **Customer re-quote preview** | Mini stack in list row |
| **Proposal PDF** | Embedded SVG export of stack |

### 5.7 Layout — estimate editor (split pane)

**Regular user (`user`) — when visibility profile is default (sales rep):**

```
┌──────────────────────────────┬────────────────────────┐
│  LEFT (scroll)               │  RIGHT (sticky)        │
│  1. Customer & job name      │  Laminate Visualizer   │
│  2. Layer stack (no $/kg)    │  Total GSM / µ         │
│  3. Dimensions               │  Selling price (gold)  │
│  4. Slabs (price/kg only)    │  [Generate PDF]        │
│  (no markup, no RM, no %)    │  (no cost breakdown)   │
└──────────────────────────────┴────────────────────────┘
```

**Tenant admin (`tenant_admin`) — full costing view:**

**Progressive disclosure (audit):** Keep the layer **table lean** — Material, Type, µ, one cost column max. Expand row (chevron) for $/m², waste %, density, USD source. Markup / plates / delivery / processes live in **separate cards below** the table, not extra permanent columns.

```
│  2. Layer stack (+ expand row details) │  Breakdown: mat/markup/ │
│  4. Processes (toggle rows)            │    effective margin %  │
│  5. Markup, plates, delivery          │    process %           │
│  6. Slabs                              │                        │
```

**Preview as user (§6.8):** Layout must **reflow** — right sidebar grows when cost blocks hidden; no empty gutters where markup/process panels were removed.

Settings → **Team & visibility** (tenant_admin): default profile for new users + per-user overrides.  
Settings → **Machine costs / hr** (tenant_admin only).

### 5.8 Mobile layer editor (touch-first — required V1)

When viewport `< 1024px`, **do not** use the desktop layer table as the primary control. Use **layer cards + bottom sheets**.

| Action | Mobile interaction | Min touch |
|--------|-------------------|-----------|
| Edit micron | Tap **Edit** → bottom sheet, numeric input `inputmode="decimal"` `pattern="[0-9]*"` | 48px |
| Change material | Bottom sheet → searchable list | 48px rows |
| Add layer | **+ Add layer** → sheet (type → material) | Full-width btn |
| Remove layer | Swipe left **Delete** (confirm) or ⋮ menu | 44px |
| Reorder | Long-press ≡ handle, drag card | 44px handle |

**Keyboard behaviour:** Bottom sheet uses `max-height: 85vh` and **scrolls internally** when the on-screen keyboard opens. Sticky price footer stays **fixed above** keyboard (`visualViewport` resize). Sheet primary action remains visible without scrolling past keyboard.

**Sticky footer:** selling price + PDF (sales rep). Visualizer collapsible above cards.

**V1 QA gate:** add / edit / remove / reorder 4 layers on **375px width** without horizontal scroll on the layer list.

### 5.9 Empty, loading & error states (V1 — required)

| Surface | Empty | Loading | Error |
|---------|-------|---------|-------|
| **Dashboard** | “No estimates yet” + **New quote** CTA | Skeleton cards (3 rows) | Retry banner |
| **Template picker** | “No My Templates” + save hint | Skeleton grid | Retry |
| **Estimate list** | Illustration + CTA | Skeleton table | Inline message |
| **Library** | “Library seeding…” (first login only) | Skeleton rows | Retry |
| **Calculate** | — | Subtle spinner on price badge if client calc > 50ms | “Couldn’t save — draft kept locally” |
| **PDF generate** | — | Button loading state | Toast + retry |

First-run onboarding: register → currency → **pick first template** → land in editor with seeded layers (not blank intimidation).

---

## 6. Functional modules (V1)

### 6.1 My library (Decision #14)

Tenant-owned materials seeded from platform master on signup.

**Hierarchy:** `Category → Subcategory → Material`

**Material fields:** see §8. Tenant admin edits **`cost_per_kg_usd`** only (always USD). UI shows converted **display price** read-only beside the USD field when helpful.

### 6.10 Currency & display (Decision #22 — global estimator)

ES is **global**. There is no fixed region or dual selling-company model. Each tenant chooses a **display currency**; all raw material prices are stored and edited in **USD**.

#### Rules

| Layer | Currency |
|-------|----------|
| Platform seed + tenant **material library** | **USD only** (`cost_per_kg_usd`) |
| **Pricing engine** (`packages/engine`) | Computes in **USD** |
| **UI, slabs, PDF, dashboard** | Tenant **display currency** |
| **Estimate snapshot** | Frozen `display_currency_code` + `exchange_rate_usd_to_display` at save/calculate so old quotes do not change when FX moves |

#### Registration & onboarding

1. User registers → selects **display currency** (dropdown, ISO 4217).
2. Server calls **FX provider** → sets `exchange_rate_usd_to_display` (e.g. `1 USD = 3.6725 AED`).
3. User lands in app; library shows materials with USD input (admin) and display equivalent (optional column).
4. If FX fetch fails: show manual rate field immediately; block “finish setup” until rate > 0.

#### Exchange rate — auto default, manual override

| Mode | Behaviour |
|------|-----------|
| **`auto` (default)** | Server refreshes USD→display rate from web on signup, daily cron, and on **Refresh rate** in Settings |
| **`manual`** | Admin enters fixed `exchange_rate_usd_to_display`; auto refresh skipped until switched back to auto |

**Settings → Currency** (tenant_admin):

```
Display currency     [ AED ▼ ]     (change triggers new FX fetch)
Rate source          (•) Auto from web   ( ) Manual override
1 USD =              [ 3.6725 ] AED    [ Refresh now ]
Last updated         11 Jun 2026, 09:15 UTC (auto)
```

**Conversion formula:**

```
display_price = usd_price × exchange_rate_usd_to_display
```

All sale prices, slabs, plates/delivery inputs (if entered in display currency), and PDF totals use **display currency**. Engine receives USD material costs; server or client multiplies for display after calculate.

#### FX provider (implementation)

- **Server-side only** (API key in env, never exposed to browser).
- V1: single provider (e.g. ExchangeRate-API, Open Exchange Rates, or Fixer — pick at scaffold).
- Cache rate per tenant in `tenant_settings`; log `exchange_rate_updated_at`.
- Graceful fallback: if auto fetch fails, keep last known rate + banner “Rate may be stale — refresh or set manual.”

#### Visibility

- Sales rep sees prices **only in display currency** (never USD in default profile).
- Tenant admin sees **USD/kg** in Library edit form + optional display equivalent column.
- `material_cost_per_kg` visibility toggle applies to **display** amounts for reps; admin library always shows USD source field.

#### API summary

See §9.8 — `GET/PATCH /settings/currency`, `POST /settings/currency/refresh`.

---

### 6.2 Templates (Decision #4, #17)

- **Start from Template** or **Blank Canvas**
- **Standard templates (platform-seeded):** one per **PEBI parent product group** — **11 parents only**, no PG variants (Decision #17). See catalog below.
- **My Templates:** user saves structure + dimensions + process toggles (not prices — prices always live from library)
- Template record stores `material_id` + default micron per layer; locked layers optional

**Standard template catalog** (`ref_standard_templates` → copied to tenant on signup):

| Parent PG | Default `product_type` | Material | Structure | Notes |
|-----------|------------------------|----------|-----------|-------|
| Commercial Items Plain | `pouch` | PE | Mono | Mono PE bag path |
| Commercial Items Printed | `pouch` | PE | Mono | Mono PE printed bag |
| Industrial Items Plain | `roll` | PE | Mono | Mono PE industrial roll |
| Industrial Items Printed | `roll` | PE | Mono | Mono PE printed roll |
| Shrink Film Plain | `roll` | PE | Mono | Plain shrink roll |
| Shrink Film Printed | `roll` | PE | Mono | Printed shrink roll |
| Wide Film | `roll` | PE | Mono | Wide PE roll |
| Mono Layer Printed | `roll` | Non PE | Mono | Single printed web (BOPP/PP/Paper) |
| Shrink Sleeves | `sleeve` | Non PE | Mono | PVC or PET — sleeve dimension path (Decision #21) |
| Labels | `roll` | Non PE | Mono | Face stock varies — chosen per quote |
| Laminates | `roll` | Non PE | Multilayer | Duplex–Quadriplex family |

**Not seeded:** inactive PEBI PGs, **Lamination Film** (MES SFG), variant names (Duplex PE, Garbage Bags, etc.).

**Parent PG classification** (synced from PEBI `crm_product_groups` — Decision #17, owner confirmed 2026-06-11):

| Parent PG | Material | Structure | Substrate | ES group |
|-----------|----------|-----------|-----------|----------|
| Commercial Items Plain | PE | Mono | PE | A |
| Commercial Items Printed | PE | Mono | PE | A |
| Industrial Items Plain | PE | Mono | PE | A |
| Industrial Items Printed | PE | Mono | PE | A |
| Shrink Film Plain | PE | Mono | PE | A |
| Shrink Film Printed | PE | Mono | PE | A |
| Wide Film | PE | Mono | PE | A |
| Mono Layer Printed | Non PE | Mono | (variant) | B |
| Shrink Sleeves | Non PE | Mono | PVC / PET | B |
| Labels | Non PE | Mono | (variant) | B |
| Laminates | Non PE | Multilayer | (variant) | C |

**ES template picker groups:** A = PE Mono · B = Non PE Mono · C = Non PE Multilayer.

**Template picker UI:** grouped by ES group (PE Mono / Non PE Mono / Non PE Multilayer) + **Blank Canvas** + **My Templates** tab.

**Seed dimension keys:** Templates ship `default_dimensions` per `product_type` — roll/sleeve use `reel_width_mm`, `cutoff_mm`, `extra_printing_trim_mm`, `number_of_ups`, `pieces_per_cut` (roll only); pouch uses `open_width_mm`, `open_height_mm`, etc. Legacy seed keys (`width_mm`) normalize to `reel_width_mm` on import (scaffold Step 3).

#### 6.2.1 Printing web class & ink systems (Decision #19)

On every **printed** estimate (any template with an ink layer), show:

| UI label | Value | Ink material | Solid % | Solvent-mix (ink) |
|----------|-------|--------------|---------|-------------------|
| **Wide Web printing** | `wide_web` | Ink SB | 30 | Yes — ink-to-solvent ratio |
| **Narrow Web printing** | `narrow_web` | Ink UV | 100 | No |

**Defaults (owner locked):**

- **All printed templates default to Wide Web → Ink SB**, including **Labels** and **Shrink Sleeves**
- User switches to Narrow Web → engine replaces ink layer with **Ink UV**, hides ink solvent block
- Laminate stacks with **Adhesive SB** may still show solvent-mix for adhesive even when ink is UV (engine rule)

**Behaviour on change:**

```
wide_web  → ink layer material = Ink SB,  solid = 30, show solvent ratio if SB in stack
narrow_web → ink layer material = Ink UV, solid = 100, no solvent for ink
```

Separate **cost/kg** in tenant library for Ink SB and Ink UV. Not color-specific (no Black/White SKUs).

#### 6.2.2 Laminate layer expansion (Alu barrier)

**Default duplex (Laminates template):** PET + Ink SB + Adhesive SB + LDPE — microns user-variable.

**Add metallized barrier:** insert before PE sealant:

```
Adhesive SB + Aluminium + Adhesive SB
```

Canvas action: **Add metallized barrier** — inserts 3 rows above PE layer. See seed `layer_expansion_hint` in [ES_STANDARD_TEMPLATES_SEED.json](./ES_STANDARD_TEMPLATES_SEED.json).

### 6.3 Customers & history (Decision #3 + owner requirement)

**Customer record (V1):**

| Field | Type | Required |
|-------|------|----------|
| `company_name` | string | yes |
| `contact_name` | string | no |
| `email` | string | no |
| `phone` | string | no |
| `notes` | text | no |

**Customer detail page (V1 — required):**

- List of all estimates for this customer (newest first)
- Columns: ref #, job name, structure summary, status, date, total (top slab or selected)
- Actions per row: **Open** · **Re-quote with current prices** · **Duplicate as-is** (optional advanced)
- Button: **New estimate for this customer**

History is **estimate list**, not a separate CRM workspace (Phase 2).

### 6.4 Estimates & slabs (Decision #15)

Each estimate contains:

- Structure snapshot (layers, dimensions, processes)
- **Multiple slabs:** `{ quantity_kg, price_per_kg }` rows
- Margin % (tenant default overridable)
- Status lifecycle: `draft` → `sent` → `won` | `lost`

**Slab templates:** named presets e.g. `[1000, 2000, 5000, 10000]` kg.

### 6.5 Proposals (Decision #12)

Branded PDF with:

- Logo, footer, T&C from tenant settings
- Laminate SVG
- Spec table (GSM, width, cut-off, product type)
- **Slab pricing table**
- Validity date

### 6.6 Community templates — governance (future only)

**V1:** Private templates only (`visibility = 'private'`).

**Future marketplace — mandatory governance before launch:**

| Control | Rule |
|---------|------|
| Submission | Author submits; status `pending_review` |
| Validation | Platform admin verifies layer materials exist in reference taxonomy |
| Price policy | Marketplace templates **never** embed prices — only structure + microns |
| Quality score | Admin approval required; reject with reason |
| Liability | Disclaimer: “Verify material grades before quoting” |
| Versioning | Immutable version on publish; estimations pin `template_version` |

**Do not ship marketplace until governance API + admin UI exist.**

### 6.7 Operation cost visibility (Decision #18)

Operation/process costing is **tenant configuration** — hidden unless visibility profile allows (see §6.8).

| UI / API element | Default sales rep | tenant_admin |
|------------------|-------------------|--------------|
| Processes panel | Hidden | Visible |
| `proc_cost_kg`, process breakdown in API | Stripped | Full |
| Machine costs in Settings | Hidden | Visible |

Engine always applies admin-configured processes in sale price calculation.

### 6.8 Cost & markup visibility — user settings (Decision #20)

**Principle:** Sales reps quote from **structure + selling price**. They do **not** see how margin/markup/RM/operations build that price unless tenant admin explicitly enables it.

#### Visibility profile (per user + tenant default)

Stored on `users.visibility_profile` JSONB. Tenant default on `tenant_settings.default_user_visibility`. Admin overrides per user in **Settings → Team & visibility**.

```typescript
interface VisibilityProfile {
  // Structure & spec — usually ON for everyone
  structure_layers: boolean;      // default true
  layer_microns: boolean;         // default true
  dimensions: boolean;            // default true
  total_gsm: boolean;             // default true
  printing_web_class: boolean;    // default true

  // Dimensions — product spec (usually ON for rep)
  product_dimension_inputs: boolean;  // reel width, cut-off, ups, trim, open W/H — default true
  printing_web_width: boolean;        // computed web width badge — default true (read-only)
  film_density: boolean;              // derived spec — default true
  grams_per_piece: boolean;           // default false for rep; true on PDF optional

  // Dimensions — internal yield (OFF for rep default)
  yield_conversions: boolean;         // sqm/kg, lm/kg web+reel, pieces/kg — default false
  roll_after_slitting: boolean;       // OD/weight/length block — default false
  order_qty_unit_breakdown: boolean;  // kpcs/sqm/lm converted totals — default false
  alternate_price_units: boolean;     // per kpcs, sqm, lm sale columns — default false

  // Costing — OFF for sales rep default
  material_cost_per_kg: boolean;  // layer table display $/kg, library display prices (USD hidden from rep)
  cost_per_sqm: boolean;
  rm_cost_per_kg: boolean;        // sidebar raw material
  markup_percent: boolean;        // estimate markup field
  markup_amount: boolean;
  plates_per_kg: boolean;
  delivery_per_kg: boolean;
  operation_cost: boolean;
  cost_breakdown: boolean;        // % bar: material/waste/markup/process
  solvent_mix_cost: boolean;      // solvent $/kg input

  // Output — usually ON
  selling_price: boolean;         // default true
  slab_table: boolean;            // default true (selling columns only when costs hidden)
  proposal_pdf: boolean;          // default true
}
```

**Default `user` (sales rep) profile:**

```json
{
  "structure_layers": true, "layer_microns": true, "dimensions": true,
  "total_gsm": true, "printing_web_class": true,
  "product_dimension_inputs": true, "printing_web_width": true, "film_density": true,
  "grams_per_piece": false, "yield_conversions": false, "roll_after_slitting": false,
  "order_qty_unit_breakdown": false, "alternate_price_units": false,
  "material_cost_per_kg": false, "cost_per_sqm": false, "rm_cost_per_kg": false,
  "markup_percent": false, "markup_amount": false,
  "plates_per_kg": false, "delivery_per_kg": false,
  "operation_cost": false, "cost_breakdown": false, "solvent_mix_cost": false,
  "selling_price": true, "slab_table": true, "proposal_pdf": true
}
```

**Default `tenant_admin` profile:** all `true`.

#### Named presets (audit — primary UI)

Admins pick a **preset** first; full toggle grid is behind **Customize…**. Presets write the same `visibility_profile` JSONB.

| Preset | Intended user | Key flags |
|--------|---------------|-----------|
| **Selling price only** | Field sales rep | Default rep profile — structure + selling price + slabs + PDF |
| **Price + yields** | Technical rep | Above + `yield_conversions`, `printing_web_width`, `grams_per_piece` |
| **Full visibility** | Owner / costing admin | All `true` |

```
Settings → Team & visibility
├── Default preset for new users   [ Selling price only ▼ ]
├── User list
│   └── Sarah (user)  [Preset ▼]  [Customize…]  [Reset]
└── Preview as user…  → editor reflows per §5.7
```

#### Settings UI (tenant_admin only — advanced)

```
Settings → Team & visibility → Customize…
├── (full boolean toggles — see VisibilityProfile above)
```

#### API enforcement

- `POST /pricing/calculate` — response filtered by caller's `visibility_profile` (same rules as role strip, finer-grained)
- `GET /materials` — omit `cost_per_kg_usd` when `material_cost_per_kg: false`; never expose USD prices to rep unless profile allows admin-style library access
- Estimates PATCH — reject markup/plates/process fields if profile disallows
- Proposal PDF — never includes internal cost/markup (all users); customer-facing only

#### Mobile (same rules)

Sales rep on phone: same visibility — **only selling price + slabs + PDF** in sticky footer. No cost sections rendered (not hidden behind accordion).

### 6.9 Dimensions, yields & roll spec (Decision #21)

**Problem (owner audit):** ES PRD previously collapsed “width” into one field. Laravel and `Costing_form 25.2.25.xlsx` distinguish **reel width** (finished roll / product width after slitting) from **printing web width** (press/lamination width before slitting). Using the wrong width breaks pieces/kg, LM/kg, order qty → kg, and process run meters.

**Reference files:**

| File | Role |
|------|------|
| `PPH/Costing_form 25.2.25.xlsx` | Roll / Sleeve / Pouch / Data sheets — Excel formulas (I35, E35–E39) |
| `legacy-laravel/.../edit.blade.php` | `calculatePrintingFilWidth`, `calculatePiecesPerKg`, `calculateLinearMeterPerKg`, `calculateLLinearMeterPerKg`, roll-after-slitting |
| `PPH/Interplast_FP_Costing_*.html` | Supplementary — lane width for stick/sachet (Phase 1.1) |

#### 6.9.1 Width chain (all roll-path products)

```
printing_web_width_mm = (reel_width_mm × number_of_ups) + extra_printing_trim_mm
```

| Width | Meaning | Primary uses |
|-------|---------|--------------|
| **Reel width** | Slit finished width — what customer receives | Pieces/kg, grams/piece, roll OD weight, LM **order unit** → kg |
| **Printing web width** | Unslit lamination/print width | Linear m/kg (web), order meters for **printing/lamination** run hours |

#### 6.9.2 Product-type dimension sets

**Roll** (`product_type = roll`) — most PE mono templates:

| Field | DB column | Editable | Notes |
|-------|-----------|----------|-------|
| Reel width | `reel_width_mm` | Yes | Was misnamed `roll_width_mm` in draft schema |
| Cut-off | `cutoff_mm` | Yes | Repeat length |
| Extra printing trim | `extra_printing_trim_mm` | Yes | Added to web width |
| Pieces per cut | `pieces_per_cut` | Yes | Roll only |
| Number of ups | `number_of_ups` | Yes | Lanes across web |
| Printing web width | `printing_web_width_mm` | **Computed** | Read-only in UI |

**Sleeve** (`product_type = sleeve`) — Shrink Sleeves template:

Same as roll except `pieces_per_cut` fixed to 1; uses `reel_width_mm` as “real width”.

**Pouch** (`product_type = pouch`):

| Field | DB column |
|-------|-----------|
| Open width | `open_width_mm` |
| Open height | `open_height_mm` |
| Number of ups | `number_of_ups` |
| Extra printing trim | `extra_printing_trim_mm` |
| Lay-flat | `lay_flat_mm` (optional) |
| Zipper | `zipper_*` — Phase 1.1 if deferred |

#### 6.9.3 Derived yield fields (engine — port from COSTING_NOTES §7)

All computed server-side on every `/pricing/calculate`:

| Derived | Formula summary | Visibility default |
|---------|-----------------|-------------------|
| `film_density_g_cm3` | `total_gsm / total_micron` | Admin; rep sees on PDF spec if `total_gsm` on |
| `square_meter_per_kg` | `1000 / total_gsm` | Admin (`yield_conversions`) |
| `pieces_per_kg` | Uses **reel width** × cut-off × GSM | Admin |
| `grams_per_piece` | `1000 / pieces_per_kg` | Admin; rep may see on PDF |
| `linear_m_per_kg_web` | sqm/kg ÷ **printing web width** × 1000 | Admin |
| `linear_m_per_kg_reel` | sqm/kg ÷ **reel width** × 1000 | Admin |
| `order_kg` | From order qty + unit (§7.4 COSTING_NOTES) | Internal |
| `order_meters_web` | `order_kg × linear_m_per_kg_web` | Admin (process hours) |

#### 6.9.4 Order quantity & slabs

- Header field: **order quantity** + **unit** enum: `kgs` | `sqm` | `kpcs` | `lm` | `roll_500_lm`
- Engine normalizes to `order_kg` before slab loop and process costing
- **Slab table V1:** quantities in **kg** only; alternate unit price columns gated by `alternate_price_units` visibility (admin default ON, rep OFF)

#### 6.9.5 Roll after slitting (V1 — roll & sleeve)

Collapsible **“Roll spec”** panel (not costing):

| Field | Input / computed |
|-------|------------------|
| Core inside diameter | Input mm |
| Core thickness | Input mm |
| Roll OD (with core) | Input **or** reverse from required weight |
| Film on roll weight | Computed |
| Film on roll length | Computed |
| Roll width | Mirror of reel width |
| Pieces per roll | Computed |
| Required roll weight (no core) | Input for reverse OD |

Rep: hidden by default; PDF may show reel width + OD + length when `roll_after_slitting` enabled for user.

#### 6.9.6 UI placement

**Defaults (audit — simple happy path):** Every template seeds `number_of_ups: 1`, `extra_printing_trim_mm: 0` unless template explicitly needs multi-up (many pouches).

**Primary fields (always visible):** reel width / open W×H, cut-off.

**Collapsed disclosure — “Multi-up / trim”:** Contains `number_of_ups`, `extra_printing_trim_mm`, `pieces_per_cut` (roll). Auto-expands when template `default_dimensions` has `number_of_ups > 1`.

**Printing web width badge:** Read-only, rep-visible. Tooltip: *“Press/lamination width before slitting — not your finished reel width.”*

**Desktop:** Dimensions card below Laminate Visualizer — fields change by `product_type`.

**Mobile:** Dimensions in collapsible card above layer cards; same fields, no horizontal table.

**Admin-only rows:** yield conversions, roll-after-slitting detail, order unit breakdown — hidden unless visibility profile allows.

### 6.11 Pre-scaffold refinements (external audit — V1 vs defer)

| Item | V1 | Defer |
|------|-----|-------|
| Client-side `packages/engine` in web | ✅ §7.1 | — |
| Visibility presets | ✅ §6.8 | — |
| Dimensions UX (collapse ups/trim, tooltip) | ✅ §6.9.6 | — |
| Empty / loading / error states | ✅ §5.9 | — |
| Mobile keyboard + `inputmode` | ✅ §5.8 | — |
| Admin progressive disclosure | ✅ §5.7 | — |
| Preview-as-user reflow | ✅ §5.7 | — |
| Effective margin % label (admin) | ✅ §7.3 | — |
| Dashboard proposals expiring soon | ✅ §11 | — |
| Gold WCAG + light-only V1 | ✅ §5.2 | Dark mode → Phase 2 |
| Capacitor-wrap-ready architecture | ✅ §10.3 | Native shell → post-V1 |
| Offline draft sync | — | Phase 2 §4.3 |
| Undo Cmd+Z (layer edits) | — | **V1.1** §13 |
| Inline material price edit from estimate | — | **V1.1** §13 |
| Arabic RTL | — | Phase 2 §13 |

---

## 7. Pricing engine

### 7.1 Client + server engine (Decision #23)

**`packages/engine`** is **pure TypeScript, no I/O** — imported by **both** server and web (§10.3).

| Where | Role |
|-------|------|
| **`packages/web`** | Runs `calculate()` on **every input change** — **0ms perceived** price update in display currency (after USD result × tenant rate). Works offline for math if materials snapshot loaded. |
| **`packages/server`** | Same engine on `POST /pricing/calculate` — authoritative for **persistence**, **visibility stripping**, **audit**, **PDF**, **requote**. Debounced client call **250ms** after edit settles. |
| **Golden tests** | Single test suite on `packages/engine` — Laravel parity in USD |

**Flow:**

```
User edits micron
  → web: engine.calculate() immediately → update sticky price
  → web: debounce 250ms → POST /pricing/calculate → reconcile (should match); save draft
```

**Acceptance:** Price visible update **< 50ms** client-side on typical 4–8 layer stack; server round-trip must not block UI.

All calculations in USD internally; convert to display currency at UI boundary (§6.10).

### 7.2 Input DTO

```typescript
interface CalculateInput {
  layers: Array<{
    material_id: string;
    layer_type: 'substrate' | 'ink' | 'adhesive';  // Laravel typeSelect 1/2/3
    micron: number;
    // cost_per_kg_usd, density, solid_percent, waste_percent resolved server-side from tenant materials
  }>;
  solvent_mix?: {
    cost_per_kg_usd: number;       // global "Solvent-mix cost / kg" in USD — not a layer row
    gsm_ratio_denominator: number; // "Ratio of Solvent-Based Inks & Adhesives to Solvent-Mix"
  };
  dimensions: RollDimensions | SleeveDimensions | PouchDimensions;
  order_quantity?: {
    value: number;
    unit: 'kgs' | 'sqm' | 'kpcs' | 'lm' | 'roll_500_lm';
  };
  roll_spec?: RollAfterSlittingInput;  // optional — roll/sleeve only
  processes: Array<{
    process_key: string;
    enabled: boolean;
    speed: number;
    setup_hrs: number;
  }>;
  markup_percent: number;        // additive line — NOT margin-on-cost
  plates_per_kg: number;
  delivery_per_kg: number;
  printing_web_class?: 'wide_web' | 'narrow_web';  // null if no ink layer; default wide_web
  slabs: Array<{ quantity_kg: number }>;
  product_type: 'roll' | 'sleeve' | 'pouch';
}

interface RollDimensions {
  reel_width_mm: number;           // finished slit width (Laravel roll-real-width)
  cutoff_mm: number;
  extra_printing_trim_mm: number;
  pieces_per_cut: number;
  number_of_ups: number;
  // printing_web_width_mm computed — do not accept client override
}

interface SleeveDimensions {
  reel_width_mm: number;           // real width (Laravel real-width-value)
  cutoff_mm: number;
  extra_printing_trim_mm: number;
  number_of_ups: number;
}

interface PouchDimensions {
  open_width_mm: number;
  open_height_mm: number;
  number_of_ups: number;
  extra_printing_trim_mm: number;
  lay_flat_mm?: number;
  zipper_enabled?: boolean;
  zipper_weight_g_m?: number;
  zipper_cost_per_m?: number;
}

interface RollAfterSlittingInput {
  core_inside_diameter_mm: number;
  core_thickness_mm?: number;
  roll_outside_diameter_mm?: number;   // forward calc
  required_roll_weight_kg?: number;    // reverse OD — mutually exclusive with OD input
}
```

**Material model (Laravel parity + Decision #19):** Three layer types. **Printing web class** drives ink:

- **Wide Web printing** (default) → **Ink SB** (30% solid) + ink-to-solvent ratio
- **Narrow Web printing** → **Ink UV** (100% solid), no solvent for ink

Defaults **Wide Web / SB** for all printed PGs including Labels and Shrink Sleeves. **Adhesive SB** for lamination. **Microns always user-variable.**

**Laminate:** duplex default OK; **Alu barrier** = Adhesive SB + Aluminium + Adhesive SB before PE.

See [`ES_MEMORY.md`](./ES_MEMORY.md), [`legacy-laravel/COSTING_NOTES.md`](./legacy-laravel/COSTING_NOTES.md).

### 7.3 Formulas (port from Laravel — **not** PEBI §9.2)

**Per layer `i` (dry GSM model — V1):**

```
// Substrate (layer_type = substrate)
gsm[i]     = micron[i] × density[i]
cost_m2[i] = (gsm[i] / 1000) × cost_per_kg[i]

// Ink or Adhesive (layer_type = ink | adhesive)
// User enters DRY gsm on the layer (solids remaining on film after flash-off).
// layer.micron stores dry gsm. Library cost_per_kg is dry-equivalent:
//   cost_per_kg_dry = liquid_price / (solid_percent / 100)
gsm[i]     = dry_gsm entered by user
cost_m2[i] = (dry_gsm / 1000) × cost_per_kg_dry
```

**Structure totals:**

```
total_gsm     = Σ gsm[i]
total_micron  = Σ substrate_micron + Σ ink/adhesive_dry_gsm
total_cost_m2 = Σ cost_m2[i] + solvent_mix_cost_m2
mat_cost_kg   = (total_cost_m2 / total_gsm) × 1000
```

**Solvent-mix block** (auto when stack contains SB ink and/or SB adhesive; hidden for UV-only ink):

Solvents are **not laminate layers**. They live in Raw Materials → **Solvent** tab (`layer_type = solvent`). Default selection: **Solvent Common** (average $/kg and density of catalog solvents — recalculated when master solvents are saved).

**SB adhesive (lamination):** Master stores **binder concentrate** ($/kg solid on layer row). **Ethyl acetate** is priced separately from the recipe:

```
mix_solid% = Σ(parts × solid%) / Σ(parts)
wet_gsm = dry_gsm / mix_solid%
ea_gsm = wet_gsm × (ea_parts / total_parts)
lamination_solvent_cost_m2 = (ea_gsm / 1000) × solvent_$/kg
```

- Default recipes: **GP / MP / HP** on master adhesive rows (`laminationRecipe` JSON).
- **Per-quote override (Option B):** `laminationRecipeOverrides` keyed by layer id.
- `selected_solvent` = estimate `solvent_material_id` → tenant library (default **Solvent Common**); `solvent_cost_per_kg_usd` overridable on quote.

**Press cleaning (SB ink jobs):**

```
cleaning_solvent_cost_per_kg = (cleaning_kg_per_job × solvent_$/kg) / order_kg
```

- Default **20 kg EA/job** — editable in Master Data → Solvent tab and per estimate.
- Allocated only when stack contains **SB ink**.

```
solvent_mix_cost_per_kg = lamination_solvent_cost_per_kg + cleaning_solvent_cost_per_kg
```

Legacy `solvent_ratio` / dry-GSM ÷ ratio model is **retired** for adhesive costing (column kept for backward compatibility).

Engine sets `solvent_mix_enabled = stackNeedsSolventMix(layers)` (SB ink or SB adhesive present).

**Operations** (admin-configured; still included in sale price for all users):

```
process_total[j] = round(process_cost_hr[j] × run_hrs[j])
operation_per_kg = Σ checked process_total / order_kg
```

Run hours use `order_kg` (extrusion) or `order_meters_web` (printing/lamination, from **printing web width** LM/kg) or `order_kpcs` (pouch converting). See `COSTING_NOTES.md` §7.6.

### 7.3.1 Dimension & yield formulas (Decision #21)

Port from `COSTING_NOTES.md` §7 — full chain:

```
film_density_g_cm3     = total_gsm / total_micron
square_meter_per_kg    = 1000 / total_gsm

// Roll / sleeve
printing_web_width_mm  = (reel_width_mm × number_of_ups) + extra_printing_trim_mm
pieces_per_kg          = (1000 / (reel_width_mm × cutoff_mm × total_gsm × 1e-6)) × pieces_per_cut_roll
linear_m_per_kg_web    = (square_meter_per_kg / printing_web_width_mm) × 1000
linear_m_per_kg_reel   = (square_meter_per_kg / reel_width_mm) × 1000

// Pouch — pieces_per_cut = 1; hidden LM uses open_height_mm
printing_web_width_mm  = (open_width_mm × number_of_ups) + extra_printing_trim_mm
pieces_per_kg          = 1000 / (open_width_mm × open_height_mm × total_gsm × 1e-6)
linear_m_per_kg_reel   = (square_meter_per_kg / open_height_mm) × 1000

grams_per_piece        = 1000 / pieces_per_kg
order_kg               = f(order_quantity, unit)   // see COSTING_NOTES §7.4
order_meters_web       = order_kg × linear_m_per_kg_web
```

**Roll after slitting** (when `roll_spec` provided): see COSTING_NOTES §7.5.

**Sale price per kg — additive columns (Laravel `calculateLastKg`, not `cost × (1+margin%)`):**

```
markup_per_kg   = mat_cost_kg × (markup_percent / 100)   // Laravel: markup ON MATERIAL ONLY
sale_price_kg   = mat_cost_kg + markup_per_kg + plates_per_kg + delivery_per_kg + operation_per_kg
effective_margin_pct = (sale_price_kg - mat_cost_kg - plates_per_kg - delivery_per_kg - operation_per_kg) / sale_price_kg × 100
                      // equals markup_per_kg / sale_price_kg × 100 when plates/delivery/operation are pass-through
```

**Admin UI labels (audit):** Field = **“Markup % (on material)”**. Sidebar shows **“Effective margin % (on sale price)”** so admins are not surprised when operation/plates dilute realized margin.

**Slab loop:** For each `quantity_kg` in slabs, recompute `order_kg`, process hours, `operation_per_kg`, and `sale_price_kg`. V1: optional manual `price_per_kg` override per slab.

Zipper (if enabled): port from Laravel `secondary_table` — Phase 1.1 if not in first template set.

### 7.4 Output DTO

```typescript
interface CalculateOutput {
  total_gsm: number;
  total_micron: number;
  derived_dimensions?: {              // filtered by visibility_profile
    film_density_g_cm3: number;
    square_meter_per_kg: number;
    printing_web_width_mm: number;
    pieces_per_kg: number;
    grams_per_piece: number;
    linear_m_per_kg_web: number;
    linear_m_per_kg_reel: number;
    order_kg: number;
    order_kpcs: number;
    order_meters_web: number;
    roll_spec?: {
      film_on_roll_weight_kg: number;
      film_on_roll_length_m: number;
      roll_width_mm: number;
      pieces_per_roll: number;
      roll_outside_diameter_mm?: number;
    };
  };
  mat_cost_kg: number;
  markup_percent: number;
  markup_per_kg: number;
  plates_per_kg: number;
  delivery_per_kg: number;
  proc_cost_kg?: number;       // tenant_admin only — omitted for user role
  sale_price_kg: number;       // sum of RM + markup + plates + delivery + operation
  effective_margin_pct?: number;  // tenant_admin only — on sale price; see §7.3
  breakdown: {
    material_pct: number;
    markup_pct: number;
    process_pct?: number;      // tenant_admin only
  };
  layer_breakdown: Array<{ name: string; gsm: number; cost_m2: number; pct: number }>;
  process_breakdown?: Array<{  // tenant_admin only
    process_key: string;
    cost_kg: number;
    pct: number;
  }>;
  slabs: Array<{
    quantity_kg: number;
    cost_per_kg: number;
    selling_price_per_kg: number;  // = sale_price_kg for that slab
    order_total: number;
  }>;
}
```

**Role filter:** `POST /pricing/calculate` reads JWT role; strips `proc_cost_kg`, `process_pct`, and `process_breakdown` when `role = user`. Totals and slab prices remain identical.

### 7.5 Re-quote price refresh algorithm

```
POST /estimates/:id/requote

1. Load source estimation + layers + dimensions + processes + slabs (structure only)
2. For each layer:
     m = materials.find(layer.material_id) // tenant library TODAY
     if !m → flag layer.material_stale = true, keep last snapshot values + warning
     else → use m.cost_per_kg_usd, m.waste_percent, m.density, m.solid_percent
3. Create new estimation row, source_estimation_id = :id
     Set display_currency_code + exchange_rate_usd_to_display from tenant_settings NOW
     (do NOT copy FX fields from source — re-quote always uses current tenant currency/rate per §6.10)
4. Return new estimation id + price_delta summary for UI banner
```

**Currency on re-quote:** The new row inherits **structure and markup %** from the source, but **`display_currency_code` and `exchange_rate_usd_to_display` always come from the tenant’s current Settings** (auto-refreshed or manual), not from the source estimate — so RM is refreshed in USD and selling prices are re-displayed at today’s rate (important for volatile display currencies; stable pegs like AED/SAR behave the same either way).

### 7.6 Performance

- **Client calculate:** immediate (no debounce on UI path)
- **Server `/pricing/calculate`:** debounce **250ms** from web; rate limit **60 req/min/user**
- Redis cache key: `SHA256(input without margin)` TTL **60s** (optional V1.1)

---

## 8. Data model (PostgreSQL)

**Convention:** all tenant tables include `tenant_id UUID NOT NULL`. Platform reference DB separate.

### 8.1 Platform reference (`es_reference`)

```sql
CREATE TABLE ref_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(120) NOT NULL,
  sort_order  INT DEFAULT 0
);

CREATE TABLE ref_subcategories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID NOT NULL REFERENCES ref_categories(id),
  name         VARCHAR(120) NOT NULL
);

CREATE TABLE ref_materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id  UUID NOT NULL REFERENCES ref_subcategories(id),
  name            VARCHAR(255) NOT NULL,
  layer_type      VARCHAR(32) NOT NULL, -- substrate|ink|adhesive|foil|extrusion|coating
  solid_percent   DECIMAL(5,2),
  density         DECIMAL(6,4),
  default_cost_usd DECIMAL(10,4),       -- platform seed hint (USD/kg)
  default_waste   DECIMAL(5,2),
  default_micron  DECIMAL(8,2),
  active          BOOLEAN DEFAULT true
);

-- Platform standard structures — one row per PEBI parent PG (Decision #17)
CREATE TABLE ref_standard_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pebi_parent_pg    VARCHAR(120) NOT NULL UNIQUE,
  name              VARCHAR(255) NOT NULL,
  product_type      VARCHAR(16) NOT NULL CHECK (product_type IN ('roll','pouch')),
  material_class    VARCHAR(16) NOT NULL CHECK (material_class IN ('PE','Non PE')),
  structure_type    VARCHAR(16) NOT NULL CHECK (structure_type IN ('Mono','Multilayer')),
  substrate_origin  VARCHAR(32),
  display_order     INT DEFAULT 0,
  default_layers    JSONB NOT NULL,   -- [{ ref_material_id, micron, layer_order }]
  default_processes JSONB NOT NULL,   -- [{ process_key, enabled, default_speed, default_setup_hrs }]
  active            BOOLEAN DEFAULT true
);
```

### 8.2 Tenant core

```sql
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          VARCHAR(16) NOT NULL CHECK (type IN ('individual','company')),
  name          VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255),
  role          VARCHAR(16) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user','tenant_admin')),
  visibility_profile JSONB NOT NULL DEFAULT '{}',  -- merged with tenant default; see §6.8
  language      VARCHAR(2) DEFAULT 'en',
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenant_settings (
  tenant_id           UUID PRIMARY KEY REFERENCES tenants(id),
  display_currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
  currency_symbol     VARCHAR(8) DEFAULT '$',
  exchange_rate_usd_to_display DECIMAL(12,6) NOT NULL DEFAULT 1,  -- 1 USD = X display
  exchange_rate_source VARCHAR(8) NOT NULL DEFAULT 'auto'
                        CHECK (exchange_rate_source IN ('auto','manual')),
  exchange_rate_updated_at TIMESTAMPTZ,
  locale              VARCHAR(16) DEFAULT 'en-US',   -- date/number formatting
  default_margin_pct  DECIMAL(5,2) DEFAULT 15,
  logo_url            TEXT,
  brand_color         VARCHAR(7) DEFAULT '#0F1F3D',
  proposal_footer     TEXT,
  terms_text          TEXT,
  quotation_valid_days INT DEFAULT 30,
  machine_costs       JSONB DEFAULT '{}',
  default_user_visibility JSONB NOT NULL DEFAULT '{}',  -- sales rep defaults §6.8
  updated_at          TIMESTAMPTZ DEFAULT now()
);
```

### 8.3 Materials library (tenant copy)

```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        VARCHAR(120) NOT NULL,
  UNIQUE(tenant_id, name)
);

CREATE TABLE subcategories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  category_id  UUID NOT NULL REFERENCES categories(id),
  name         VARCHAR(120) NOT NULL
);

CREATE TABLE materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  subcategory_id  UUID NOT NULL REFERENCES subcategories(id),
  name            VARCHAR(255) NOT NULL,
  layer_type      VARCHAR(32) NOT NULL,
  solid_percent   DECIMAL(5,2) NOT NULL,
  density         DECIMAL(6,4) NOT NULL,
  cost_per_kg_usd    DECIMAL(10,4) NOT NULL,  -- always USD; see §6.10
  waste_percent   DECIMAL(5,2) NOT NULL DEFAULT 0,
  micron_min      DECIMAL(8,2),
  micron_max      DECIMAL(8,2),
  active          BOOLEAN DEFAULT true,
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### 8.4 Customers

```sql
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  company_name  VARCHAR(255) NOT NULL,
  contact_name  VARCHAR(255),
  email         VARCHAR(255),
  phone         VARCHAR(50),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_name ON customers(tenant_id, company_name);
```

### 8.5 Templates

```sql
CREATE TABLE structure_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  name             VARCHAR(255) NOT NULL,
  code             VARCHAR(50),
  pebi_parent_pg   VARCHAR(120),  -- set when cloned from ref_standard_templates; null for My Templates
  product_type     VARCHAR(16) NOT NULL CHECK (product_type IN ('roll','pouch')),
  visibility       VARCHAR(16) DEFAULT 'private', -- private|workspace|marketplace (latter phases)
  is_standard      BOOLEAN DEFAULT false,  -- true for platform-seeded parent PG copies
  version          INT DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE template_layers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES structure_templates(id) ON DELETE CASCADE,
  layer_order     INT NOT NULL,
  material_id     UUID REFERENCES materials(id),
  default_micron  DECIMAL(8,2) NOT NULL,
  locked          BOOLEAN DEFAULT false
);

CREATE TABLE template_processes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES structure_templates(id) ON DELETE CASCADE,
  process_key     VARCHAR(64) NOT NULL,
  enabled         BOOLEAN DEFAULT true,
  default_speed   DECIMAL(10,2),
  default_setup_hrs DECIMAL(6,2)
);

CREATE TABLE slab_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        VARCHAR(120) NOT NULL,
  quantities  JSONB NOT NULL  -- [1000, 2000, 5000, 10000]
);
```

### 8.6 Estimations

```sql
CREATE TABLE estimations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  user_id               UUID NOT NULL REFERENCES users(id),
  customer_id           UUID REFERENCES customers(id),
  source_estimation_id  UUID REFERENCES estimations(id),  -- re-quote lineage
  template_id           UUID REFERENCES structure_templates(id),
  job_name              VARCHAR(255) NOT NULL,
  product_type          VARCHAR(16) NOT NULL,
  project_number        VARCHAR(50),  -- e.g. QT-2026-00142
  project_date          DATE DEFAULT CURRENT_DATE,
  status                VARCHAR(16) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','sent','won','lost')),
  printing_web_class    VARCHAR(16) CHECK (printing_web_class IN ('wide_web','narrow_web')),
  markup_percent        DECIMAL(5,2),
  display_currency_code VARCHAR(3),              -- snapshot at last calculate/save
  exchange_rate_usd_to_display DECIMAL(12,6),    -- frozen for this quote
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE estimation_layers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id   UUID NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
  layer_order     INT NOT NULL,
  material_id     UUID REFERENCES materials(id),
  material_name   VARCHAR(255) NOT NULL,  -- snapshot label
  layer_type      VARCHAR(32) NOT NULL,
  micron          DECIMAL(8,2) NOT NULL,
  density         DECIMAL(6,4) NOT NULL,
  solid_percent   DECIMAL(5,2) NOT NULL,
  waste_percent   DECIMAL(5,2) NOT NULL,
  cost_per_kg_usd DECIMAL(10,4) NOT NULL,  -- USD snapshot at calculate time
  gsm             DECIMAL(8,4),
  cost_per_sqm    DECIMAL(10,6)
);

CREATE TABLE estimation_dimensions (
  estimation_id             UUID PRIMARY KEY REFERENCES estimations(id) ON DELETE CASCADE,
  product_type              VARCHAR(16) NOT NULL,  -- roll | sleeve | pouch
  -- Roll / sleeve path
  reel_width_mm             DECIMAL(10,2),        -- finished slit width (NOT printing width)
  cutoff_mm                 DECIMAL(10,2),
  extra_printing_trim_mm    DECIMAL(10,2),
  pieces_per_cut            INT DEFAULT 1,
  number_of_ups             INT DEFAULT 1,
  printing_web_width_mm     DECIMAL(10,2),        -- computed snapshot at save
  -- Pouch path
  open_width_mm             DECIMAL(10,2),
  open_height_mm            DECIMAL(10,2),
  lay_flat_mm               DECIMAL(10,2),
  -- Order qty header
  order_quantity            DECIMAL(14,2),
  order_quantity_unit       VARCHAR(16) DEFAULT 'kgs',
  -- Roll after slitting (optional)
  core_inside_diameter_mm   DECIMAL(10,2),
  core_thickness_mm         DECIMAL(10,2),
  roll_outside_diameter_mm  DECIMAL(10,2),
  required_roll_weight_kg   DECIMAL(12,4),
  -- Zipper (pouch — Phase 1.1)
  zipper_enabled            BOOLEAN DEFAULT false,
  zipper_weight_g_m         DECIMAL(10,4),
  zipper_cost_per_m         DECIMAL(10,4)
);

CREATE TABLE estimation_processes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id     UUID NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
  process_key       VARCHAR(64) NOT NULL,
  enabled           BOOLEAN DEFAULT false,
  speed             DECIMAL(10,2),
  setup_hrs         DECIMAL(6,2),
  machine_cost_hr   DECIMAL(10,4),
  run_hrs           DECIMAL(8,2),
  total_cost        DECIMAL(12,4)
);

CREATE TABLE estimation_slabs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id   UUID NOT NULL REFERENCES estimations(id) ON DELETE CASCADE,
  sort_order      INT NOT NULL,
  quantity_kg     DECIMAL(12,2) NOT NULL,
  price_per_kg    DECIMAL(10,4),      -- if null, use engine output
  selling_total   DECIMAL(14,2)
);

CREATE TABLE estimation_costs (
  estimation_id     UUID PRIMARY KEY REFERENCES estimations(id) ON DELETE CASCADE,
  total_gsm         DECIMAL(8,4),
  mat_cost_kg       DECIMAL(10,4),
  proc_cost_kg      DECIMAL(10,4),
  total_cost_kg     DECIMAL(10,4),
  breakdown_json    JSONB,
  computed_at       TIMESTAMPTZ DEFAULT now()
);
```

### 8.7 Proposals

```sql
CREATE TABLE proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  estimation_id   UUID NOT NULL REFERENCES estimations(id),
  pdf_url         TEXT,
  valid_until     DATE,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 8.8 Indexes

```sql
CREATE INDEX idx_est_tenant_status ON estimations(tenant_id, status);
CREATE INDEX idx_est_customer ON estimations(customer_id, created_at DESC);
CREATE INDEX idx_est_source ON estimations(source_estimation_id);
CREATE INDEX idx_layers_est ON estimation_layers(estimation_id, layer_order);
CREATE INDEX idx_materials_tenant ON materials(tenant_id, active);
```

---

## 9. API specification

**Base:** `/api/v1` · **Auth:** Bearer JWT · **Tenant:** from JWT claim, never from body.

### 9.1 Auth

```
POST   /auth/register          { email, password, name, tenant_type?, display_currency_code }
                               → provisions tenant, copies library (USD), fetches FX rate
POST   /auth/login             { email, password }
POST   /auth/refresh
GET    /auth/me
```

### 9.2 Customers

```
GET    /customers
POST   /customers              { company_name, contact_name?, email?, phone?, notes? }
GET    /customers/:id
PATCH  /customers/:id
GET    /customers/:id/estimates    ← history list (required)
GET    /customers/autocomplete?q=  ← min 2 chars
```

### 9.3 Materials & library

```
GET    /materials?search=
PATCH  /materials/:id          { cost_per_kg_usd?, waste_percent?, ... }
                               Response includes `cost_per_kg_display` when caller is admin
GET    /categories
GET    /subcategories?category_id=
```

### 9.4 Templates

```
GET    /templates                    ?standard_only=true  → 11 parent PG templates
POST   /templates                    { name, product_type, layers[], processes[] }
GET    /templates/:id
PATCH  /templates/:id
POST   /templates/:id/instantiate-estimate   → creates draft from template
```

On tenant provisioning: copy all `ref_standard_templates` rows → tenant `structure_templates` (`is_standard=true`, `pebi_parent_pg` set).

### 9.5 Pricing

```
POST   /pricing/calculate
Body:  CalculateInput (§7.2)
Response: CalculateOutput (§7.4) — filtered by visibility_profile + role (§6.7, §6.8)
```

### 9.5b Tenant settings & team visibility

```
GET    /tenant-settings
PATCH  /tenant-settings              tenant_admin — machine_costs, default_user_visibility, branding
GET    /users                         tenant_admin — team list
PATCH  /users/:id/visibility          tenant_admin — visibility_profile JSONB (§6.8)
GET    /users/me/visibility           effective profile for current user
```

### 9.6 Estimations

```
GET    /estimations?customer_id=&status=
POST   /estimations            { customer_id?, job_name, product_type, ... }
GET    /estimations/:id
PATCH  /estimations/:id
DELETE /estimations/:id        soft delete
POST   /estimations/:id/requote              ← **re-quote @ current RM prices**
POST   /estimations/:id/duplicate          ← copy structure AND frozen prices (optional)
POST   /estimations/:id/mark-sent
POST   /estimations/:id/mark-won
POST   /estimations/:id/mark-lost           { reason? }
```

**Re-quote response example:**

```json
{
  "estimation_id": "uuid-new",
  "source_estimation_id": "uuid-old",
  "price_changes": [
    { "material": "PET 12µ", "was_usd": 2.23, "now_usd": 2.37, "was_display": 8.20, "now_display": 8.70, "currency": "AED" }
  ],
  "warnings": []
}
```

### 9.7 Proposals

```
POST   /proposals              { estimation_id }
GET    /proposals/:id/pdf
```

### 9.8 Settings

```
GET    /settings
PATCH  /settings               { default_margin_pct, proposal_footer, locale?, ... }
POST   /settings/logo          multipart

GET    /settings/currency
PATCH  /settings/currency      { display_currency_code?, exchange_rate_source?, exchange_rate_usd_to_display? }
                               -- changing display_currency_code triggers auto FX fetch when source=auto
POST   /settings/currency/refresh   -- force fetch latest USD→display rate (auto mode)
GET    /settings/currency/supported -- ISO list for registration dropdown (curated top ~40 + search)
```

### 9.9 Dashboard

```
GET    /dashboard/summary      { estimates_this_month, drafts, sent, recent[], expiring_proposals[] }
```

`expiring_proposals[]`: sent proposals where `valid_until` within next 7 days (uses `tenant_settings.quotation_valid_days` from send date).

**Not in V1 API:** `/estimations/:id/submit`, `/approve`, `/reject`, `/analytics/*` (enterprise).

---

## 10. Technical architecture

### 10.1 Stack (aligned with ProPackHub / FS — not PRD_v3_Final enterprise stack)

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | **React 18 + Vite 5** | Not Next.js unless marketing site separate |
| Mobile V1 | **Responsive + PWA** | Not React Native V1 |
| Backend | **Node 22 + TypeScript** | Mirror `propackhub-fs` |
| Engine | **`packages/engine`** pure TS | Jest golden tests |
| Database | **PostgreSQL 14+** | `es_reference` + tenant DBs |
| PDF | **Puppeteer** or PDFKit | SVG laminate embed |
| Auth | JWT 15m + refresh cookie | ProPackHub SSO Phase 2 |
| Deploy | pm2 + nginx | Standalone ES domain |

### 10.2 Repo layout

```
propackhub-es/
  app/
    packages/engine/
    packages/server/
    packages/web/
  deploy/
```

### 10.3 Boundaries

```
packages/web       → UI; imports packages/engine for instant calc; debounced API for save
packages/server    → HTTP, auth, tenancy, PDF, DB, FX fetch; imports packages/engine
packages/engine    → calculate(), no I/O — shared by web + server (Jest golden tests)
```

**Capacitor / native shell (post-V1):** Avoid browser-only APIs in core UI paths (no `window`-only file pick without fallback). V1 PWA must work in mobile Safari/Chrome; same React bundle should wrap in Capacitor later without engine changes.

---

## 11. Key screens (V1)

| Screen | Purpose |
|--------|---------|
| **Dashboard** | Recent estimates, quick new quote, counts, **proposals expiring within `quotation_valid_days`** (sent status, `valid_until` approaching) |
| Customers list | Search, add |
| **Customer detail** | **Estimate history + re-quote** |
| Library | Materials edit (prices) |
| My Templates | Grid with visualizer thumb |
| **Estimate editor (desktop)** | Split pane + table layers + Visualizer; visibility-filtered |
| **Estimate editor (mobile)** | Layer **cards** + bottom sheets + sticky price (§5.8) |
| Settings → Currency | Display currency, auto/manual FX, refresh rate (**tenant_admin**) |
| Settings → Team & visibility | Per-user cost field toggles (**tenant_admin**) |
| Settings → Operations | Machine costs/hr (**tenant_admin**) |
| Proposal preview | PDF — customer-facing, no internal cost |

**Mobile/PWA:** Same webapp — adaptive UI per §4.3, §5.8. Quote ≤ 3 min on phone (sales rep profile).

---

## 12. Proposal PDF (V1)

- Navy header + logo + quotation number
- Customer block
- **Laminate SVG**
- Specs: GSM, thickness, width, cut-off, product type
- **Slab table:** Quantity | Unit | Price/kg | Total
- Terms + validity
- No internal cost/margin on customer PDF

---

## 13. What we deliberately dropped from PRD_v3_Final.md

| PRD_v3_Final feature | ES v3 Final decision |
|----------------------|----------------------|
| Admin-only user creation | Self-registration |
| Manager / sales_rep roles | `user` + `tenant_admin`; operation UI admin-only (#18) |
| Approval workflow + WebSocket | **Removed V1** (#13) |
| Opportunity / revision model | **Re-quote** + `source_estimation_id` |
| Material price history | Phase 2 (#6) |
| Full CRM workspace | Simple customer + estimate history |
| React Native + Next.js | Vite + PWA |
| Actual vs estimated cost tables | Phase 2 |
| Full analytics module | Basic dashboard (#10) |
| Arabic RTL | Phase 2 |
| Undo (Cmd+Z) for layer stack | **V1.1** |
| Inline material USD price edit from estimate editor | **V1.1** (admin shortcut to Library row) |
| 6-tier unit pricing focus | **Slab table** primary (#15) |

---

## 14. Development phases

### 14.0 Pre-build (completed 2026-06-12)

| Step | Deliverable | Status |
|------|-------------|--------|
| 0 | Laravel audit → `COSTING_NOTES.md` | ✅ Done |
| 1 | `ES_STANDARD_TEMPLATES_SEED.json` v3 | ✅ Done |
| 2 | Wireframes + HTML mockup (desktop + mobile tab) | ✅ Done |
| — | Audit → [ES_AUDIT_HANDOFF.md](./ES_AUDIT_HANDOFF.md) | ✅ Done (owner proceeded to scaffold) |
| 3 | Scaffold monorepo (`packages/engine`, `server`, `web`) | ✅ Done (2026-06-14+) |
| 4 | Engine golden tests | ✅ Done (2026-06-18 — 18 tests) |

### 14.1 Post-scaffold phases (V1 — completed 2026-06-18)

| Phase | Weeks | Deliverables | Status |
|-------|-------|--------------|--------|
| **1 Foundation** | 1–4 | Auth, tenancy, library seed, materials CRUD, visibility presets, **engine in web + server**, unit tests | ✅ |
| **2 Visualizer + Estimate** | 5–8 | Visualizer, **desktop table + mobile cards**, calculate API (role + visibility filter), slabs | ✅ |
| **3 History + Re-quote** | 9–10 | Customer detail, `/requote`, price delta banner | ✅ |
| **4 Proposals** | 11–12 | PDF with SVG + slab table, branding settings | ✅ |
| **5 Platform** | 13–14 | ProPackHub SSO stub, platform admin master library | ✅ Partial — full SSO token exchange post-V1 |
| **6 Polish** | 15–16 | PWA, mobile QA gate (375px layer CRUD), Laravel golden tests | ✅ |

---

## 15. Acceptance criteria (V1)

*Verified against codebase 2026-06-18 — see [ES_IMPLEMENTATION_PLAN.md](./ES_IMPLEMENTATION_PLAN.md) §5.*

1. `tenant_admin` registers, receives seeded library + **11 parent PG templates**, first quote **< 15 min**, subsequent **< 3 min** (desktop).
2. **Client-side** price update **< 50ms** after edit; server reconcile within 300ms on good network.
3. Customer page + **Re-quote** refreshes `cost_per_kg_usd` from library today; delta shown in display currency.
4. Proposal PDF: slab table + structure SVG — **no internal cost/markup**.
5. **Sales rep profile:** no markup, RM, or cost breakdown in UI or `/pricing/calculate` response.
6. **Mobile QA (375px):** add, edit micron, delete, reorder **4 layers** via cards/sheets; decimal keypad; footer above keyboard.
7. **Visibility presets:** admin applies preset → UI and API reflect within same session; Customize… available.
8. Engine golden tests match Laravel reference rows (Step 4 gate).
9. No approval UI or API.
10. **Regular `user`** with default visibility: no Processes panel, machine rates, markup, or RM in UI/API.
11. **Dashboard** shows “expiring soon” proposals when applicable.
12. PEBI `/estimator` unchanged.

---

## Appendix A — Session consolidation (2026-06-11 → 2026-06-12)

| Topic | Outcome | PRD / artifact |
|-------|---------|----------------|
| Product scope | Standalone ES for sales; not PEBI | §1–§2 |
| Laravel audit | GSM, solvent-mix, additive sale price | `COSTING_NOTES.md`, §7 |
| Templates | 11 parent PGs; SB/UV ink; Adhesive SB; Alu insert | `ES_STANDARD_TEMPLATES_SEED.json` v3 |
| Printing web | Wide Web → Ink SB default; Narrow → UV | §6.2.1, Decision #19 |
| Operations UI | Admin-only | §6.7, Decision #18 |
| Cost visibility | Sales rep = selling price only; Settings toggles | §6.8, Decision #20 |
| Mobile | One webapp/PWA; cards + sheets on phone | §4.3, §5.8, mockup Mobile tab |
| External audit | Client engine, presets, UX states, margin labels | §5.7–§5.9, §6.8, §6.11, §7.1, Decision #23 |
| Currency | USD library + auto FX | §6.10, Decision #22 |
| Wireframes | WF-1–7 + HTML mockup | `ES_WIREFRAMES.md`, `mockup/` |
| Build gate | Audit → scaffold → golden tests → MVP | §14.0, `ES_AUDIT_HANDOFF.md` |

### Appendix A.1 — V1 build status (2026-06-18)

| Component | Status | Location / notes |
|-----------|--------|------------------|
| Monorepo | ✅ Built | `packages/engine`, `packages/server`, `packages/web` |
| PostgreSQL schema + auth | ✅ Built | Drizzle, JWT, tenant isolation |
| Costing engine | ✅ Built | `@es/engine` — Laravel parity; 18 golden/unit tests |
| REST API | ✅ Built | `/api/v1/*` — estimates, materials, customers, templates, settings, dashboard |
| Web app (desktop + mobile PWA) | ✅ Built | React + Vite; cards, bottom sheets, bottom nav |
| CI | ✅ Built | GitHub Actions — engine + server integration tests |
| §15 acceptance criteria #1–#8, #10–#11 | ✅ Pass | Implementation plan tracker |
| Full PEBI SSO token exchange | ⏳ Post-V1 | `PEBI_SSO_URL` login stub only |
| Push master library to existing tenants | ⏳ Post-V1 | New tenants get seed on register |
| Native app (Capacitor) | ⏳ Post-V1 | Per §21 — same React bundle, not wrapped yet |

**Supersedes stale line:** ~~Not built yet: codebase, engine, API server.~~

---

## 16. Document index

| File | Role |
|------|------|
| **[ES_AUDIT_HANDOFF.md](./ES_AUDIT_HANDOFF.md)** | **Auditor entry point** |
| **ES_PRD_v3_FINAL_BUILD_SPEC.md** | This file — **PRD v3.4** (V1 built) |
| [LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md) | Decisions #2–#23 |
| [ES_MEMORY.md](./ES_MEMORY.md) | Living session memory |
| [ES_WIREFRAMES.md](./ES_WIREFRAMES.md) | Wireframes |
| [mockup/es-estimate-editor.html](./mockup/es-estimate-editor.html) | Interactive mockup |
| [legacy-laravel/COSTING_NOTES.md](./legacy-laravel/COSTING_NOTES.md) | Engine source of truth |
| [ES_STANDARD_TEMPLATES_SEED.json](./ES_STANDARD_TEMPLATES_SEED.json) | Template seed v3 |
| PRD_v3_Final.md | Reference only (enterprise rejected parts) |
| ESTIMATION_STUDIO_MASTER_PLAN.md | Platform context |

---

*End of PRD v3.4 Audit-ready Build Specification*
