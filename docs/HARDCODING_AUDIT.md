# Estimation Studio — Hardcoding Audit

**Date:** 2026-06-23  
**Status:** Living document — review each item and mark as Keep / Change / Done  
**Purpose:** Track every place the app uses a hardcoded value that may belong in Master Data or tenant settings instead.

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Fixed | Already changed to dynamic |
| 🔴 Change | Should be dynamic — not yet changed |
| 🟡 Discuss | May be acceptable hardcoding — needs owner decision |
| ⚪ Keep | Confirmed acceptable — belongs in code, not data |

---

## 1. Currency

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| C1 | `EstimateEditor.tsx` | ~332 | Blank-canvas estimate init currency | `'AED'` | ✅ Fixed → `'USD'` | Legacy path, rarely hit — server always provides real currency |
| C2 | `EstimateEditor.tsx` | ~547 | Client-side calc fallback currency | `'AED'` | ✅ Fixed → `'USD'` | Engine computes in USD; display currency comes from estimate |
| C3 | `Dashboard.tsx` | ~86 | Summary card currency fallback | `'AED'` | ✅ Fixed → `'USD'` | Fallback only when estimate has no displayCurrency |
| C4 | `Dashboard.tsx` | ~86 | Locale for number formatting | `'en-AE'` | ✅ Fixed → `undefined` (browser locale) | Was hardcoded to UAE locale |
| C5 | `Register.tsx` | ~24 | Registration form default currency | `'AED'` | 🟡 Discuss | User sees this and changes it. Could be driven by geo-IP or admin config |
| C6 | `Settings.tsx` | ~27 | Settings page initial state | `'AED'` | ⚪ Keep | Immediately overwritten by `settings.displayCurrency` from API |

---

## 2. Product types & families

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| P1 | `EstimateEditor.tsx` | ~1142 | Kind dropdown options (Pouch/Bag) | `<option value="pouch">` / `<option value="bag">` | ✅ Fixed | Now filtered from `masterReference.productTypeOptions` |
| P2 | `masterDataReference.ts` | ~106 | Default product type options | `['roll','sleeve','pouch','bag']` | ⚪ Keep | Fallback constants for before Master Data loads |
| P3 | `productCatalog.ts` | ~57 | `PRODUCT_FAMILY_LABELS` map | `{roll:'Roll', sleeve:'Sleeve', pouch:'Pouch', bag:'Bag'}` | 🟡 Discuss | Used for UI labels. Could come from `productTypeOptions[].label` |
| P4 | `productCatalog.ts` | ~62 | `engineTypeForFamily()` mapping | identity for roll/sleeve/pouch/bag | ⚪ Keep | Four first-class product types (2026-07-04) |

---

## 3. Product subtypes (Bag/Pouch types)

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| S1 | `EstimateEditor.tsx` | ~1149 | Subtype dropdown | `subtypesForFamily()` static catalog | ✅ Fixed | Now from `masterReference.productSubtypeOptions` with static fallback |
| S2 | `masterDataReference.ts` | ~91 | `DEFAULT_PRODUCT_SUBTYPE_OPTIONS` | 18 hardcoded subtypes | ⚪ Keep | Fallback only — Master Data is the live source |
| S3 | `productCatalog.ts` | ~113–140 | `POUCH_SUBTYPES` / `BAG_SUBTYPES` catalog | Full static list with dimension fields | 🟡 Discuss | Labels/codes duplicated from Master Data. The **dimension field schemas** (which inputs appear) must stay in code — the labels could come from Master Data |
| S4 | `TemplateBuilder.tsx` | ~282 | Subtype picker in template editor | Uses `productSubtypeOptions` first, static fallback | ⚪ Keep | Correctly dynamic already |

---

## 4. Dimension field schemas

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| D1 | `productCatalog.ts` | ~70–100 | `ROLL_FIELDS`, `SLEEVE_FIELDS`, `POUCH_BASE`, `BAG_BASE` | Hardcoded field definitions (key, label, type, unit) | ⚪ Keep | These are UI field structure definitions, not business data. Master Data should not store "which input boxes appear for a Stand-up Pouch" |
| D2 | `productCatalog.ts` | ~144 | `dimensionFieldsFor()` | Static lookup by subtype key | 🟡 Discuss | Works correctly. Could be table-driven if we ever need custom dimension fields per subtype |

---

## 5. Markup & pricing defaults

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| M1 | `EstimateEditor.tsx` | ~94 | `markupPercent` initial React state | `15` | ⚪ Keep | Immediately overwritten by `data.markupPercent` from server (which reads tenant `defaultMarkupPercent`) |
| M2 | `Settings.tsx` | ~25 | `defaultMarkup` initial state | `15` | ⚪ Keep | Overwritten by `settings.defaultMarkupPercent` from API on load |
| M3 | `Settings.tsx` | ~62 | Fallback if `defaultMarkupPercent` missing | `|| 15` | 🟡 Discuss | If tenant has no markup set, 15% is assumed. Should be a platform-level setting |

