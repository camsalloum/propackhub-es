# ProPackHub Estimation Studio — Audit Handoff

**Purpose:** Single entry point for an auditor agent (or human reviewer) before build starts.  
**Date:** 2026-06-12  
**Status:** Pre-build — documentation complete through Step 2; **no application code scaffolded yet**  
**Owner next gate:** Audit sign-off → explicit “go build” → Step 3 scaffold

---

## 1. What this product is

| Item | Value |
|------|--------|
| **Name** | ProPackHub Estimation Studio (ES) |
| **Tagline** | Flexible Packaging Cost Estimator |
| **Users** | Independent packaging sales reps / consultants |
| **Not** | PEBI MES `/estimator`, factory users, Oracle sync |
| **Math source** | Legacy Laravel estimator (`Estimator app/legacy-laravel/`) |
| **Simplicity rule** | Same costing model as Laravel — **not** PEBI depth |

---

## 2. Document map (read in this order)

| Priority | Document | Why |
|----------|----------|-----|
| 1 | **[ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md)** | Canonical build PRD (v3.1 audit-ready) |
| 2 | **[LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md)** | Strategic locks #2–#20 |
| 3 | **[legacy-laravel/COSTING_NOTES.md](./legacy-laravel/COSTING_NOTES.md)** | Engine formulas — source of truth |
| 4 | **[ES_STANDARD_TEMPLATES_SEED.json](./ES_STANDARD_TEMPLATES_SEED.json)** | 11 parent PG default stacks v3 |
| 5 | **[ES_WIREFRAMES.md](./ES_WIREFRAMES.md)** | ASCII wireframes WF-1–7 |
| 6 | **[mockup/es-estimate-editor.html](./mockup/es-estimate-editor.html)** | Interactive mockup — open in browser |
| 7 | **[ES_MEMORY.md](./ES_MEMORY.md)** | Session log + quick rules |

**Superseded / reference only:** `PRD_v3_Final.md` (enterprise — mostly rejected), `ES_PRD_v3_STRATEGIC.md` (outline).

---

## 3. Consolidated decisions (audit checklist)

Verify each is reflected in PRD §6–§7 and seed JSON.

| # | Decision | Summary |
|---|----------|---------|
| 2 | Tenant | Individual OR company |
| 3 | Customers | Simple table V1 |
| 4 | Entry | Template OR Blank Canvas + My Templates |
| 6 | Materials | Current price only V1 |
| 8 | Mobile | **One responsive webapp + PWA** — not native app V1 |
| 11 | Design | Industrial Design Studio — Laminate Visualizer hero |
| 12 | PDF | Branded proposal + **slab table** |
| 13 | Approvals | None V1 |
| 14 | Library | Admin-seeded → tenant copy |
| 15 | Pricing | Quantity slabs |
| 17 | Templates | **11 PEBI parent PGs only** (no variants) |
| 18 | Operations | Process/machine UI **admin-only**; engine still applies |
| 19 | Ink | **Wide Web = Ink SB (30%)** default all printed PGs; **Narrow Web = Ink UV (100%)**; Alu insert = Adh SB + Alu + Adh SB before PE |
| 20 | Visibility | Sales rep sees **selling price only** — no markup/RM/cost breakdown; admin configures per-user in Settings |
| 21 | Dimensions | **Reel width ≠ printing web width** — full yield chain from Excel/Laravel; visibility per user type (§6.9) |
| 22 | Currency | **USD library** + user **display currency**; **auto FX from web** (default) with **manual override** option (§6.10) |
| 23 | Client engine | **`packages/engine` in web + server** — instant UI calc; server reconcile (§7.1) |

### External audit refinements (PRD §6.11 — verify in spec)

| Topic | PRD section | V1 |
|-------|-------------|-----|
| Client-side engine | §7.1, Decision #23 | ✅ |
| Visibility presets (3 named) | §6.8 | ✅ |
| Collapse ups/trim + web-width tooltip | §6.9.6 | ✅ |
| Empty / loading / error states | §5.9 | ✅ |
| Mobile `inputmode` + keyboard | §5.8 | ✅ |
| Admin progressive disclosure | §5.7 | ✅ |
| Preview-as-user reflow | §5.7 | ✅ |
| Markup on material + effective margin % | §7.3 | ✅ |
| Dashboard expiring proposals | §11, §9.9 | ✅ |
| Gold WCAG; light-only V1 | §5.2 | ✅ |
| Capacitor-ready architecture | §10.3 | ✅ |
| Offline draft sync | §4.3 | Phase 2 |
| Undo Cmd+Z; inline library edit | §13 | V1.1 |

### Costing rules (must match Laravel)

- Layer types: `substrate` | `ink` | `adhesive` only
- Substrate GSM: `µ × density`; Ink/Adh GSM: `(solid × µ) / 100`
- Ink/Adh cost/m² uses **micron**, not GSM
- Solvent-mix block when SB ink/adhesive in stack
- Sale price: **additive** `RM + markup + plates + delivery + operation` — NOT `cost × (1+margin%)`
- Microns always user-variable (seed = hints)
- **Dimensions:** `printing_web_width = (reel_width × ups) + trim`; pieces/kg uses **reel width**; `linear_m_per_kg_web` uses **printing web width**; `linear_m_per_kg_reel` uses **reel width** (LM order unit)
- **Currency:** materials stored in **USD**; display uses tenant rate `1 USD = X`; auto FX default; estimate snapshots freeze rate

### Explicitly rejected for ES V1

- PEBI 8-step wizard, BOM2, routing AI
- Color-specific inks (Black/White SKUs)
- Margin-on-cost formula
- Native React Native app
- Approval workflow, marketplace templates
- Material price history

