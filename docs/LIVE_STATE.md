# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-26 (session end — bag configurator)
**Session focus:** Bag visual configurator (2D Bolt UX) integrated into Job details; field-edit fixes

---

## Where we stopped (read this first tomorrow)

### Bag configurator — current state ✅

| Item | Status |
|------|--------|
| **When active** | Product type = **Bag** + mapped subtype (9 types) |
| **Replaces** | Old Job details width/height/gusset columns (`dimensionFields={[]}`) |
| **Layout** | Bolt-style: **input row** (mm) → **live 2D SVG** → status bar (face area, flat sheet) |
| **Data** | Writes `dimensions` JSONB (`openWidthMm`, `bottomGussetMm`, `bag*` keys, etc.) |
| **Gauge / GSM** | **Not** on bag panel — Structure web totals only |
| **Template quotes** | Bag dimensions **editable** (structure lock applies to layers only) |
| **Field edits** | Fixed: no `effectiveBagFieldValue` snap-back; local draft inputs; direct `dimensionKey` patch |

### Tomorrow — planned (user)

- [ ] **Polish 2D** schematic (all 9 subtypes): alignment, dim labels, subtype-specific fields on drawing where useful
- [ ] **Add 3D** (test): optional toggle; start with **bottom-gusset** using reviewed Bolt/R3F mockup (`BagScene`, `BagGeometry`) — lazy-load `three` + R3F; **no** duplicate controls / colors / branding
- [ ] Hard refresh + test: change W/H/G on each bag subtype; save estimate; reload dimensions
- [ ] Reference assets: `mes_packaging_configurator_v2.html` (legacy 2D), user Bolt HTML (2D+3D toggle), pasted 3D mockup (bottom-gusset only)

### Key files (bag configurator)

```
packages/web/src/lib/bagConfiguratorCatalog.ts  — subtype map, field defs, seedBagDimensionPatch
packages/web/src/lib/bagDrawDims.ts             — draw normalization + status bar labels
packages/web/src/components/BagSchematic.tsx    — 9× Bolt-style 2D SVG (ResizeObserver)
packages/web/src/components/BagConfigurator.tsx — input row + schematic + status
packages/web/src/pages/EstimateEditor.tsx     — bagDimensionsPanel in JobHeaderFields; seed on subtype
```

**Removed:** `bagSchematicLayout.ts` (SVG overlay inputs — abandoned)

**Not in repo yet:** 3D components (`BagScene`, `BagGeometry`) — review only; integrate tomorrow

### 3D mockup review notes (do not copy blindly)

- Fix TS typos: `useState<BagConfig>`, `useRef<THREE.Group>`, `Partial<BagConfig>`
- Skip: bag color, branding, volume formula, separate ControlsPanel
- Wire 3D from same `fieldVals` as 2D (W/H/G mm), lazy import, bottom-gusset first

### Prior session work (still valid)

| Area | Status |
|------|--------|
| Template ink controls | ✅ 4% column vertical `+▲▼✕`; structure lock = stack only |
| Engine SB/UV | ✅ Layer `isSolventBased`; 86 engine tests |
| Job details unified | ✅ Subtype + order qty in spec row; bag panel below when bag |

### Template lock rules (source of truth)

| Field | Substrate / adhesive (template) | Ink & coating (template) |
|-------|--------------------------------|---------------------------|
| Family / grade | Editable | Editable |
| µ / $/kg | Editable | Editable |
| Add / move / remove | Hidden | `+▲▼✕` |

**Bag dimensions:** always editable (not part of template stack lock).

---

## Architecture (unchanged)

Monorepo: `packages/web`, `packages/engine`, `packages/server`. Open ES folder: `D:\ProPackHub\apps\estimation-studio`.