---

## 6. Slab quantities

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| SL1 | `EstimateEditor.tsx` | ~327 | Blank-canvas initial slabs | `[1000, 2000, 5000]` | 🟡 Discuss | Dead-code path (templates always go through server instantiate). But still shown if blank canvas is ever used |
| SL2 | `EstimateEditor.tsx` | ~758 | `displaySlabs` render fallback | `[1000, 2000, 5000]` | 🟡 Discuss | Safety fallback when `slabsState` is empty — should never be hit in normal flow |
| SL3 | `EstimateEditor.tsx` | ~1283 | "Add Slab Row" default quantity | `quantityKg: 1000` | 🟡 Discuss | When admin adds a slab manually, default qty is 1000 kg. Could be configurable |
| SL4 | `Settings.tsx` | — | Slab template options | from API | ✅ Fixed 2026-07-04 | Loads `apiClient.getSlabTemplates()`; labels built from name + quantities |

---

## 7. Layer types

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| L1 | `EstimateEditor.tsx` | ~1069 | Add Layer dropdown options | `substrate / ink & coating / adhesive` | 🟡 Discuss | These match the engine's 3 layer types — they are structural constants. However `masterReference.rmTypeOptions` exists and could drive this |
| L2 | `LAYER_TYPE_LABELS` | ~57 | Layer type display labels | `{substrate:'Substrate', ink:'Ink & Coating', adhesive:'Adhesive'}` | 🟡 Discuss | Could come from `rmTypeOptions[].label` |

---

## 8. Processes

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| PR1 | `TemplateBuilder.tsx` | ~91 | `deriveDefaultProcesses()` | Checks codes like `'extrusion'`, `'printing'`, etc. | ⚪ Keep | Logic is code — reads from `processOptions` (Master Data). The code-to-product-family mapping must stay in code |
| PR2 | `masterDataReference.ts` | ~66 | `DEFAULT_PROCESS_OPTIONS` | 7 hardcoded processes | ⚪ Keep | Fallback only — Master Data is live source |

---

## 9. Template classification / filter logic

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| TC1 | `templateCatalog.ts` | ~15 | `TEMPLATE_CATALOG_FILTERS` | Filter labels like `'PE · Plain'`, `'Duplex'` | ⚪ Keep | These are UI classification buckets derived from material class + structure — pure logic |
| TC2 | `templateCatalog.ts` | All | Classification logic (PE, Non-PE, Mono, Duplex detection) | Code-based rules | ⚪ Keep | Domain classification logic — not business data |

---

## 10. Exchange rate

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| FX1 | `Settings.tsx` | — | Default FX rate initial state | `1` (neutral) | ✅ Fixed 2026-07-04 | Overwritten by `getSettings()`; no regional flash |
| FX2 | `server/.env.example` | — | `FX_API_URL` template | Points to USD pair | ⚪ Keep | Server config, not user-facing |

---

## 11. Printing web class

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| WC1 | `masterDataReference.ts` | ~115 | `printingWebClassOptions` defaults | Wide Web (Ink SB 30%) / Narrow Web (Ink UV 100%) | ⚪ Keep | These are locked decisions (#19) — the two ink systems are product constants, not admin-configurable data |

---

## 12. Unit options

| # | File | Line | What | Current value | Status | Notes |
|---|------|------|------|---------------|--------|-------|
| U1 | `masterDataReference.ts` | ~123 | `DEFAULT_MASTER_REFERENCE.unitOptions` | `[kgs, kpcs, sqm, lm, roll_500_lm]` | ⚪ Keep | Fallback — live source is `masterReference.unitOptions` from server |
| U2 | `JobHeaderFields.tsx` | — | Order quantity unit dropdown | Driven by `unitOptions` prop | ⚪ Keep | Already dynamic |

---

## Summary

| Category | Fixed | Change needed | Discuss | Keep |
|----------|-------|---------------|---------|------|
| Currency | 4 | 0 | 1 | 1 |
| Product types | 1 | 0 | 2 | 1 |
| Subtypes | 1 | 0 | 2 | 1 |
| Dimension schemas | 0 | 0 | 1 | 1 |
| Markup defaults | 0 | 0 | 1 | 2 |
| Slab quantities | 0 | 1 | 3 | 0 |
| Layer types | 0 | 0 | 2 | 0 |
| Processes | 0 | 0 | 0 | 2 |
| Template classification | 0 | 0 | 0 | 2 |
| Exchange rate | 0 | 1 | 0 | 1 |
| Printing web class | 0 | 0 | 0 | 1 |
| Unit options | 0 | 0 | 0 | 2 |
| **Total** | **6** | **2** | **12** | **14** |

**Priority items to discuss next:**
- L1/L2: Layer type labels — could unify with `rmTypeOptions` from Master Data
- P3: Product family labels — could come from `productTypeOptions[].label` directly

**Closed 2026-07-04:** SL4 (slab templates from API), FX1 (neutral FX initial state `1`).
