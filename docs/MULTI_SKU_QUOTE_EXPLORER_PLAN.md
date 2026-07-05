# Multi-SKU Quotes & Customer Explorer — Implementation Plan

**Status:** Phase 1–4 done — Phase 5 optional — amended 2026-07-04  
**Self-review:** 2026-07-04 — consistent; ready for Phase 1 (see §14)  
**Created:** 2026-07-04  
**Product:** ProPackHub Estimation Studio (`apps/estimation-studio/`)  
**Audience:** Any agent or developer implementing this feature  
**Related:** [AGENT.md](../AGENT.md) · [ES_MEMORY.md](./ES_MEMORY.md) · [LIVE_STATE.md](./LIVE_STATE.md) · [LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md)

---

## 0. Architectural principles (binding)

These principles override casual wording elsewhere in this doc. The original plan remains the foundation; this section hardens it toward a scalable CPQ workflow **without** redesigning the estimator.

### 0.1 Do not touch the costing engine

Do **not** modify: RM/GSM/solvent formulas, material price math, or invent a second quote-level calculator.

Allowed: wire **print colors × cost per color** into the existing tooling charge path (`toolingChargeUsd` / `toolingBilledToCustomer`); attach estimates to a quote container; and the **per-slab amortization denominator fix** (§0.4.1) — not RM/GSM formulas. Re-quote math stays the same except the new quote wrapper.

**Quote groups estimates. There is never a second costing engine for Quote.**

### 0.2 Quote vs Estimate (no “Line” entity)

Do **not** invent a business concept called Line that duplicates Estimate.

```text
Customer
  └── Quote              ← commercial container
        ├── Estimate     ← existing costing object (full engine)
        ├── Estimate
        └── Estimate
```

| Layer | Responsibility |
|-------|----------------|
| **Quote** | Commercial object: customer offer, terms, validity, status, combined review, multi-SKU PDF |
| **Estimate** | Engineering / costing object: structure, processes, dimensions, slabs, plates, sale price |

- Internally and in APIs: always **Estimate** (`estimates` table, `/estimates/...`).
- UI may show SKU labels (`200 ml`) or “4 estimates” — never a separate Line type in code or schema.
- Prefer API paths like `POST /quotes/:id/estimates` and `.../estimates/:estimateId/duplicate`, not `/lines`.

### 0.3 Quote owns commercial information

Move commercial fields to **Quote** whenever they are not required for per-SKU costing math.

**Quote holds (source of truth for the offer):** name, customer, salesperson, currency (commercial), validity, delivery terms, incoterm, payment terms, remarks, quote status, and future CRM-ish fields (§5.1).

**Estimate holds only what costing needs:** structure, layers, processes, dimensions, slabs, markup/CoRM/pricing method, plates/tooling **amounts** (engine inputs), per-estimate freight allocation if the engine needs it, frozen FX snapshot for calc integrity, `sku_label`, `brand`, status of that costed SKU.

**Currency rule (locked decision preserved):** each estimate still **snapshots** `display_currency` + `exchange_rate_usd_to_display` at create/calc time (old quotes must not drift). New estimates **inherit** currency/rate from the parent quote (or tenant defaults). Quote.display_currency is the commercial default; estimate snapshot remains the engine input.

**Do not** strip existing estimate columns in v1 if the editor/engine still reads them. Prefer: quote is authoritative for commercial UI; estimates inherit on create; deprecate duplicate commercial UI on the estimate over time.

### 0.4 Development costs (plates / cylinders / colors)

Interplast-style **print colors × cost per color** is in scope (not deferred).

| Concept | Where |
|---------|--------|
| **Print color count** | Per **estimate** (SKU may differ); quote may hold a **default** applied to new estimates |
| **Cost per color** | Display currency; quote default + per-estimate override |
| **Total development cost** | `colors × cost_per_color` (same currency) |

**Billing mode** (required mechanism — customer may pay separately):

| Mode | Effect on selling price /kg | Price list / PDF |
|------|----------------------------|------------------|
| **Amortized** | Include in /kg: `(colors × costPerColor) ÷ orderQuantityKg` | Shown inside unit price |
| **Separate** | **Not** included in /kg | Shown as a **separate lump line** (customer pays outside film price) |
| **Not billed** | Not included | Hidden or “absorbed” (company pays) |

**Amortization denominator (required engine fix — see §0.4.1):** for each **slab row**, `toolingCharge / slab.quantityKg` (and the same for lump delivery charge). Headline estimate sale price may still use order qty. Today’s engine keeps prepress/transport flat across slabs (`amortizeQtyKg = orderQuantityKg` only) — that **misprices** multi-qty price lists when mode = `amortized` (e.g. AED 4,000 cylinders → AED 8/kg at 500 kg vs AED 0.80/kg at 5,000 kg). Fix before shipping Phase 3 price list / amortized mode.

### 0.4.1 Engine: per-slab prepress/transport amortization (gate for Phase 3)

**Fact (current code):** `calculator.ts` calls `priceWithNewModel` per slab with varying `wasteQtyKg` but **fixed** `amortizeQtyKg = trueOrderQuantityKg`. Comment: “prepress and transport stay amortized over the entered order qty.” So development /kg is identical on every slab row.

**Required behavior for price lists:** when computing each slab’s `pricePerKg`, set `amortizeQtyKg = slab.quantityKg` (fallback to order qty if slab qty ≤ 0). Waste band selection stays on `wasteQtyKg = slab.quantityKg` as today.

| Scope | Touch |
|-------|--------|
| `packages/engine` `calculator.ts` slab loop | Pass per-slab `amortizeQtyKg` |
| Golden / pricing-model tests | Expect different development /kg per slab qty when tooling billed |
| Client preview (`estimateCalc.ts`) | Same path if it mirrors engine |

This is a **small, contained** engine change (amortization denominator only — not RM/GSM formulas). It benefits all estimates, not only multi-SKU quotes. **Phase 1 schema may proceed without it; Phase 3b/3c must not ship amortized price lists until this lands.**

Reuse existing engine knobs where possible (`toolingChargeUsd` + `toolingBilledToCustomer`), extended with an explicit `tooling_billing_mode` (`amortized` | `separate` | `not_billed`) and color inputs so agents do not invent a second tooling formula.

**Quote defaults vs estimates:** `default_print_color_count` / `default_cost_per_color` / `default_tooling_billing_mode` apply **on create** (and on “New structure” / first estimate). Changing quote defaults later does **not** auto-rewrite existing estimates (snapshot integrity). Optional Phase 5: “Apply quote color defaults to all estimates” (explicit user action). Combined price list and multi-SKU PDF must surface separate development charges when mode = `separate`.

### 0.5 Future-proof without implementing now

| Future capability | Schema / API discipline now |
|-------------------|----------------------------|
| **RFQ** | Nullable `quotes.rfq_id` (no `rfqs` table yet). Hierarchy becomes Customer → RFQ? → Quote → Estimates. |
| **Quote versioning** | Nullable `quotes.supersedes_quote_id`, `quotes.version_number` (default 1). Never overwrite commercial history in place when versioning ships. Re-quote v1 still creates a **new** quote (compatible with versioning). |
| **Global search** | Folder/explorer payloads include searchable fields (customer, quote name, estimate ref, sku, brand). Design `GET /search?q=` later; do not block on it. |
| **Dashboard stats** | Folder summary and list endpoints return counts suitable for rollups (customers, quotes, estimates, drafts, sent, expired). |
| **Multi-SKU PDF** | Structured sections (cover, quote summary, terms, per-estimate, signature) — not a dumb concat of PDFs. |
| **Extra quote fields** | Add nullable columns in Phase 1 even without UI (§5.1). |

### 0.6 Single-estimate workflow

A quote with **one** estimate must feel like today’s flow. No forced “single mode” vs “multi mode.”

### 0.7 Overall objective

Transform ES into a scalable **CPQ-style** commercial layer for flexible packaging while preserving the proven costing engine. Prioritize: clear responsibilities, future scalability, minimal impact on estimation logic, backward compatibility, clean relationships, reuse of existing components.

---

## 1. Task / scope

### 1.1 Problem

Today Estimation Studio treats every estimate as a **standalone row**: one customer, one structure, one price list. In real flexible-packaging sales, the same customer often needs **several SKUs in one commercial conversation**:

