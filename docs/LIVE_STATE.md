# LIVE STATE — Estimation Studio

> ✅ **2026-06-24 update:** Major session — single source of truth for materials, new ink costing model, Bag as first-class type, template repair, all bugs fixed. Engine 67/67, server 37/37. All changes committed and merged to `main`.

**Last updated:** 2026-06-24
**Session:** Estimate save + template resume — **user verified OK**; paused for tomorrow

---

## Architecture

- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`
- **Platform master:** `platform_master_materials` + `platform_reference_items` (PostgreSQL)
- **Single source:** Raw Materials page (`/library`) IS the Master Data page — no separate Library
- **Sync:** Admin saves Raw Materials → all tenant `materials` rows auto-synced; platform master always wins (no manual override at library level)
- **Temporary price override:** Edit Cost/Kg in the estimate layer table → saved as `unit_cost_snapshot_usd` per layer
- **Tests:** engine 67/67 ✅, server integration tests ✅
- **Migrations applied:** 0000_initial_schema, 0001_sessions, 0002_liquid_cost_usd, 0003_product_type_bag

---

## What works (verified 2026-06-24)

| Area | Status |
|------|--------|
| Platform master tables + seed from JSON on first API start | ✅ |
| Raw Materials page — RM Types first tab, then material tabs (dynamic from RM types) | ✅ |
| Adding new RM Type → auto-generates material tab + filter tab in estimates | ✅ |
| All users can view Raw Materials; only admins can edit/save | ✅ |
| Template → Estimate explosion: correct layer types + seed micron defaults | ✅ |
| Template material repair: 499 templates fixed across 109 tenants | ✅ |
| Layer table: Type / Family (dropdown) / Grade Name (filtered) / Value / Total GSM / Cost/Kg / Cost/M² | ✅ |
| Cost/Kg: always-editable inline input; updates all formulas live | ✅ |
| Cost/M² precision: 4dp, no rounding via usdToDisplay (fixed) | ✅ |
| Ink/Adhesive new costing model: user enters DRY GSM; library stores dry-equiv cost | ✅ |
| Liquid Cost column in Raw Materials with auto-computed dry-equiv Cost/Kg | ✅ |
| Correct ink density + solid% values (owner spec) applied to all tenants | ✅ |
| Bag = first-class product type (DB enum, engine, Zod, validation) | ✅ |
| Save & Calculate: dimension errors now offer "save structure only" fallback | ✅ |
| Estimate Save/PATCH: processes + gsm persist; no-store cache on GET after PATCH | ✅ (2026-06-24) |
| Template re-use: resume last saved draft (session + API by `sourceTemplateKey`) | ✅ user-verified 2026-06-24 |
| Total GSM format: xx.xx; Value column: xx.x | ✅ |
| Materials pagination: limit=500 request, limit=1000 server cap, sorted by type+name | ✅ |
| GIT-SAVE.bat: pushes current branch dynamically | ✅ |
| All migrations applied to DB | ✅ |

---

## Ink/Adhesive Costing Model (new 2026-06-24)

**User enters:** dry GSM (e.g. 2 gsm of ink deposited on film)

**Library stores:**
- `liquidCostUsd` — price paid per kg of liquid ink (user-entered, stored to avoid float drift)
- `solidPercent` — solid content % of the liquid ink
- `costPerKgUsd` — **auto-computed dry-equivalent**: `liquidCostUsd / (solidPercent / 100)`

**Engine formula:**
```
cost/m² = (dry_gsm / 1000) × costPerKgUsd_dry_equiv
```

**Example:** 2 gsm dry, SB ink 35% solid, liquid price $4.60/kg
- dry-equiv = $4.60 / 0.35 = $13.14/kg
- cost/m² = (2/1000) × 13.14 = **$0.0263/m²** ✓

**For UV-LED (100% solid):** dry-equiv = liquid price (no conversion needed)

---

## Default Ink/Adhesive Specs (owner-confirmed 2026-06-24)

| Family | Name | Density | Solid% |
|--------|------|---------|--------|
| Solvent Based | Common Colors | 1.05 | 35 |
| Solvent Based | Special Colors | 1.10 | 45 |
| Solvent Based | Primer | 0.95 | 20 |
| Solvent Based | Glossy Varnish | 0.95 | 25 |
| Solvent Based | Matt Varnish | 0.95 | 27 |
| Solvent Based | Heat Seal | 0.95 | 42 |
| Solvent Based | Wax | 0.95 | 100 |
| Solvent Based | Cold Seal | 1.00 | 52 |
| UV-LED | All types | 1.05–1.15 | 100 |
| Solvent Base (adhesive) | Solvent Base | 1.10 | 35 |
| Solvent Less (adhesive) | Solvent Less | 1.10 | 100 |
| Mono Component (adhesive) | Mono Component | 1.05 | 35 |

---

## Product Types

| Code | Engine path | Costing formula |
|------|-------------|-----------------|
| `roll` | roll | reel_width × cutoff |
| `sleeve` | sleeve | same as roll |
| `pouch` | pouch | open_width × open_height |
| `bag` | **bag** (first-class, own DB value) | open_width × open_height (same area formula as pouch) |

---

## Open Items / Next Session

- [x] Estimate save + template resume flow (micron/GSM, Save, return to Templates, OK on resume) — **verified by user 2026-06-24**
- [ ] PWA: disable service worker in dev or fix `undefined` Response in `service-worker.js` (console noise only)
- [ ] SC-7: cancel doesn’t detect dirty layers; SC-8: cost/kg override `> 0` check (from SAVE_AND_CALCULATE audit)
- [ ] Verify full estimate save flow for Bag type end-to-end
- [ ] PDF proposal: check bag dimensions appear correctly
- [ ] Phase 6 value features (comparison view, attachments)
- [ ] Phase 7 visuals (per-subtype product visual, domain catalog)
- [ ] Server integration tests: update for new costing model + bag type
- [ ] Consider: `isSolventBased` flag update for adhesives with solid% < 100
