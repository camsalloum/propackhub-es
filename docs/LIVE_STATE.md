# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-27 (session — removed bag 3D preview)
**Session focus:** Bag configurator 2D only (3D reverted per user)

---

## Where we stopped (read this first next session)

### Bag configurator — current state ✅

| Item | Status |
|------|--------|
| **When active** | Product type = **Bag** + mapped subtype (9 types) |
| **Layout** | Bolt-style: **input row** (mm) → **2D SVG** → status bar |
| **2D polish** | All 9 subtypes show **`W=400mm`** style dim labels |
| **3D** | **Removed** — user preference; 2D schematic only |
| **Data** | Writes `dimensions` JSONB unchanged |
| **Gauge / GSM** | **Not** on bag panel — Structure web totals only |

### Next — planned (user)

- [ ] Hard refresh + **manual test**: change W/H/G on each bag subtype; save estimate; reload dimensions

### Key files (bag configurator)

```
packages/web/src/lib/bagConfiguratorCatalog.ts  — subtype map, field defs, seedBagDimensionPatch
packages/web/src/lib/bagDrawDims.ts             — draw normalization + status bar labels
packages/web/src/components/BagSchematic.tsx    — 9× Bolt-style 2D SVG + mm dim labels
packages/web/src/components/BagConfigurator.tsx — input row + schematic + status
packages/web/src/pages/EstimateEditor.tsx       — bagDimensionsPanel in JobHeaderFields
```

### Prior session work (still valid)

| Area | Status |
|------|--------|
| Template ink controls | ✅ 4% column vertical `+▲▼✕`; structure lock = stack only |
| Engine SB/UV | ✅ Layer `isSolventBased`; 86 engine tests |
| Job details unified | ✅ Subtype + order qty in spec row; bag panel below when bag |
| Field edits | ✅ Local draft inputs; direct `dimensionKey` patch |

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