| Pattern | Example |
|---------|---------|
| Same structure, different quantity | Same label stack; 500 kg vs 2,000 kg slabs |
| Same structure, different width / size | 35 µ BOPP printed label — 200 ml, 330 ml, 500 ml, 1500 ml |
| Same structure, different brand | Same stack; Brand A vs Brand B on the label |
| Different structures entirely | Labels + a pouch on the same customer RFQ |

Users currently create separate estimates (`QT-2026-00008`, `QT-2026-00009`, …) and must open each one to compare prices. There is no first-class way to:

1. Group work **by customer** (folder / explorer).
2. Group related SKUs into **one quote** (one PDF, one review surface).
3. **Copy** an estimate they just costed and amend only what differs (size, brand, qty).
4. Review a **combined price list** across all SKUs on the quote.

The Estimates page is a **flat table** (ref, job, customer, status, price/kg). Multiple rows for the same customer appear as unrelated list items.

### 1.2 Goal

Deliver a **customer-first explorer** and a **quote package** model so that:

1. The Estimates page shows **customer folders** (not a flat estimate list as the primary view).
2. Opening a customer shows an **explorer**: quotes and estimates, organizable by brand, SKU, date, status.
3. Creating work starts with **customer → quote → one or more estimates**.
4. Multi-SKU quotes support **duplicate estimate → amend** (snapshot copy, not live-linked structure).
5. A **combined price list** is the primary commercial review surface (and later one structured multi-SKU PDF).
6. **Quote** owns commercial terms; **Estimate** remains the costing object (§0).

### 1.3 Success criteria (definition of done)

| # | Criterion |
|---|-----------|
| S1 | Estimates nav opens a **customer folder grid/list**, not only a flat estimate table. |
| S2 | Clicking a customer opens an **explorer** of that customer’s quotes and estimates (SKU, brand, date, status, price). |
| S3 | User can create a **quote** with **one estimate** (parity with today) or **multiple estimates**. |
| S4 | From a multi-SKU quote, user can **duplicate** an existing estimate and change only SKU name, brand, dimensions, and/or slabs. |
| S5 | User can add an estimate with a **completely different structure** on the same quote. |
| S6 | Quote workspace shows a **combined price list** as primary review (SKU, brand, structure, GSM, thickness, qty, unit, selling price, status + slab bands). |
| S7 | Costing engine is **unchanged** per estimate (each estimate is a full independent calculation). |
| S8 | Existing estimates are **migrated** into single-estimate quotes. |
| S9 | Re-quote, save, PDF (single-estimate), visibility, and tenant isolation still work. |
| S10 | Quote has a **summary** of commercial fields (customer, name, terms, validity, etc.). |
| S11 | No separate “Line” type in schema or API — only Quote and Estimate. |
| S12 | Estimate has **specs / item code**, **print color count**, **cost per color**, and **tooling billing mode** (amortized / separate / not billed). |
| S13 | Combined price list and quote PDF show development cost per mode (in /kg vs separate lump). |
| S14 | Non-100% solid RM (ink, SB adhesive, coatings) show a clear **hover** that library cost/kg is on a **solid** basis. |
| S15 | Layer build-up shows **Contrib. {CUR}/kg** per layer; chart shows µ/gsm in-bar when space allows; structure table keeps Material/Area only, with double-row headers + tighter widths (§4.11). |

### 1.4 Out of scope (this plan)

| Item | Notes |
|------|--------|
| Live-linked structure across estimates | Copy is snapshot only |
| Changing costing **formulas** for RM/GSM | Engine math stays; only wire color tooling + billing mode |
| Contract / competitor price fields | Explicitly **not** in scope (Interplast Contract 1/2) |
| RFQ entity / UI | Nullable `rfq_id` only |
| Quote versioning UI | Schema hooks only |
| Global search endpoint | Design-ready payloads only |
| Dashboard widgets | Count-friendly APIs only |
| PEBI / MES integration | ES remains a separate product |
| Spreadsheet-as-primary-editor | Matrix is for **review**, not building layers |
| Full ERP order entry | CPQ-style quotes and prices only |
| EstimateEditor split (audit 4.2) | Optional; not required |
| Undo stack, offline draft sync | Existing deferred items |

### 1.5 Non-goals / anti-patterns

- Do **not** invent a second costing model or a Line entity that duplicates Estimate.
- Do **not** lock the user into permanent “single mode” vs “multi mode” (single = quote with one estimate).
- Do **not** replace the Structure + Price list editor for the active estimate.
- Do **not** add instructional banners or helper prose beyond existing UI density rules (see workspace `keep-ui-clean`).
- Do **not** implement RFQ, versioning UI, or global search in v1 — only leave room in the schema/API.

---

## 2. Estimation Studio context (read before coding)

### 2.1 What ES is

| | |
|--|--|
| **Name** | ProPackHub Estimation Studio |
| **Role** | Flexible packaging **cost estimator** for independent sales / consultants |
| **Not** | PEBI MES `/estimator` — different users, licenses, auth |
| **Simplicity rule** | Same math and flow as legacy Laravel estimator |
| **Hero UI** | Laminate stack visualizer + slab price list + branded PDF + re-quote |

### 2.2 Current architecture (relevant pieces)

| Layer | Location | Role |
|-------|----------|------|
| Engine | `packages/engine` | `calculateEstimate()` — one structure, dimensions, slabs, processes |
| Server | `packages/server` | Drizzle schema, JWT, tenant-scoped REST |
| Web | `packages/web` | React app; `EstimateEditor.tsx` is Structure + Price list |
| Estimates list | `packages/web/src/pages/EstimatesList.tsx` | Flat table; search; customer filter; status/class pills |
| New estimate | `EstimateStart.tsx` → template or scratch | Optional `?customer=` query |
| Customers | `customers` table + `CustomerDetail.tsx` | CRUD; partial estimate list |
| Re-quote | `POST /api/v1/estimates/:id/requote` | Full clone with fresh material prices |

### 2.3 Current data model (estimates)

One row in `estimates` = one costed job:

- `customerId` (nullable)
- `refNumber` (e.g. `QT-2026-00008`)
- `jobName`, `productType`, `dimensions` (jsonb)
- layers, processes, slabs (child tables)
- pricing fields, sale price snapshot, status (`draft` / `saved` / …)

There is **no** parent “quote package” entity today. `sourceEstimationId` only tracks re-quote lineage.

### 2.4 Locked decisions that still apply

Agents must not break:

- Sale price formula (additive markup, not margin-only).
- Reel width ≠ printing web width.
- Currency rules (RM/freight USD; display currency for the rest; frozen snapshot on estimate).
- Client + server share `@es/engine`.
- Visibility profiles (strip cost fields for sales roles on list/PDF).

Read `docs/LOCKED_DECISIONS.md` and `docs/ES_MEMORY.md` costing section before schema changes.

### 2.5 UI baseline being replaced (Estimates page)

Current primary view (`/estimates`):

- Title **Estimates** + **New estimate**
- Search + “Filter by customer name…”
- Status pills (All / Drafts / Saved)
- Class pills (PE, Printed, Mono, Duplex, …)
- Flat table: Ref # · Job · Customer · Status · Price/kg · Open / Re-quote / Delete

**Target primary view:** customer folders first; drill into explorer; quotes and SKUs live under the customer.

---

## 3. Product model

### 3.1 Concepts

```text
Customer
  └── Quote              (commercial container — terms, validity, PDF, combined review)
        ├── Estimate     (costing object — structure, processes, dimensions, slabs)
        ├── Estimate
        └── Estimate
```

Future (not built now): `Customer → RFQ? → Quote → Estimates`.

| Concept | User-facing name | Implementation |
|---------|------------------|----------------|
| **Customer** | Customer folder | Existing `customers` row |
| **Quote** | Quote | New `quotes` table (commercial fields) |
| **Estimate** | Estimate / SKU row | Existing `estimates` row + `quote_id` + `sku_label` / `brand` |

**Single-SKU** = quote with exactly one estimate (same editor experience as today).  
**Multi-SKU** = quote with two or more estimates.

UI copy examples: “4 estimates”, “Add estimate”, “Duplicate estimate”. Avoid “line item” in code, routes, and schema.

Do **not** implement “single vs multi” as two separate products or permanent modes. Optional start chooser is only a shortcut.

### 3.2 Example (labels)

Customer: **Acme Beverages**  
Quote: **Summer labels RFQ — Jul 2026**

