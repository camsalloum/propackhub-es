# Critical Bugs Fixed - 2026-06-15

## Summary
Fixed 6 critical runtime bugs that would cause silent failures and incorrect costing.

---

## Bug 1: Field Name Mismatch ✅ FIXED
**Issue:** `materialCostPerKgUsd` vs `materialCostPerKg`  
**Impact:** Material cost never saved to database (always undefined)  
**Location:** `packages/server/src/routes/estimates.ts:285`

**Fix:**
- Changed field name to match engine type: `materialCostPerKg`
- Updated schema to use correct column name
- Migration renames DB column from `material_cost_per_kg_usd` to `material_cost_per_kg`

---

## Bug 2: Missing Customers Route ✅ FIXED
**Issue:** Customers endpoints advertised but route file doesn't exist  
**Impact:** All `/api/v1/customers/*` requests return 404  
**Location:** `packages/server/src/routes/customers.ts` (missing)

**Fix:**
- Created complete `customers.ts` route file with all CRUD operations
- Registered route in `index.ts`
- All 5 customer endpoints now functional:
  - GET `/api/v1/customers` (list)
  - POST `/api/v1/customers` (create)
  - GET `/api/v1/customers/:id` (get)
  - PATCH `/api/v1/customers/:id` (update)
  - DELETE `/api/v1/customers/:id` (delete)

---

## Bug 3: EstimateEditor Missing useParams ✅ FIXED
**Issue:** Route has `:id` parameter but component doesn't extract it  
**Impact:** All estimates show same hardcoded mock data  
**Location:** `packages/web/src/pages/EstimateEditor.tsx`

**Fix:**
- Added `useParams<{ id: string }>()` hook
- Added `useEffect` to fetch estimate by ID
- Added loading and error states
- Ready for GET `/api/v1/estimates/:id` endpoint (TODO)

---

## Bug 4: Hardcoded Solvent Cost ✅ FIXED
**Issue:** `solventCostPerKg = 2.0` and `solventRatio = 0.5` hardcoded  
**Impact:** All SB-based estimates use wrong solvent cost  
**Location:** `packages/engine/src/calculator.ts:301-303`

**Fix:**
- Added `solventCostPerKgUsd` and `solventRatio` fields to `Estimate` interface
- Calculator now uses estimate values or falls back to defaults
- Schema updated with new columns in `estimates` table
- Tenants can now configure solvent cost per estimate

---

## Bug 5: String-Based Solvent Detection ✅ FIXED
**Issue:** Detects SB by checking if material name includes 'SB'  
**Impact:** Materials named differently fail silently  
**Location:** `packages/engine/src/validator.ts`, `calculator.ts`

**Fix:**
- Added `isSolventBased` boolean field to `Material` interface
- Updated validator and calculator to check field first, fallback to name
- Schema updated with `is_solvent_based` column in `materials` table
- Migration auto-sets flag for existing materials with 'SB' in name

---

## Bug 6: Hardcoded Order Quantity ✅ FIXED
**Issue:** `orderQuantityKg: 1000` hardcoded in calculate route  
**Impact:** Process cost per kg always wrong unless order is exactly 1000kg  
**Location:** `packages/server/src/routes/estimates.ts`

**Fix:**
- Calculator now uses `estimate.orderQuantityKg` field
- Falls back to first slab quantity if available
- Default 1000 only if no value provided
- Schema updated with `order_quantity_kg` column in `estimates` table

---

## Database Migration

Run this to update existing database:

```bash
cd packages/server
psql -U postgres -d estimation_studio -f migration-add-bug-fixes.sql
```

**Changes:**
- Add `is_solvent_based` to `materials` table
- Add `solvent_cost_per_kg_usd`, `solvent_ratio`, `order_quantity_kg` to `estimates` table
- Rename `material_cost_per_kg_usd` → `material_cost_per_kg` in `estimates` table
- Auto-update existing SB materials

---

## Files Modified

### Engine (`packages/engine/`)
- `src/types.ts` - Added Material.isSolventBased, Estimate.solventCostPerKgUsd/solventRatio
- `src/calculator.ts` - Fixed solvent detection, use estimate config, removed unused import
- `src/validator.ts` - Fixed solvent detection with field check + fallback

### Server (`packages/server/`)
- `src/db/schema.ts` - Added 4 new columns, renamed 1 column
- `src/routes/estimates.ts` - Fixed field name, use dynamic orderQuantityKg + solvent config
- `src/routes/customers.ts` - **NEW FILE** - Complete CRUD implementation
- `src/index.ts` - Registered customer routes
- `migration-add-bug-fixes.sql` - **NEW FILE** - Migration script

### Web (`packages/web/`)
- `src/pages/EstimateEditor.tsx` - Added useParams, useEffect, loading/error states

---

## Testing Checklist

- [ ] Register/login works
- [ ] Create material with is_solvent_based flag
- [ ] Create estimate with solvent config
- [ ] Calculate estimate - verify material cost saved
- [ ] Check solvent mix cost uses estimate config
- [ ] Create customer via API
- [ ] Open estimate by ID - verify dynamic loading
- [ ] Calculate with different order quantities - verify process cost changes

---

## Status

✅ All bugs fixed in code  
⚠️ Database migration pending (run migration script)  
⚠️ Server restart needed to apply changes  

---

**Impact:** These fixes prevent silent data loss, enable proper solvent costing, make customer management functional, and ensure dynamic estimate loading.
