# ProPackHub Estimation Studio — Locked Decisions Log

**Purpose:** Running record of strategic decisions for PRD v3.0.  
**Updated:** 2026-07-22 (Decision #24 — SSO + tenant module entitlements)

---

## Product baseline (confirmed by owner)

| Attribute | Value |
|-----------|--------|
| **Product** | ProPackHub Estimation Studio |
| **Positioning** | **Packaging Sales Platform** (sales workflow, not factory/MES) |
| **Tagline** | Flexible Packaging Cost Estimator (Decision #16) |
| **Customer type** | Packaging sales professionals |
| **Primary users** | **Independent consultant**, **independent sales professional** — not enterprise org workflows in V1 |
| **User model** | **Individual-first SaaS** — anyone can register; not plant/PEBI-tenant-only |
| **Relationship to PEBI** | ES is a **separate product** with its own DB, sessions, and licensing; PEBI keeps its own internal `/estimator`. Shared ProPackHub identity only via SSO handoff (Decision #24) |
| **Platform** | ProPackHub hosts PEBI + FS + ES as separate products. **SSO hands off identity only;** which apps open is decided by **tenant + module subscription** (`app_subscriptions` / entitlements) — see **Locked Decision #24**. Each app keeps its own data and sessions. |

> **Superseded (do not follow):** older baseline wording “no SSO / no cross-app navigation” and any rule that SSO always opens both PEBI and ES. Replaced by Decision #24 (2026-07-22).

### Hero features (locked)

1. **Packaging Structure Canvas** — signature UI  
2. **Proposal Generator** — branded commercial output  
3. **Pricing Intelligence** — cost breakdown, not black-box price  

---

## Locked Decision #12 — Quotation Philosophy (Q12 answer)

**Branded proposal with quantity slab pricing (combines with Decision #15).**

Proposals are **not** a single-price PDF. They include the **slab table**:

| Quantity | Price/kg |
|----------|----------|
| 1 Ton | AED 12.50 |
| 2 Tons | AED 11.90 |
| … | … |

**V1 proposal contents:**
- Tenant branding (logo, colors, footer, T&C — Decision #14)
- Customer + estimate reference
- **Structure visual** (canvas snapshot or layer diagram)
- **Quantity slab pricing table**
- Validity date

**Phase 2 enrichments:** Cover page, company profile section, full technical specifications pack.

---

## Locked Decision #11 — Design Direction (Q11 answer)

**Option C — Industrial Design Studio.**

**Personality:** Figma for Packaging — not ERP (SAP), not generic SaaS (Notion).

**Hero:** Packaging Structure Canvas — color-coded, draggable, editable layers; real-time cost sidebar.

**Principle stack (from strategic PRD):**
1. Visual before numerical  
2. Engineering before data entry  
3. Instant intelligence (cost breakdown on canvas)  
4. Mobile-first for sales reps (Decision #8)

---

## Locked Decision #10 — Analytics (Q10 answer)

**Option A — Basic dashboards only for V1.**

Examples: recent estimates, estimate count this month, open proposals, simple customer list stats.

**Deferred:** Full Commercial Analytics module (Phase 2+).

---

## Locked Decision #9 — AI Features (Q9 answer)

**Option A — No AI in V1.**

Defer AI assistant (structure suggestions, margin tips, anomaly detection) to Phase 2+.

---

## Locked Decision #8 — Mobile (Q8 answer)

**Option A — Sales reps only for V1 mobile/PWA.**

Mobile use case: rep at customer site → build/adjust estimate → share proposal PDF/link.

**Not V1 mobile:** Manager dashboards, executive analytics on phone.

**Implementation:** Responsive web + PWA for rep flows; native React Native deferred.

---

## Locked Decision #6 — Material Intelligence (Q6 answer)

**Option A — Current cost only for V1.**

Each material has a single active `price_per_kg` (tenant-owned per Decision #14).

**Deferred:** `material_cost_history`, forecasts, supplier comparison, volatility (Phase 2 — aligns with gap #4 from PRD review).

---

## Locked Decision #5 — Formula Studio Relationship (Q5 answer)

**Option A — Independent templates for V1.**

```
Template → Estimate
```

ES works **standalone** without Formulation Studio. No FS entitlement required.

**Phase 2 (optional):** When tenant has **both** ES + FS entitlements:

```
Formula → Template → Estimate
```

Architect API hooks for FS import; do not block V1 on FS integration.

---

## Locked Decision #3 — Customer Management (Q3 answer)

**Option A — Simple customer table for V1.**

| Field | V1 |
|-------|-----|
| Customer name | Yes |
| Email | Yes |
| Phone | Yes |
| Notes (optional) | Yes |

**Deferred to Phase 2:** Customer Workspace (contacts, quote history, margin analysis, activities, approval rate, annual value).

**Rationale:** Keeps V1 lean for individual sales pros; history is implicit via estimates linked to `customer_id`.

---

## Locked Decision #2 — Multi-Tenant Strategy (Q2 answer)

**A tenant can be an individual OR a company.**

| Tenant type | Example | V1 support |
|-------------|---------|------------|
| **Individual** | Solo consultant, independent sales rep | Primary — default signup path |
| **Company** | Interplast, a packaging converter sales team | Supported — same product, optional team billing later |

**Not V1:** Corporate group hierarchy (AFP Group → Interplast + FuturePack + XYZ) — defer to Enterprise tier.

**Schema implication:** `tenants.type = 'individual' | 'company'`; all library, estimates, customers scoped to `tenant_id`. Individual tenant = one user initially; company tenant = multiple users in Phase 2.

---

## Locked Decision #4 — Template + Blank Canvas

**Estimate creation — two entry paths:**

```
New Estimate

○ Start from Template
○ Start from Blank Canvas
```

**Rationale:** Primary users are sales people. Most flow:

```
Template → Modify → Quote
```

Advanced users:

```
Blank Canvas → Design Structure → Quote
```

### Personal Template Library

Users can save and reuse personal templates, e.g.:

- Snack Pouch  
- Coffee Bag  
- Pet Food Pouch  
- Ice Cream Laminate  

**My Templates** — tenant/user-scoped, not public in V1.

### Template architecture (future-proof, not V1 marketplace)

| Phase | Scope |
|-------|--------|
| **V1** | Private templates (My Templates) |
| **Phase 2** | Shared workspace templates (team/company) |
| **Future** | Marketplace templates (e.g. consultants sell template packs) |

**V1 rule:** Do **not** build public marketplace. Architect schema/API for three tiers above.

---

## Locked Decision #13 — No Approval Workflow in V1

**Target user:** Independent consultant / independent sales professional — **not** enterprise organization.

**Rejected for V1:** Draft → Pending Approval → Approved → Rejected (creates unnecessary friction).

**V1 workflow:**

```
Estimate → Proposal → Share → Customer
```

**End-to-end product flow:**

```
Design Structure → Calculate Price → Generate Proposal → Track Customer Response → Win Business
```

### Removed from V1 (do not build)

- Manager role  
- Approval queue  
- Approval notifications  
- Rejection workflow  
- Margin approval logic  
- Multi-level approvals  

**Phase 2+ (Enterprise tier):** Rule-based approval engine (margin thresholds) only if team/company plans demand it.

---

## Locked Decision #14 — Admin-Seeded Library + User Ownership

**Personal Costing Environment**

```
ProPackHub Admin → Master Library → User Registers → Receives Copy → User Owns Everything
```

Each user/tenant independently owns: materials, prices, waste, density, solids, machine costs, margins, terms, branding.

---

## Locked Decision #15 — Quantity Slab Pricing

One estimate, multiple quantity tiers (1T / 2T / 5T / 10T…) in a single proposal table.

**Slab templates** — reusable quantity presets.

**Workflow:** Estimate → Structure → Cost → Quantity Slabs → Proposal

---

## Locked Decision #17 — Standard Templates = Parent PG → Variants (BOM2)

> **Superseded 2026-07-22 (owner):** parent-only catalog is **retired**. ES mirrors PEBI BOM2: **11 parent product groups** with **variant subcards** under each. Seed v4 in `structure-templates-seed.json`.

**ES standard structures = PEBI `crm_product_groups` → `crm_product_group_variants`.**

| Layer | PEBI | ES Templates UI |
|-------|------|-----------------|
| Parent | 11 inquiry PGs | Group header on `/templates` |
| Child | Active variants | Structure template card (name = variant) |
| Excluded | Lamination Film (SFG) + inactive PGs | Not seeded |

**User flow:**

```
New Estimate → Templates → pick Product Group → pick Variant subcard → adjust → quote
              or Blank Canvas (fully custom)
```

**Parent classification (unchanged):**

| Material | Structure | Parent PGs |
|----------|-----------|------------|
| **PE** | **Mono** | Commercial Items Plain/Printed, Industrial Items Plain/Printed, Shrink Film Plain/Printed, Wide Film |
| **Non PE** | **Mono** | Mono Layer Printed, Shrink Sleeves, Labels |
| **Non PE** | **Multilayer** | Laminates |

**Structure rules (owner 2026-07-22):**
- **Substrate Origin = PE** → exactly **one** PE substrate layer (mono PE).
- **Printed** variants → Ink SB (wide web default); **Plain/Unprinted** → no ink.
- Laminates may include PE only as sealant after adhesive (multilayer).
- Defaults are provisional — owner will refine stacks later; all PG × variant cards must exist now.

Each seeded template stores `pebi_parent_pg` + variant `name` + `material_class` + `structure_type` + default layers/processes. User **My Templates** remain private and may be named freely.

---

## Locked Decision #18 — Operation Cost UI Admin-Only (V1)

**Anything related to operation / process costing is visible and editable by tenant admin only — not regular users.**

| Surface | Regular user | Tenant admin |
|---------|--------------|--------------|
| Estimate editor — **Processes** section (toggle rows, speed, setup hrs) | Hidden | Shown |
| Cost sidebar — **process %** and process line items | Hidden | Shown |
| Settings — **machine cost/hr** rates | Hidden | Shown |
| Library — operation defaults | Hidden | Shown |
| Proposal PDF (customer-facing) | Never shows internal process/machine costs | Same |

**Regular user (sales rep default):** structure + microns + GSM + **selling price only**. No RM, markup, margin, cost breakdown, plates, delivery, operation, or library $/kg unless admin enables via visibility profile (Decision #20).

**Engine behaviour:** Server still applies tenant markup, RM, processes when calculating quotes. Hidden fields are stripped from API/UI — sale price remains accurate.

**Roles (revised for V1):**

| Role | Scope |
|------|--------|
| `user` | Estimates, customers, materials (RM prices), templates, proposals |
| `tenant_admin` | Above + operation/process UI, machine rates, process defaults |
| `platform_admin` | Master library seed (ProPackHub — outside ES app UI V1) |

First registrant on a tenant is `tenant_admin`. Additional company users default to `user` until promoted.

---

## Locked Decision #19 — Printing Web Class, Ink Systems, Laminate Alu (2026-06-12)

**Printing web class** (estimate editor, when stack has ink):

| Selection | Ink | Solid % | Default |
|-----------|-----|---------|---------|
| **Wide Web printing** | Ink SB | 30 | **Yes — all printed templates** |
| **Narrow Web printing** | Ink UV | 100 | User opt-in |

**Owner confirmed:** Labels and Shrink Sleeves default to **Wide Web / Ink SB** (not UV).

- Separate tenant library price rows: **Ink SB**, **Ink UV** — not color SKUs
- SB → show ink-to-solvent ratio (Solvent-Mix); UV → no solvent for ink
- **Adhesive SB** for lamination; **microns always user-variable**

**Laminate duplex default:** PET + Ink SB + Adhesive SB + LDPE.

**Triplex Alu (owner confirmed):** insert **Adhesive SB + Aluminium + Adhesive SB** before PE sealant.

**Memory / PRD:** [ES_MEMORY.md](./ES_MEMORY.md) · PRD §6.2.1–6.2.2 · [ES_STANDARD_TEMPLATES_SEED.json](./ES_STANDARD_TEMPLATES_SEED.json) v3

---

## Locked Decision #20 — Cost Visibility & User Settings (2026-06-12)

**Mobile V1 = same responsive webapp / PWA** — not a separate native app. Layout reflows; visibility rules identical on phone.

**Sales rep must NOT see** (default `user` visibility profile):
- Markup %, margin, RM cost/kg, cost/m², plates, delivery, operation cost, cost breakdown %, solvent-mix $/kg, material library prices

**Sales rep DOES see:**
- Structure, microns, dimensions, GSM, selling price/kg, slab table (price columns), proposal PDF

**Tenant admin configures** in **Settings → Team & visibility**:
- Default visibility profile for new users
- Per-user override toggles (`users.visibility_profile` JSONB)

Engine computes full price server-side; API strips fields the user's profile disallows.

**PRD:** §4.3 mobile · §6.8 visibility · §5.7 sales rep layout

---

## Locked Decision #16 — Product Positioning

**Public headline:** Flexible Packaging Cost Estimator  

**Rejected for marketing:** Packaging Intelligence Platform, Commercial Workspace, Packaging OS  

**Product name:** ProPackHub Estimation Studio  

**Internal richness:** intelligence features (canvas, CRM, analytics) live inside the product without changing the simple tagline.

---

## Locked Decision #24 — Platform SSO + tenant module entitlements (2026-07-22)

**Owner model (locked):** SSO ≠ automatic access to every ProPackHub app.

| Concept | Meaning |
|---------|---------|
| **Tenant** | Account / company group of users (e.g. Interplast). A tenant may be one user or many. |
| **Module (subscription)** | Which product(s) that tenant bought: PEBI (`pebi`), Estimation Studio (`es`), Formulation Studio (`fs`), etc. Stored as `app_subscriptions` / account entitlements. |
| **SSO** | Short-lived **identity handoff** from ProPackHub into a product. Proves who the user is and which tenant they belong to. |

**Access rules:**

1. Same tenant with a **full / multi-module** subscription → users on that tenant may open each entitled app (e.g. PEBI **and** ES).
2. Tenant (including single-user) that bought **only one module** → users get **only that app**. The other app is blocked (**403 / not entitled**) even when SSO identity handoff would otherwise succeed.
3. SSO never grants modules by itself. **Entitlements decide which modules open.**

**Still true (not superseded):**

- Each product keeps its **own database, sessions, and licensing**.
- No shared in-app navigation that bypasses entitlement checks.
- ES remains a separate commercial product from PEBI MES `/estimator`.

**Supersedes:** product-baseline “no SSO”; platform plan note that SSO alone equals product selection without module gating; any agent rule that “SSO always opens both apps.”

**Authority:** also `platform/docs/SAAS_NORMALIZATION_IMPLEMENTATION_PLAN_V2.md` lock **L16** (amended 2026-07-22 to match this decision).

---

## Commercial workflow (locked — revised after Decision #13)

```
Customer → Structure → Estimate → Proposal → Share → Customer Response → Win Business
```

(No approval gate in V1.)

---

## Decisions pending (strategic PRD session)

| # | Topic | Status |
|---|--------|--------|
| 1 | Product scope (A/B/C) | Partially locked — standalone ES, individual-first, packaging sales platform |
| 2 | Multi-tenant strategy | **Locked #2** — tenant = individual OR company (not corporate group in V1) |
| 3 | Customer management | **Locked #3** — Simple customer table V1; workspace Phase 2 |
| 4 | Estimate entry | **Locked #4** — Template or Blank Canvas |
| 5 | Formula Studio relationship | **Locked #5** — Independent V1; FS link Phase 2 optional |
| 6 | Material intelligence | **Locked #6** — Current cost only V1 |
| 7 | Approval workflow | **Locked #13** — None in V1 |
| 8 | Mobile app scope | **Locked #8** — Sales reps only V1 (responsive/PWA) |
| 9 | AI features | **Locked #9** — No AI V1 |
| 10 | Analytics scope | **Locked #10** — Basic dashboards V1 |
| 11 | Design direction | **Locked #11** — Industrial Design Studio (Figma for Packaging) |
| 12 | Quotation philosophy | **Locked #12** — Branded proposal + slab pricing table |
| 13 | PEBI integration | **Locked** — Nothing automatic V1 (standalone) |
| 1 | Product scope | **Locked** — ProPackHub platform; ES standalone SaaS |

### Locked decision index

| # | Decision |
|---|----------|
| 2 | Tenant = individual OR company |
| 3 | Simple customer table V1 |
| 4 | Template + Blank Canvas; My Templates |
| 5 | Independent templates V1; FS Phase 2 |
| 6 | Current material price only V1 |
| 8 | Mobile: sales reps only |
| 9 | No AI V1 |
| 10 | Basic dashboards V1 |
| 11 | Industrial Design Studio UI |
| 12 | Branded proposal + slab table |
| 13 | No approval workflow V1 |
| 13b | No PEBI auto-create V1 |
| 14 | Admin-seeded library |
| 15 | Quantity slab pricing |
| 16 | Flexible Packaging Cost Estimator |
| 17 | Standard templates = 11 PEBI parent PGs → variant subcards (BOM2); PE mono = 1 PE substrate; Printed→ink |
| 18 | Operation cost UI admin-only |
| 19 | **Printing web class:** Wide Web = Ink SB; Narrow Web = Ink UV. Laminate Alu insert confirmed. |
| 20 | **Cost visibility:** Sales rep sees selling price only (no markup/RM/cost breakdown). Same webapp on mobile (PWA). Admin configures per-user visibility in Settings. |
| 21 | **Dimensions:** **Reel width ≠ printing web width.** Web = `(reel × ups) + trim`. Pieces/kg & LM orders use reel width; press LM/kg & print run meters use web width. Full chain in PRD §6.9 + COSTING_NOTES §7. Field visibility per admin/sales rep profile. |
| 22 | **Global currency:** Material library **always USD** (`cost_per_kg_usd`). User picks **display currency** at registration. **Default:** auto-fetch **USD → display** rate from web FX API; **optional manual override** in Settings. Engine in USD; UI/PDF/slabs in display currency; rate frozen on each estimate. |
| 23 | **Client-side engine V1:** `packages/engine` bundled in **web + server** — instant UI calc (0ms perceived); server debounced reconcile for persist/PDF/audit. Offline draft sync remains Phase 2. |
| 24 | **SSO + entitlements:** SSO = identity handoff only. Access = **tenant + module subscription**. Multi-module tenants get entitled apps; single-module tenants are blocked (403) from apps they did not buy. |

**Full PRD (build from this):** [ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md)  
**Project memory (session log):** [ES_MEMORY.md](./ES_MEMORY.md)  
**Earlier outline:** [ES_PRD_v3_STRATEGIC.md](./ES_PRD_v3_STRATEGIC.md)

---

*All 12 strategic questions answered — PRD v3.0 generated.*