| Estimate | SKU | Brand | Structure | User action |
|----------|-----|-------|-----------|-------------|
| 1 | 200 ml | Brand A | 35 µ BOPP printed | Built fully |
| 2 | 330 ml | Brand A | *copied from 1* | Change dimensions + slabs |
| 3 | 500 ml | Brand A | *copied from 1* | Change dimensions + slabs |
| 4 | 1500 ml | Brand B | *copied from 1* | Change brand + dimensions + slabs |
| 5 | Stand-up pouch | Brand A | *new structure* | Template / scratch on same quote |

### 3.3 Copy semantics (critical)

| Rule | Detail |
|------|--------|
| **Snapshot** | Duplicate copies layers, processes, pricing fields, dimensions at clone time |
| **Not live-linked** | Editing estimate 1 later does **not** change estimates 2–N |
| **Amend after copy** | User edits SKU label, brand, dimensions, order qty / slabs on the new estimate |
| **Re-quote** | Clones an estimate into a **new quote** (version-friendly); sets `sourceEstimationId` as today |
| **Optional later** | “Re-apply structure from estimate X” — **not** in v1 |

Duplicate is **not** the same as re-quote:

| | Duplicate estimate (same quote) | Re-quote |
|--|-------------------------------|----------|
| Purpose | Another SKU on the same offer | New commercial version with fresh RM prices |
| Quote | Same `quote_id` | **New** quote (same customer; versioning-ready) |
| Material costs | **Keep** snapshot from source | Refresh from library |
| Identity | New estimate; user sets SKU / brand | Often `… (Re-quote)` on job name |

**v1 decision:** Duplicate keeps material cost snapshots (fast amend). Re-quote remains the path for fresh library prices and creates a new quote (does not mutate commercial history in place).

---

## 4. UX specification

### 4.1 Estimates page — customer folders (level 0)

**Route:** `/estimates` (replace primary content of `EstimatesList.tsx`; keep route name for nav).

**Layout:**

```text
┌─────────────────────────────────────────────────────────────┐
│ Estimates                              [New quote]          │
│ Search customers…                                           │
│ [All] [With drafts] [Recent]     (optional light filters)   │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ Acme Co      │ │ test a       │ │ (No customer)│          │
│ │ 3 quotes     │ │ 2 quotes     │ │ 1 quote      │          │
│ │ 18 estimates │ │ 4 estimates  │ │ 1 estimate   │          │
│ │ Last: Jul 4  │ │ Last: Jul 2  │ │ Last: Jun 30 │          │
│ │ 2 drafts     │ │             │ │ Draft        │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

**Each customer card shows (required):**

- Company name
- Quote count
- Estimate count
- Last activity date
- Draft indicator (count or badge if any draft quotes/estimates exist)

**Special folder:**

- **No customer** — estimates/quotes with `customer_id` null (keep for drafts started without a customer).

**Actions:**

- Click card → `/estimates/customers/:customerId` (explorer)
- **New quote** → create flow (§4.4); if no customer selected yet, require customer pick first (or allow “No customer” explicitly)

**Search at this level:** filters **customers** by name (and optionally by quote/SKU text via server search).

**Secondary access (keep, do not make primary):**

- Toggle or link: **“All estimates (flat list)”** for power users who want the old table (ref, job, price). Implement as a secondary view or `/estimates/all` so nothing is lost.

**Class filters (PE, Printed, Mono…):** apply inside the customer explorer and/or flat list, not necessarily on the folder grid (folders are customer-centric).

### 4.2 Customer explorer (level 1)

**Route:** `/estimates/customers/:customerId`

**Header:**

- Back to Estimates (folders)
- Customer name
- **New quote** (pre-bound to this customer)
- Search within customer (SKU, brand, quote name, ref #)

**Organization (explorer):**

Default grouping: **by quote**, newest first.

Within each quote:

```text
▼ Summer labels RFQ — Jul 2026          PKG-2026-00012 · Draft · 4 estimates
    200 ml · Brand A · BOPP / PET / PE · AED 5.17/kg · Draft · 2026-07-04
    330 ml · Brand A · BOPP / PET / PE · AED 5.05/kg · Draft · 2026-07-04
    …
    [Open quote]  [Combined price list]  [PDF]  [Delete quote]
```

**Sort / group controls** (toolbar):

| Control | Options |
|---------|---------|
| Group by | Quote (default) · Brand · SKU name · Date |
| Sort | Newest · Oldest · Name A–Z |
| Status | All · Draft · Saved |

When **Group by Brand**:

```text
▼ Brand A
    200 ml · Summer labels RFQ · …
    330 ml · Summer labels RFQ · …
▼ Brand B
    1500 ml · Summer labels RFQ · …
```

When **Group by SKU** or **Date**, same idea: explorer sections, each row is an **estimate** with parent quote name visible.

**Row actions:** Open estimate (workspace/editor), Open quote, Re-quote estimate, Delete estimate (with confirm; if last estimate on quote, confirm delete quote).

### 4.3 Quote workspace (level 2)

**Route:** `/quotes/:quoteId` (or `/estimates/quotes/:quoteId`)

```text
┌─────────────────────────────────────────────────────────────┐
│ ← Customer · Quote name · status     [Save] [PDF]           │
│ [Quote summary: terms · validity · incoterm · …]            │
├──────────┬──────────────────────────────────┬───────────────┤
│ Estimates│  Active estimate editor          │ Combined      │
│ ● 200 ml │  (existing EstimateEditor        │ price list    │
│   AED…   │   Structure + Price list)        │ (primary      │
│   Draft  │                                  │  commercial   │
│   BOPP/… │                                  │  review)      │
│   330 ml │                                  │               │
│ + Add    │                                  │               │
└──────────┴──────────────────────────────────┴───────────────┘
```

| Region | Behavior |
|--------|----------|
| **Quote summary** | Commercial panel (§4.7): customer, quote name, salesperson, currency, validity, incoterm, delivery, payment terms, remarks. Editable on the quote, not per estimate. |
| **Left rail** | Compact estimate cards (§4.3.1). Click switches active estimate. |
| **Center** | Existing estimate editor for `activeEstimateId` (reuse `EstimateEditor` with `estimateId` + `quoteId` context). |
| **Right / bottom** | Combined price list (§4.5) — **primary commercial review**. On narrow screens: tab “All SKUs” / bottom sheet. |

**Single-estimate quote:** hide rail (or collapse to one item) so the screen feels like today’s editor. Quote summary can stay compact/collapsed. Header shows **Quote ref** only (not a second equal estimate ref). Back navigates to customer explorer.

**Sent / lock (Phase 4):** when quote `status = sent` (or `sent_at` set), all child estimates are **read-only** in the editor (no structure/price edits). To change engineering: **Re-quote** (new quote — preferred for audit trail) or explicit **Unlock** (returns quote to `draft`/`saved`). Draft/saved quotes remain fully editable.

**Sent / lock (Phase 4):** when quote `status = sent` (or `sent_at` set), all child estimates are **read-only** in the editor (no structure/price edits). To change engineering: **Re-quote** (new quote) or explicit **Unlock** (returns quote to `draft`/`saved` — owner policy; default prefer re-quote for audit trail). Draft/saved quotes remain fully editable.

#### 4.3.1 Rail card (compact summary — required)

Each estimate in the rail shows more than a SKU name:

```text
● 200 ml
  AED 4.28/kg
  Draft
  BOPP / PET / PE
```

Fields: `sku_label` (or jobName), selling price/kg (display currency), status badge, short structure summary (layer materials). Users must understand which estimate they are opening without opening it.

**Add estimate menu:**

1. **Duplicate this estimate** (default when an estimate is selected)
2. **Duplicate from…** (pick another estimate on this quote)
3. **New structure** (template or scratch — existing start paths, then attach to quote)

### 4.4 Create flow

```text
New quote
  → Select customer (skip if already in customer explorer)
  → Optional: quote name / commercial defaults (currency, terms)
  → One estimate | Several estimates   (optional shortcut only)
  → First estimate: template | scratch (existing EstimateStart paths)
  → Editor for estimate 1
  → [Add estimate] when needed