---

## 4. UI / UX summary

### Desktop (≥1024px)

- Split pane: scrollable form + sticky Laminate Visualizer + price sidebar
- Layer **table** with inline micron edit; **admin: expand row** for extra cost columns (§5.7)
- Admin: markup, solvent-mix, processes (when visibility allows)
- **Instant price:** client-side `packages/engine` (Decision #23)

### Mobile (<1024px) — **adaptive UI, same app**

- **Layer cards** (not shrunk table)
- **Bottom sheets** for edit micron / add layer / material picker (`inputmode="decimal"`)
- Swipe or button delete with confirm
- Sticky footer: selling price + PDF
- **QA gate:** add/edit/remove/reorder 4 layers on 375px width

### Sales rep default view (Decision #20)

**Hidden:** markup %, RM $/kg, cost/m², plates, delivery, operation, breakdown %, solvent $/kg, library prices, **yield conversions** (sqm/kg, lm/kg, pieces/kg), **roll-after-slitting detail**, alternate unit price columns  
**Visible:** structure, microns, **product dimensions** (reel width, cut-off, ups, trim), **printing web width** (read-only spec), total GSM, selling price, slabs (price only), PDF

### Interactive mockup tabs

Open `mockup/es-estimate-editor.html`:

| Tab | Shows |
|-----|--------|
| Estimate Editor | Desktop + Sales rep / Admin toggle |
| Template Picker | Groups A/B/C |
| **Mobile editor** | Phone frame — cards, sheets, add/delete |
| Team & Visibility | **Presets** + Customize toggles |

---

## 5. Build plan (sequential — owner approved)

| Step | Deliverable | Status |
|------|-------------|--------|
| **0** | Laravel extract + COSTING_NOTES | Done |
| **1** | Standard template seed v3 (11 PGs) | Done — micron hints await owner |
| **2** | Wireframes + HTML mockup | Done — **audit this** |
| **3** | Scaffold `propackhub-es/` monorepo | **Blocked on audit + go build** |
| **4** | Engine golden tests (Laravel JS parity) | Pending |
| **5** | MVP (auth, library, estimate, PDF, re-quote) | Pending |
| **6** | PWA + mobile QA gate | Pending |

### Phase timeline (post-scaffold — PRD §14)

| Phase | Weeks | Focus |
|-------|-------|--------|
| 1 Foundation | 1–4 | Auth, tenancy, library, engine tests |
| 2 Visualizer + Estimate | 5–8 | Editor desktop + **mobile adaptive**, calculate API |
| 3 Re-quote | 9–10 | Customer history, price refresh |
| 4 Proposals | 11–12 | PDF + slabs |
| 5 Platform | 13–14 | ProPackHub SSO, entitlements |
| 6 Polish | 15–16 | PWA, performance, Laravel golden tests |

---

## 6. Auditor tasks

### A. Scope & boundaries

- [ ] ES vs PEBI boundary clear and enforced in PRD §2
- [ ] No PEBI features leaked into V1 scope
- [ ] 11 templates match active PEBI parent PGs only

### B. Costing engine

- [ ] PRD §7 matches `COSTING_NOTES.md` (GSM rules, solvent, additive sale price)
- [ ] **PRD §6.9 / COSTING_NOTES §7** — reel width vs printing web width chain matches Excel I35, E38, E39 and Laravel JS
- [ ] Order qty units (`kgs`, `sqm`, `kpcs`, `lm`, `roll_500_lm`) convert to `order_kg` correctly
- [ ] **Client-side engine** in web matches server `/pricing/calculate` (Decision #23)
- [ ] Visibility **presets** documented and in acceptance criteria
- [ ] §5.9 empty/loading states specified
- [ ] **USD library + display currency** — auto FX fetch, manual override, estimate rate snapshot (§6.10)
- [ ] Ink SB 30% / UV 100% documented
- [ ] Golden test plan exists or is planned (Step 4)

### C. UX

- [ ] Desktop mockup aligns with WF-3
- [ ] Mobile mockup demonstrates cards + sheets (not table shrink)
- [ ] Sales rep view hides all cost/markup fields
- [ ] Visibility settings documented (WF-7, PRD §6.8) — **includes dimension field toggles §6.9**

### D. Data model

- [ ] `users.visibility_profile` JSONB in PRD §8
- [ ] `printing_web_class` on estimations
- [ ] API strips fields per visibility profile (PRD §6.8, §9.5)

### E. Gaps / open questions

| Item | Owner input needed? |
|------|---------------------|
| Seed micron defaults | Nice-to-have sign-off |
| ES domain / hosting | Yes |
| Ahmed-style “custom markup visible” users | Admin toggle only — confirm OK |
| Offline PWA | Phase 2 — confirm deferred |

---

## 7. Audit report template

Auditor should return:

```markdown
## ES Audit — [date]

### Verdict: PASS | PASS WITH NOTES | FAIL

### Findings
1. [Critical/Major/Minor] ...

### PRD gaps found
- ...

### Recommended before Step 3
- ...
```

---

## 8. Related code outside this folder

| Path | Note |
|------|------|
| `D:\PPH 26.4\PPH\` | PEBI — PG classification migration applied locally |
| `D:\PPH 26.4\propackhub-fs\` | Reference monorepo architecture for ES scaffold |
| `D:\PPH 26.4\Estimator app\legacy-laravel\` | Laravel backup + COSTING_NOTES |

**No `propackhub-es/` folder exists yet.**

---

*Prepared for external agent audit. After PASS → owner says “go build” → Step 3.*
