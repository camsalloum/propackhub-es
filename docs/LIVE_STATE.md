# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-19 (Phase 1 complete)

## Status: ✅ PHASE 1 + PHASE 2 COMPLETE — All bugs, schema, API, UI implemented

- **Phase:** Estimation Studio Phase 1 core functionality + all costing bugs (Part A)
- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`
- **Build spec (canonical):** [ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md)
- **Bugs resolved:** [ES_BUGS_AND_PRD_GAPS.md](./ES_BUGS_AND_PRD_GAPS.md) — Part A: 9/9 ✅ FIXED

---

## What works (verified 2026-06-19)

| Area | Status |
|------|--------|
| Auth + tenant + material/template seed | ✅ |
| Quote loop: template → edit → save → calculate → price | ✅ |
| Slab pricing: per-quantity calculation + persistence | ✅ |
| Solvent mix costing (wide web SB ink/adhesive) | ✅ |
| Client-side `@es/engine` instant price preview | ✅ |
| Dashboard summary + expiring proposals (7 days) | ✅ |
| Display currency, visibility profile, re-quote + auto-calc | ✅ |
| Re-quote banner with USD price changes + stale warnings | ✅ |
| Save Draft vs Save & Calculate (split buttons) | ✅ |
| Markup % label + Effective margin % (on sale price) | ✅ |
| Layer delete confirmation (inline swipe, no window.confirm) | ✅ |
| Customer getCustomer(id) API (no N+1) | ✅ |
| Customer autocomplete (debounced API, ≥2 chars) | ✅ |
| Duplicate estimate (frozen prices) | ✅ |
| PDF (Puppeteer + branded pdfkit fallback) | ✅ |
| PWA service worker (Vite prod assets) | ✅ |
| Mobile: bottom nav, cards, sheets, swipe delete | ✅ |
| Platform admin: master library API + UI | ✅ |
| PEBI SSO stub | ✅ |
| Categories + subcategories (taxonomy, seeded on register) | ✅ |
| Slab templates (standard/large, seeded on register) | ✅ |
| Layer snapshots on calculate (B5) | ✅ |
| Estimation cost snapshot table on calculate (B4) | ✅ |
| Proposals table (schema + SQL patch) | ✅ |
| Slabs sort_order column | ✅ |
| structure_templates.is_standard column | ✅ |
| Supported currencies endpoint (30+ ISO codes) | ✅ |
| Register.tsx: full currency dropdown from API | ✅ |
| Library: skeleton loader (D6) | ✅ |
| TemplatePicker: skeleton + grouped templates + My Templates tab | ✅ |
| Settings: preview as user + customize visibility grid | ✅ |
| EstimateEditor: order qty + unit selector, roll spec panel | ✅ |
| Printing web width tooltip (D7) | ✅ |
| CustomerDetail: mini LaminateVisualizer per row + getCustomer | ✅ |
| **Engine tests** | ✅ **19/19** |
| **Web tsc** | ✅ |
| **Server tsc** | ✅ |
| **Server integration tests** | ✅ **7/7** |

---

## Fixed in this session (2026-06-19)

| Item | Fix | Status |
|------|-----|--------|
| A2: Slab per-quantity pricing | Return statement in calculator.ts: explicit mapping instead of spread to preserve calculated pricePerKg | ✅ FIXED |
| Integration test blocker | Debug traced root cause to TypeScript spread operator not preserving override values on Slab type | ✅ FIXED |
| Debug logging | Cleaned up console.log statements after fix verified | ✅ |
| All Part A items (A1-A9) | Verified implementation in code: solvent, slabs, visibility, re-quote USD, buttons, profile gates, labels, customer API, confirm UX | ✅ 9/9 |
---

## Phase 2 — Complete ✅

All items from [ES_BUGS_AND_PRD_GAPS.md](./ES_BUGS_AND_PRD_GAPS.md) Sections B-D are now shipped:

### Critical (blocking re-quote accuracy):
- **B5:** Layer snapshots — persist material snapshot fields on estimate_layers for re-quote "was" pricing
- **B4:** Estimation costs snapshot table — audit trail for when cost was last calculated

### Important (customer/library ergonomics):
- **B1:** Categories/subcategories — taxonomy picker in Library and EstimateEditor
- **C1:** Customer autocomplete — debounced search dropdown
- **C3:** Currency list API — support registration currency expansion

### Nice-to-have (UI polish):
- **B2, B3, B6, B7:** Proposals, slab templates, sort order, standard flag
- **C2:** Duplicate estimate with frozen prices
- **D1-D9:** Template groups, roll spec, unit selector, preview as user, skeleton loaders, stale warnings, mini visualizers

**Estimated effort:** Phase 2 ~40 hours (DB schema 8h, API 16h, UI 16h)

---

## How to build and test

```bash
# Restore dependencies and database
npm install
cd packages/server && npm run db:patch
cd ../.. && npm run start:servers
# http://localhost:5000 (web)
# http://localhost:5001 (api)

# Run tests
cd packages/engine && npm run test       # 12/12 ✅
cd packages/server && npm run test       # 7/7 ✅
cd packages/web && npm run build         # Vite build

# Commit changes
./GIT-SAVE.bat
```