```

**URL params (suggested):**

- `/estimate/new?customer=:id&quote=:quoteId`
- `/templates?customer=:id&quote=:quoteId`
- After instantiate template, create estimate with `quoteId` and `sortOrder`

**Customer required for multi-SKU?** Prefer requiring a customer when adding a second estimate (prompt to attach customer). Single-estimate drafts may still allow null customer (today’s behavior).

### 4.5 Combined price list (primary commercial review)

Shown in quote workspace (and optionally as a full-page `/quotes/:id/prices`). This is the main screen for comparing all estimates without opening each one.

| SKU | Specs code | Brand | Structure | Colors | Dev cost | Billing | Total GSM | Thickness | Order qty | Unit | Selling price | Status | Band prices… |
|-----|------------|-------|-----------|--------|----------|---------|-----------|-----------|-----------|------|---------------|--------|--------------|
| 200 ml | 1000578927 | Brand A | BOPP/PET/PE | 8 | AED 4,000 | Separate | 42.5 | 35 µ | 1000 | kg | AED 4.28/kg | Draft | … |

**Rules:**

- Each row = one **estimate**; prices from that estimate’s slab calculation (same engine as Price list tab).
- Include: SKU, **specs/item code**, brand, structure summary, **print colors**, **development cost** (`colors × costPerColor`), **billing mode**, total GSM, thickness, order quantity, unit, selling price (/kg **without** separate tooling when mode = separate), status; plus slab band columns when useful.
- When billing mode is **Separate**, show a quote-level (or per-row) **Development charges** block: e.g. `8 colors × AED 500 = AED 4,000 — billed separately` so commercial users do not think it is inside the film /kg.
- When **Amortized**, selling price /kg already includes the spread; optional column “incl. cylinders” is enough (no second lump).
- Click row → focus that estimate in the editor.
- Export: extend existing Excel export to all estimates on the quote (phase 3).
- PDF: structured multi-SKU proposal (phase 4), not a concat of single PDFs.

Respect **visibility profiles**: never expose hidden costing fields (markup, material cost, etc.) to restricted users.

**Development-cost fields are cost data:** gate `printColorCount`, `costPerColor`, `developmentTotal`, and separate lump lines with the **same** profile flags as plates/tooling (`platesPerKg` / tooling visibility — extend profile if needed). Do not leave them on explorer / combined price list / PDF for sales-rep profiles that cannot see plates. Selling price /kg remains visible.

### 4.6 Duplicate estimate dialog (“What changes?”)

Keep minimal (no long copy):

| Field | Default |
|-------|---------|
| SKU / size label | empty or “Copy of …” |
| Brand | same as source |
| Carry structure | on |
| Carry processes | on |
| Carry pricing (markup, CoRM, method) | on |
| Carry dimensions | on (user edits after) |
| Carry slabs | on (user edits after) |

On confirm: server clones estimate into same quote; client navigates to new estimate and focuses SKU / dimensions fields.

### 4.7 Quote summary panel

Every quote workspace includes a **Quote summary** (header strip or side panel) for commercial fields owned by the quote:

| Field | Notes |
|-------|--------|
| Customer | From `quotes.customer_id` |
| Quote name | |
| Salesperson | Nullable; UI optional in v1 |
| Currency | Commercial default; estimates snapshot on create |
| Validity (`valid_until`) | |
| Incoterm / delivery terms | |
| Payment terms | |
| Default print colors | Applied to new estimates |
| Default cost per color | Display currency |
| Default tooling billing mode | amortized / separate / not_billed |
| Remarks / notes | |

These fields are **not** edited on every estimate (except per-estimate overrides for colors / cost / mode / specs code). Estimate editor focuses on costing (structure, dimensions, price list) plus those overrides.

### 4.8 Multi-SKU PDF structure (phase 4 design)

Do **not** concatenate multiple single-estimate PDFs. Target structure:

1. Cover page  
2. Quote summary (customer, quote name, validity, commercial terms)  
3. Commercial terms (incoterm, payment, delivery, remarks)  
4. **Development / cylinder charges** (when any estimate uses `separate` or amortized totals)  
5. Estimate sections (one per estimate: SKU, **specs code**, structure, colors, price list)  
6. Final terms / signature  

Quote commercial fields must be sufficient to render sections 2–3 without reading estimate notes.

### 4.9 Specs / item code, colors, and development cost (estimate + quote)

From Interplast FP Costing review (Contract 1/2 **excluded**).

| Field | Level | Purpose |
|-------|-------|---------|
| `specs_code` / item code | **Estimate** | Plant/customer structure or item code (e.g. 10-digit). Searchable. Not used in math. |
| `print_color_count` | Estimate (quote default) | Number of print colors |
| `cost_per_color` | Estimate (quote default) | Display-currency cost per cylinder/plate/color |
| `tooling_billing_mode` | Estimate (quote default) | `amortized` \| `separate` \| `not_billed` |

**UI placement:**

- Quote summary: defaults for colors, cost/color, billing mode.
- Estimate job header (`JobHeaderFields`): specs/item code, colors, cost/color, billing mode (inherit from quote until overridden).
- Per-estimate Price list tab: if `separate`, show lump development line under the slab table; if `amortized`, unit prices include spread (existing tooling path).
- Combined price list: columns + separate-charges block (§4.5).

**Duplicate estimate:** copy colors, cost/color, billing mode, and specs code (user may edit specs code on the new SKU).

### 4.10 Solid-% RM hover (ink, SB adhesive, coatings)

ES library **cost/kg for ink / solvent-based adhesive / coatings is on a solid basis** (engine uses `solidPercent` for wet mass / solvent math). Users must see that without opening Master Data.

**Today:** micron/gsm cell has a minimal `title` (`Solid content: N%`) — easy to miss.

**Required UX (structure table):**

| Surface | Behavior |
|---------|----------|
| Material / grade cell | When `solidPercent < 100` (ink, adhesive, coating-type materials), show a subtle indicator (e.g. small “solid” chip or info icon — keep density low per `keep-ui-clean`) |
| Hover / focus tooltip | Clear text, e.g. **“Cost/kg is solid basis (35% solid). Wet ink cost is higher; solvent is costed separately.”** Use the material’s actual `solidPercent`. |
| 100% solid (UV ink, SL adhesive, substrates) | No chip; optional short tooltip only if useful (“100% solid — cost/kg is as-applied”) |

Do **not** change costing formulas. Tooltip is educational only. Prefer accessible `title` + visible affordance (icon), not a long paragraph in the grid.

Implement in `EstimateEditor` structure grid (and any material picker that shows cost/kg for partial-solid materials).

### 4.11 Layer build-up — contributed cost + in-chart µ/gsm (preferred)

**Owner direction:** put **contributed cost** on the **Edge · thickness** layer build-up (`FilmStackVisualizer`), **not** on the structure table. Structure table stays Material `{CUR}/kg` + Area `{CUR}/m²` only (plus header/width polish below).

**Why this is better:** GSM% already answers “share of mass”; **Contrib.** answers “share of RM money” in the same panel. Structure table stays narrower and keeps editing (mat price) separate from review (build-up).

#### Layer build-up layout

```text
┌──────────┬─────────────────────────────────────────────┐
│  Chart   │ 1. PET Transparent · Film     µ%  GSM%  Contrib.│
│ (wider)  │                               5.3  7.0   0.42   │
│ 12µ      │                                                 │
│ 16.8gsm  │  (µ/gsm live inside bar when segment tall enough)│
└──────────┴─────────────────────────────────────────────┘
```

| Region | Change |
|--------|--------|
| **Chart (left bar)** | Widen modestly (e.g. `4.5rem` → `5.5rem`–`6.5rem`). Paint **µ** and **gsm** **inside** the colored segment when the row is tall enough (e.g. thickness share ≳ ~8–10%). Thin layers (ink, light adhesive): **do not** force text in the bar — keep values only in the list line or tooltip. Use high-contrast text (white/dark) per segment. |
| **List (center)** | Layer name · type only (drop trailing `· 12µ · 16.8 gsm` from the sentence when those values are in the bar or always show compact in list for thin layers). |
| **Right metrics** | Keep **µ%** and **GSM%**. Add **Contrib.** `{CUR}/kg` (read-only). Double-row header: `µ` / `GSM` / `Contrib.` with unit line `%` / `%` / `{CUR}/kg`. |

**Math (display only):**

```text
contributedPerKg = (layerGsm / totalGsm) × matCostPerKgDisplay
```

If `totalGsm <= 0` (empty structure, mid-edit): show **—** for Contrib. (and do not divide); never throw.

Pass `costPerKg` (display currency) into `FilmLayer` only when the **same** visibility gate as structure material costs is true (`can('materialCostPerKg')` / existing profile — **no parallel RBAC path**). Hide the **Contrib.** column entirely when that gate is false.

Hover on Contrib.: short formula `16.8/238.9 GSM × 5.00 = 0.35` (optional).

Solvent is not a stack layer today — no change unless solvent is later shown in the visualizer.

**Implement in:** `FilmStackVisualizer.tsx` + pass costs from `EstimateEditor` (`visualizerLayers`).

#### Structure table (no Contrib. column)

Keep columns as today, with polish only:

| Column | Header (double-row) | Width |
|--------|---------------------|--------|
| #, Type, Family, Grade | as today | as today |
| Value | **Value** / `µ/gsm` | Tighten to `xxx.xx` + unit (~`5.25rem`–`5.5rem`; today too wide) |
| GSM | **GSM** | `xxx.xx` (~`4.5rem`) |
| Material | **Material** / `{CUR}/kg` | `xxx.xx` (rename from single-line `{CUR}/kg`) |
| Area | **Area** / `{CUR}/m²` | `x.xxxx` (rename from single-line `{CUR}/m²`) |

Do **not** add Contrib. to the structure table.

---

## 5. Data model

### 5.1 New table: `quotes` (commercial object)

```text
quotes
  id                          uuid PK
  tenant_id                   uuid NOT NULL → tenants
  customer_id                 uuid NULL → customers  (ON DELETE SET NULL)

  -- Identity
  name                        varchar(255) NOT NULL   -- e.g. "Summer labels RFQ"
  ref_number                  varchar(32) NOT NULL   -- e.g. PKG-2026-00012 (tenant-unique; not QT- prefix)
  status                      text: draft | saved | sent | archived

  -- Commercial (quote-owned)
  default_brand               varchar(255) NULL
  salesperson_user_id         uuid NULL → users     -- or salesperson_name varchar if simpler
  display_currency            varchar(3) NOT NULL   -- commercial default; estimates snapshot on create
  exchange_rate_usd_to_display decimal NOT NULL     -- set at quote create from tenant (never leave null)
  valid_until                 timestamptz NULL
  delivery_term               varchar(32) NULL      -- incoterm-style (EXW, CIF, …)
  payment_terms               varchar(255) NULL
  remarks                     text NULL             -- commercial remarks (distinct from estimate notes)
  notes                       text NULL             -- internal notes if needed
  sent_at                     timestamptz NULL

  -- Development cost defaults (applied to new estimates; overridable per estimate)
  default_print_color_count   int NULL
  default_cost_per_color      decimal(12,4) NULL   -- display currency
  default_tooling_billing_mode varchar(16) NULL    -- amortized | separate | not_billed

  -- Future RFQ (no rfqs table yet)
  rfq_id                      uuid NULL             -- FK added when RFQ ships

  -- Future versioning (no UI in v1)
  supersedes_quote_id         uuid NULL → quotes
  version_number              int NOT NULL default 1

  -- Future CRM-ish (nullable, no UI in v1)
  approval_status             varchar(32) NULL
  approved_by_user_id         uuid NULL
  approved_at                 timestamptz NULL
  customer_po                 varchar(128) NULL
  expected_order_at           date NULL
  opportunity_probability     int NULL             -- 0–100
  lost_reason                 text NULL

  deleted_at                  timestamptz NULL
  created_at                  timestamptz
  updated_at                  timestamptz
```

Indexes: `(tenant_id)`, `(tenant_id, customer_id)`, `(tenant_id, ref_number)` unique among non-deleted, `(tenant_id, status)`, `(rfq_id)` optional later.

**Philosophy:** Quote = commercial information + container. Estimate = existing cost engine inputs/outputs.

### 5.2 Extend `estimates` (costing object — not a new “Line” type)

Add columns:

| Column | Type | Purpose |
|--------|------|---------|
| `quote_id` | uuid NULL → quotes | Parent quote |
| `sort_order` | int NOT NULL default 0 | Order in rail |
| `sku_label` | varchar(255) NULL | e.g. `200 ml`, `330 ml` |
| `brand` | varchar(255) NULL | Brand on this SKU |
| `specs_code` | varchar(64) NULL | Plant/customer item or structure code |
| `print_color_count` | int NULL | Print colors (cylinders/plates) |
| `cost_per_color` | decimal(12,4) NULL | Display currency per color |
| `tooling_billing_mode` | varchar(16) NULL | `amortized` \| `separate` \| `not_billed` |
| `copied_from_estimate_id` | uuid NULL → estimates | Duplicate lineage (≠ re-quote `source_estimation_id`) |

**Derived (not stored, or stored as existing tooling fields for engine):**

```text
development_total = print_color_count × cost_per_color   -- display currency

amortized  → toolingCharge (display→USD at boundary) billed into /kg over order qty
separate   → same total stored for display; NOT added into sale /kg; shown as lump on price list / PDF
not_billed → total may be stored for internal note; not on customer price
```

Wire to existing `toolingChargeUsd` / `toolingBilledToCustomer` in the save/calc path so the engine formula set stays one path:

| Mode | `toolingBilledToCustomer` | Sale /kg includes tooling? | Price list lump line? |
|------|---------------------------|----------------------------|------------------------|
| `amortized` | `true` | Yes | No (optional note) |
| `separate` | `false` | No | Yes |
| `not_billed` | `false` | No | No |

**FX boundary (mandatory):** `cost_per_color` is **display currency**. Engine `toolingChargeUsd` is **USD**. Convert with the **estimate’s frozen** `exchange_rate_usd_to_display` (`display ÷ rate → USD`), never the quote’s live default and never live FX. Lump lines and UI convert that USD figure **back** with the **same** frozen rate so amortized /kg and separate lumps cannot drift from each other.

**Keep on estimate (costing / engine):** layers, processes, slabs, dimensions, markup, CoRM, plates/tooling amounts, delivery charge used in calc, frozen `display_currency` + `exchange_rate_usd_to_display`, sale price fields, estimate `status`, `jobName`, `notes` (technical).

**Do not** remove estimate commercial-ish columns in v1 if the editor still uses them; stop *preferring* them in UI when quote fields exist (inherit on create).

**Display name priority:** `sku_label` → `jobName` → estimate `ref_number`.

**Ref numbers:**

- **Quote:** `PKG-YYYY-NNNNN` (distinct prefix — avoid `QT-` / `QT-PKG-` overlap with estimates)
- **Estimate:** keep existing `QT-YYYY-NNNNN`
- **Generation:** reuse `generateRefNumber` **retry / collision pattern** (BUG-11) for quotes — do not invent a naive count-and-increment

**UI priority (customer-facing):** always lead with **Quote ref** (`PKG-…`). Estimate refs are secondary (rail, technical detail). On a **single-estimate** quote, do **not** surface two equal refs — Quote ref only in the header; estimate ref only in a detail/meta row if needed.

**Customer on quote:** `quotes.customer_id` is authoritative. If it changes, cascade update `estimates.customer_id` for all children (denormalized cache). Prefer discouraging customer change after `sent`.

**Salesperson (`salesperson_user_id`):** **informational only in v1** (PDF/summary). No row-level “only my quotes” ACL unless a later phase adds it.

### 5.3 Migration strategy

1. Create `quotes` table (including nullable future columns).
2. Add nullable `quote_id` (+ `sort_order`, `sku_label`, `brand`, `copied_from_estimate_id`) to `estimates`.
3. **Backfill:** for each existing estimate, create a one-estimate quote:
   - `quotes.customer_id` = estimate.customer_id
   - `quotes.name` = estimate.job_name
   - `quotes.status` = map from estimate.status
   - `quotes.display_currency` / rate from estimate snapshot
   - `quotes.delivery_term` from estimate if present
   - `quotes.ref_number` = new package sequence
   - `estimates.quote_id` = new quote
   - `sku_label` = job_name initially
4. After backfill, application always creates estimates **with** a quote (even single-estimate).
5. **End of Phase 2:** enforce `estimates.quote_id NOT NULL` (all code paths create via quotes; no orphans).
6. **Re-quote lineage:** preserve existing `sourceEstimationId` on estimates. Do **not** invent `supersedes_quote_id` links during backfill (estimate-level lineage is enough; quote-level versioning remains future).
7. **Quote create:** always set `display_currency` + `exchange_rate_usd_to_display` from tenant at create (same snapshot discipline as estimates). New estimates on that quote inherit the **quote’s** frozen rate, not a fresh tenant rate — so all SKUs on one offer share one FX snapshot.

Idempotent SQL patch entry (same pattern as other ES migrations under `packages/server`). **Phase 1 verify:** boot API against a **truly empty** database after migrate (not only an already-patched dev DB); confirm seed + login succeed.

### 5.4 Relations (Drizzle)

- `quotes` → many `estimates`
- `quotes` → one `customers`
- `quotes.supersedesQuoteId` → `quotes` (self, versioning)
- `estimates.copiedFromEstimateId` self-FK
- Existing `sourceEstimationId` unchanged (re-quote)
- Future: `quotes.rfqId` → `rfqs` when that table exists

---

## 6. API design

All routes tenant-scoped via JWT (existing pattern). Visibility strip on list/calculate responses unchanged.

### 6.1 Quotes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/quotes` | List quotes (`customerId`, `status`, `limit`) — include `estimateCount` for dashboard readiness |
| `GET` | `/api/v1/quotes/:id` | Quote commercial fields + estimate summaries (id, sku, specsCode, brand, colors, developmentTotal, toolingBillingMode, status, salePricePerKg, structureSummary, totalGsm, totalMicron, updatedAt) |
| `POST` | `/api/v1/quotes` | Create quote (customer, name, currency, commercial defaults incl. colors / costPerColor / billing mode) |
| `PATCH` | `/api/v1/quotes/:id` | Update commercial fields (name, terms, validity, remarks, status, default colors/cost/mode, …) |
| `DELETE` | `/api/v1/quotes/:id` | Soft-delete quote + estimates (or block if policy prefers) |
| `GET` | `/api/v1/quotes/:id/price-list` | Combined price list (all estimates; commercial columns + slab bands) |
| `POST` | `/api/v1/quotes/:id/estimates` | Add estimate: `{ mode: 'blank' \| 'template' \| 'duplicate', sourceEstimateId?, … }` |
| `POST` | `/api/v1/quotes/:id/estimates/:estimateId/duplicate` | Duplicate estimate (body: skuLabel, brand, flags) |
| `GET` | `/api/v1/quotes/:id/proposal.pdf` | Structured multi-SKU PDF (phase 4) |

**Naming:** use `/estimates` under quotes, never `/lines`.

### 6.2 Customer explorer & folder summary (dashboard-ready)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/estimates/by-customer` | Folder cards: `customerId`, `companyName`, `quoteCount`, `estimateCount`, `lastActivityAt`, `draftQuoteCount` (or `hasDrafts`). **`lastActivityAt` = MAX(quotes.updated_at, estimates.updated_at)** for that customer (not quote-only). Prefer one aggregated query, not N+1. |
| `GET` | `/api/v1/customers/:id/explorer` | Quotes + estimates for explorer |

Prefer **one payload** for explorer:

```json
{
  "customer": { "id": "…", "companyName": "…" },
  "quotes": [
    {
      "id": "…",
      "name": "Summer labels RFQ",
      "refNumber": "PKG-2026-00012",
      "status": "draft",
      "validUntil": null,
      "updatedAt": "…",
      "estimates": [
        {
          "id": "…",
          "refNumber": "QT-2026-00040",
          "skuLabel": "200 ml",
          "specsCode": "1000578927",
          "brand": "Brand A",
          "printColorCount": 8,
          "costPerColor": "500",
          "developmentTotal": "4000",
          "toolingBillingMode": "separate",
          "jobName": "…",
          "status": "draft",
          "salePricePerKg": "5.17",
          "displayCurrency": "AED",
          "structureSummary": "BOPP / PET / PE",
          "totalGsm": "42.50",
          "totalMicron": "35",
          "orderQuantityKg": "1000",
          "productType": "roll",
          "updatedAt": "…"
        }
      ]
    }
  ]
}
```

`structureSummary`: short server-built string from layers (e.g. `BOPP / PET / PE`) — keep cheap; no full stack in list.

**Dashboard readiness:** list/folder responses should make these rollups trivial later: total customers, total quotes, total estimates, draft quotes, sent quotes, expired quotes (`valid_until < now()`). No dashboard UI in this plan.

**Global search (later):** payloads already expose customer name, quote name/ref, estimate ref, sku, brand — so `GET /api/v1/search?q=500ml` can be added without schema redesign.

### 6.3 Estimates (extend existing)

- `POST /api/v1/estimates` — accept `quoteId`, `skuLabel`, `brand`, `specsCode`, `printColorCount`, `costPerColor`, `toolingBillingMode`, `sortOrder`, `copiedFromEstimateId`; inherit currency/rate and color defaults from quote when present.
- `PATCH /api/v1/estimates/:id` — allow updating `skuLabel`, `brand`, `specsCode`, color/tooling fields, `sortOrder`.
- On save/calc: derive `toolingChargeUsd` from `printColorCount × costPerColor` (display→USD) and set `toolingBilledToCustomer` from billing mode (§5.2).
- `POST /api/v1/estimates/:id/requote` — create **new quote** with one estimate (version-friendly; set `supersedes_quote_id` optionally later). **v1:** new single-estimate quote for same customer; do not append to the old multi-SKU package.
- List endpoints: include `quoteId`, `skuLabel`, `brand` for flat view.

**Re-quote logic:** keep existing clone + fresh RM prices; only change is wrapping in a new Quote container (and optional version link later).

### 6.4 Duplicate implementation

Reuse the clone logic from `requoteEstimateRoute` (`packages/server/src/routes/estimates.ts`):

- Copy layers, processes, slabs, dimensions, pricing fields.
- **Do not** refresh material costs from library (unlike re-quote).
- Set `quote_id` = same quote, `copied_from_estimate_id` = source, new `ref_number`, new `sort_order` = max+1.
- Apply `skuLabel` / `brand` / `specsCode` / color and tooling fields from request body (or copy from source).

Extract shared `cloneEstimate(db, sourceId, options)` used by both requote and duplicate to avoid drift.

---

## 7. Web app structure

### 7.1 Routes (`App.tsx`)

| Path | Page | Notes |
|------|------|-------|
| `/estimates` | `EstimatesFolders.tsx` (or rewrite `EstimatesList`) | Customer cards |
| `/estimates/all` | Flat list (optional) | Legacy table |
| `/estimates/customers/:customerId` | `CustomerExplorer.tsx` | Quotes / SKUs explorer |
| `/quotes/:quoteId` | `QuoteWorkspace.tsx` | Summary + rail + editor + combined list |
| `/quotes/:quoteId/estimates/:estimateId` | same workspace, active estimate | Deep link |
| `/estimate/:id` | `EstimateEditor` | Keep; if estimate has `quoteId`, prefer redirect to quote workspace |
| `/estimate/new`, `/templates` | existing | Pass `quoteId` + `customer` |

Nav label can stay **Estimates** (folders are the new home).

### 7.2 Components to add

| Component | Role |
|-----------|------|
| `CustomerFolderCard` | Folder grid item (quotes, estimates, last activity, drafts) |
| `CustomerExplorer` | Group/sort explorer |
| `QuoteSummaryPanel` | Commercial fields owned by quote |
| `QuoteRail` | Compact estimate cards + Add estimate |
| `DuplicateEstimateDialog` | Minimal amend fields |
| `CombinedPriceListPanel` | Primary commercial review matrix |
| `QuoteHeader` | Name, status, PDF, back |

### 7.3 Reuse

| Existing | How |
|----------|-----|
| `EstimateEditor` | Embed for active estimate; accept `embedded` / hide global Back when inside workspace |
| `PriceListPanel` | Per-estimate tab unchanged; feed data into combined panel |
| `EstimateStart` | First estimate + “New structure” path |
| `apiClient` | New quote/explorer methods |
| `estimateStatus` badges | Reuse |
| Re-quote action | From explorer row and editor |

### 7.4 Editor integration notes

`EstimateEditor.tsx` is large (~3.4k lines). Prefer **minimal** changes:

- Read `quoteId` from route/search params.
- Show SKU, brand, **specs/item code**, **print colors**, **cost per color**, **tooling billing mode** in job header (`JobHeaderFields`).
- Prefer quote-level commercial fields in workspace chrome; do not duplicate incoterm/payment UI on every estimate when quote owns them.
- Wire color × cost → tooling charge + billing mode into save/calc payload (§5.2).
- **Solid-% hover** on structure materials when `solidPercent < 100` (§4.10) — can ship with Phase 3 or as a small independent editor tweak in the same phase.
- When embedded in `QuoteWorkspace`, parent owns chrome (save-all optional; per-estimate save is enough for v1).
- Do **not** block this feature on a full editor split (audit 4.2).

### 7.5 Dashboard / Customer detail

- Dashboard “New estimate” → same create flow (customer optional).
- `CustomerDetail` “+ New estimate” → `New quote` for that customer (explorer-aligned).
- Customer detail estimate list can deep-link into explorer or quote workspace.

---

## 8. Phased implementation

Implement in order. Each phase should be shippable.

### Phase 0 — Spec lock (docs only)

- [x] This plan document (incl. peer-review amendments §0)
- [ ] Owner confirms: quote ref scheme, re-quote creates new quote, duplicate keeps material snapshots

### Phase 1 — Schema + API foundation

**Deliverables:**

- [x] `quotes` table with commercial + color defaults + future-nullable columns (§5.1) + Drizzle relations
- [x] Estimate columns: `quote_id`, `sort_order`, `sku_label`, `brand`, `specs_code`, `print_color_count`, `cost_per_color`, `tooling_billing_mode`, `copied_from_estimate_id`
- [x] Idempotent migration + backfill (one quote per existing estimate; copy currency/delivery_term onto quote; preserve `sourceEstimationId`)
- [x] Quote ref via BUG-11-style retry helper (`PKG-YYYY-NNNNN`); rate+currency set at quote create
- [x] Save/calc maps colors × costPerColor → `toolingChargeUsd` + `toolingBilledToCustomer` per billing mode (frozen estimate FX)
- [x] Visibility strip: development-cost fields gated like plates/tooling
- [x] `POST/GET/PATCH/DELETE /api/v1/quotes` (commercial + default color fields on PATCH; cascade customer_id to children)
- [x] `GET /api/v1/estimates/by-customer` (quoteCount, estimateCount, lastActivity = max across quotes+estimates, drafts)
- [x] `GET /api/v1/customers/:id/explorer` (`estimates` array, not `lines`; include specsCode / colors / billing mode when allowed)
- [x] Auto-create quote when `POST /estimates` omits `quoteId` (one quote per call)
- [x] Extract `cloneEstimate`; wire **duplicate estimate** under `/quotes/:id/estimates/...`
- [x] API client methods
- [x] Server build + typecheck clean for touched files

**Verify:** migrate **empty** DB (seed + login); folder summary counts; create quote + one estimate; duplicate estimate; separate tooling on calculate. Per-slab amortized tooling is **§0.4.1** (may be same PR or immediately before Phase 3).

### Phase 2 — Estimates page = customer folders + explorer

**Deliverables:**

- [x] Rewrite `/estimates` as customer folder view (rich cards §4.1)
- [x] Customer explorer page with group by Quote / Brand / SKU / Date
- [x] Search at folder level and within customer (sku/brand/ref ready for global search later)
- [x] Optional `/estimates/all` flat list (old table)
- [x] New quote entry points (folders, explorer, dashboard, customer detail)
- [x] Open estimate → quote workspace (single-estimate quote still feels like today)
- [x] Enforce `estimates.quote_id NOT NULL` (CHECK: active rows require `quote_id`)

**Verify:** UI matches §4.1–4.2; no regression on delete/re-quote from explorer; no orphan estimates.

### Phase 3 — Quote workspace + combined price list

Ship as **sub-PRs** (reviewable chunks):

| Sub | Deliverables |
|-----|----------------|
| **3a** | `QuoteWorkspace` shell: summary panel + rail + embedded editor + deep links + single-estimate UX (rail collapsed, Quote ref only) |
| **3b** | `CombinedPriceListPanel` + `GET .../price-list` (commercial columns; no color lump yet OK). **Blocked on §0.4.1** if showing amortized development in band prices |
| **3c** | Colors / cost per color / billing mode end-to-end (quote defaults → estimate → save/calc FX boundary → price list amortized vs separate lump) + job header + `DuplicateEstimateDialog` + add estimate flows. **Requires §0.4.1** for amortized mode |
| **3d** | Solid-% hover (§4.10) + build-up Contrib. + in-chart µ/gsm + structure table header/width polish (§4.11) — may ship **before** 3a as editor-only |

**Verify:** label example (4 sizes) end-to-end; separate billing shows lump not in /kg; amortized includes in /kg; solid-% tooltip on ink/SB adhesive; build-up Contrib. = mass share × mat cost (— when totalGsm=0); thin layers skip in-bar text; Value column fits `xxx.xx`; different structure estimate works.

### Phase 4 — Multi-SKU PDF + polish

**Deliverables:**

- [x] Structured multi-SKU PDF (§4.8) — not PDF concat; include specs code, colors, development charges section
- [x] Excel export for combined price list (incl. separate dev costs)
- [x] Quote-level status sync rules (e.g. all estimates saved → quote saved)
- [x] **Sent lock:** quote `sent` → child estimates read-only; change path = re-quote (preferred) or unlock
- [x] Multi-SKU PDF: **re-apply visibility gating explicitly** (do not assume JSON strip; mirror or share `proposal-pdf.ts` cost stripping for development fields)
- [x] Quote status transition audit log (mirror estimate-audit pattern) — status / sent_at / valid_until
- [x] Empty/loading/error states
- [x] Update `ES_WIREFRAMES` / mockup if maintained — N/A (no maintained wireframes file)

**Verify:** PDF has cover/summary/terms/dev charges/per-estimate sections; sales visibility strips costs **and** development fields; sent quote cannot edit estimates without unlock/re-quote.

### Phase 5 — Optional enhancements

- [ ] Copy estimate from **another** quote (same customer)
- [ ] “Re-apply structure from estimate X”
- [ ] “Apply quote color defaults to all estimates” (explicit bulk, not live-link)
- [ ] **Re-quote entire quote** (D9): fresh RM on all estimates → new quote
- [ ] Quote total value when order quantities set
- [ ] Drag-reorder estimates (`sort_order`)
- [ ] Dev-cost presentation modes on quote
- [ ] Quote versioning UI (`supersedes_quote_id`)
- [ ] RFQ entity + `rfq_id` FK
- [ ] Global search endpoint
- [ ] Dashboard widgets from existing count fields

---

## 9. File touch map (expected)

| Area | Files (likely) |
|------|----------------|
| Schema | `packages/server/src/db/schema.ts`, new migration/patch SQL |
| Routes | `packages/server/src/routes/quotes.ts` (new), `estimates.ts`, `customers.ts`, `app.ts` register |
| Clone helper | `packages/server/src/services/clone-estimate.ts` (new) |
| PDF | `packages/server/src/services/proposal-pdf.ts` (phase 4) |
| API client | `packages/web/src/lib/api.ts` |
| Pages | `EstimatesList.tsx` → folders, `CustomerExplorer.tsx`, `QuoteWorkspace.tsx` |
| Components | `QuoteRail`, `QuoteSummaryPanel`, `CombinedPriceListPanel`, `DuplicateEstimateDialog`, `CustomerFolderCard`, `FilmStackVisualizer.tsx` (§4.11) |
| Editor | `EstimateEditor.tsx`, `JobHeaderFields.tsx` (sku/brand/specs/colors, quote context, solid-% hover) |
| Routing | `App.tsx` |
| Docs | `LIVE_STATE.md`, `ES_MEMORY.md`, `SESSION_LOG.md` on implement |

Engine package: **no formula changes**. Phase 1 may only map colors × cost → existing `toolingChargeUsd` / `toolingBilledToCustomer` at the save/calc boundary (server + client payload), not inside `@es/engine` math.

---

## 10. Testing plan

| Level | What |
|-------|------|
| Migration | Backfill: N estimates → N quotes, each with 1 estimate; commercial fields on quote; no orphans |
| API | Create quote, add estimate, duplicate estimate, explorer payload, folder summary counts |
| Unit | `cloneEstimate` copies layers/slabs/processes; does not refresh RM on duplicate |
| Unit | Tooling FX: `cost_per_color` (display) → `toolingChargeUsd` uses **estimate frozen** rate; lump display uses same rate back |
| Unit | Contrib. with `totalGsm = 0` renders — / no throw |
| Manual E2E | Customer folder → explorer → quote → 4 label sizes → combined price list + quote summary |
| Regression | Single estimate create from template/scratch; re-quote → new quote; PDF single estimate; visibility |
| Regression | Legacy `/estimate/:id` (or `/estimates/:id`) with `quoteId` redirects into quote workspace |
| Regression | Legacy `POST /estimates` without `quoteId` creates one new quote per call (rapid-fire = N quotes) |
| Permissions | Tenant isolation on quotes; Contrib. uses same visibility gate as material costs |
| Concurrency | v1 **last-writer-wins** on quote PATCH (no optimistic lock) — acceptable; document only |

Add server tests next to existing estimate route tests when present; do not block on full web E2E suite if none exists yet.

---

## 11. Agent implementation checklist

When starting work:

1. Read this file fully — especially **§0 Architectural principles**.
2. Read `AGENT.md`, `ES_MEMORY.md`, `LIVE_STATE.md`, `LOCKED_DECISIONS.md`.
3. Implement **Phase 1** before any UI redesign.
4. Prefer smallest diffs; reuse `requote` clone path; never introduce a Line entity.
5. Follow `keep-ui-clean` — no extra instructional UI.
6. Do not change costing formulas or `@es/engine`.
7. At session end: update `SESSION_LOG.md`, `LIVE_STATE.md`, `ES_MEMORY.md` session log.

**Phase entry points:**

| Phase | Start here |
|-------|------------|
| 1 | `packages/server/src/db/schema.ts` + migration |
| 2 | `packages/web/src/pages/EstimatesList.tsx` |
| 3 | New `QuoteWorkspace.tsx` + embed editor |
| 4 | `proposal-pdf.ts` |

---

## 12. Open decisions (owner)

Resolve before or during Phase 1:

| # | Question | Recommendation |
|---|----------|----------------|
| D1 | Quote ref format | **`PKG-YYYY-NNNNN`** (not `QT-PKG-…`); estimates keep `QT-YYYY-NNNNN` |
| D2 | Re-quote on an estimate in a multi-SKU quote | New single-estimate quote (version-ready), not another estimate on the old package |
| D3 | Delete last estimate on a quote | Delete quote too (confirm) |
| D4 | Estimates without customer | “No customer” folder |
| D5 | Auto-create quote when using old `POST /estimates` without `quoteId` | **Yes** — each call creates **its own** one-estimate quote (rapid-fire empty drafts = N quotes, not one shared draft) |
| D6 | Salesperson storage | Prefer `salesperson_user_id` FK to `users` if present; else nullable text for v1 |
| D7 | Default `tooling_billing_mode` when colors set | **`separate`** if unset (industry default for cylinders billed apart) |
| D8 | Estimate `customer_id` vs quote | Keep both: estimate copies `customer_id` from quote on create; quote remains commercial source of truth |
| D9 | Re-quote entire multi-SKU package | **Phase 5:** “Re-quote quote” clones all estimates with **fresh RM** into a **new** quote (same customer). Single-estimate re-quote stays as today (D2). Not required for Phase 1–3 |

**Ratified for kickoff (unless owner overrides):** D1 `PKG-YYYY-NNNNN`, D2 single-SKU re-quote → new quote, D5 one quote per legacy POST, D7 `separate`, D9 whole-package re-quote in Phase 5.

---

## 13. Summary for agents

**Build a commercial Quote layer on top of existing Estimates, and make Estimates a customer-folder explorer.**

| Concept | Role |
|---------|------|
| **Folder** | Customer |
| **Quote** | Commercial container (terms, validity, summary, PDF, combined review) |
| **Estimate** | Costing object (full engine) — never a separate “Line” type |
| **Duplicate** | Snapshot clone on the same quote; amend SKU / brand / dimensions / qty |
| **Combined price list** | Primary commercial review across all estimates on the quote |
| **Colors / cost per color** | Quote defaults + per-estimate; billing **amortized** (in /kg), **separate** (lump, not in /kg), or **not billed** |
| **Specs / item code** | Per estimate; searchable; not in math |
| **Solid-% hover** | Ink / SB adhesive / coatings: cost/kg is solid basis |
| **Build-up Contrib.** | Contrib. cost on layer build-up (not structure table); µ/gsm in chart when space allows; table header/width polish only (§4.11) |
| **Engine** | Same formulas; tooling wired via existing charge + billed flag |

Ship Phase 1 (data + API) → Phase 2 (folders + explorer) → Phase 3 (workspace + matrix + colors/specs + solid hover) → Phase 4 (structured multi-SKU PDF).

Leave room for RFQ, versioning, global search, and dashboard stats — do not implement them until scheduled.

**Not in scope:** Interplast Contract 1 / Contract 2 competitor prices.

---

## 14. Self-review (2026-07-04)

Plan re-read end-to-end after all amendments. **Verdict: coherent and implementable.** No blocking contradictions.

| Check | Result |
|-------|--------|
| Quote vs Estimate (no Line) | Consistent in §0, API, phases |
| Commercial on quote / costing on estimate | Consistent; currency snapshot rule preserved |
| Colors × cost + billing modes | In schema, API, price list, PDF; wired via existing tooling flags |
| Specs code | Estimate field; explorer/search-ready |
| Contrib. cost | On **layer build-up only** (§4.11); not structure table |
| Solid-% hover | Structure table (§4.10) |
| Contract prices | Explicitly out of scope |
| Engine | No second calculator; no RM formula changes |
| Phases | 1 API → 2 folders → 3 workspace + editor UX → 4 PDF |

**Optional split (not required):** §4.10 + §4.11 (solid hover, build-up Contrib., table width polish) can ship as a small **editor-only** PR before Phase 1 if desired — they do not depend on `quotes`.

**Residual risks (accept):** Phase 3 is large (workspace + price list + editor fields); implement in sub-PRs if needed. Thin-layer in-bar labels need a share threshold so ink rows stay readable.

### 14.1 External commentary triage (2026-07-04)

Independent agent review (no full repo context). Adopted only where convinced:

| Point | Adopt? | Action |
|-------|--------|--------|
| Quote vs Estimate separation | Already in plan | — |
| Amortize over “active slab/band” | **Partial** | ES amortizes tooling over **order qty**, not slab band — clarified in §0.4 |
| Quote color defaults live-update all estimates | **No** | Keep create-time snapshot; optional explicit “apply to all” in Phase 5 |
| Two refs confuse single-SKU | **Yes** | Quote ref primary; hide equal estimate ref on single-SKU (§5.2, §4.3) |
| Contrib. on build-up / solid-% hover | Already in plan | — |
| Design API for future bulk structure edit | **No** | Premature; Phase 5 “apply defaults” is enough if needed |
| Sent quote locks estimates | **Yes** | Phase 4 rule: sent → read-only; re-quote preferred (§4.3, Phase 4) |
| Multi-currency / 1-cent rounding | **No** | One `display_currency` per quote; use existing display rounding helpers at implement time |

### 14.2 Second commentary triage (2026-07-04)

| Point | Adopt? | Action |
|-------|--------|--------|
| Tooling FX at frozen estimate rate | **Yes** | §5.2 three-sentence boundary rule |
| Re-quote entire multi-SKU package | **Yes** | D9 + Phase 5 (not Phase 3 — package already large) |
| Contrib. `totalGsm=0` guard | **Yes** | §4.11 |
| Optimistic concurrency / merge edits | **No** | v1 last-writer-wins; noted in §10 only |
| Legacy URL redirect test | **Yes** | §10 |
| Rapid-fire auto-create quotes | **Yes** | D5 clarified |
| Phase 3 sub-PR order 3a–3d | **Yes** | Phase 3 table |
| Contrib. same RBAC as mat costs | **Yes** | §4.11 `can('materialCostPerKg')` |
| Push whole-package re-quote into Phase 3 | **No** | Phase 5; single re-quote already works |

### 14.3 Claude final commentary triage (2026-07-04)

| Point | Adopt? | Action |
|-------|--------|--------|
| Per-slab tooling amortization (latent engine bug) | **Yes — gate Phase 3** | §0.4.1; not a Phase 1 schema blocker |
| Empty-DB migrate verify | **Yes** | Phase 1 verify |
| Gate costPerColor / developmentTotal like plates | **Yes** | §4.5 + Phase 1 |
| PDF visibility separate path | **Yes** | Phase 4 explicit |
| Quote ref BUG-11 retry | **Yes** | §5.2 |
| customer_id cascade / authority | **Yes** | §5.2 |
| Quote FX rate at create (not null) | **Yes** | §5.1 / §5.3 |
| Backfill supersedes_quote_id for old re-quotes | **No** | Keep `sourceEstimationId` only |
| Salesperson as ACL | **No for v1** | Informational only |
| Prefix `PKG-` not `QT-PKG-` | **Yes** | D1 |
| `quote_id NOT NULL` by end Phase 2 | **Yes** | §5.3 / Phase 2 |
| lastActivityAt max(quotes, estimates) | **Yes** | §6.2 |
| Quote audit log | **Yes** | Phase 4 |
