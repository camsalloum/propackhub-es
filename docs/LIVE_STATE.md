# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-27 (session end — bag 2D polish + 3D toggle)
**Session focus:** Bag configurator 2D dimension labels + optional bottom-gusset 3D preview

---

## Where we stopped (read this first next session)

### Bag configurator — current state ✅

| Item | Status |
|------|--------|
| **When active** | Product type = **Bag** + mapped subtype (9 types) |
| **Layout** | Bolt-style: **input row** (mm) → **2D SVG or 3D** → status bar |
| **2D polish** | All 9 subtypes show **`W=400mm`** style dim labels (legacy configurator format) |
| **3D toggle** | **Bottom-gusset only** — 2D \| 3D buttons in input row; lazy-loaded `BagScene3D` (~900 KB chunk) |
| **3D inputs** | Same W/H/G/F mm from `fieldVals` / `drawDims` — no duplicate controls, colors, or branding |
| **Data** | Writes `dimensions` JSONB unchanged |
| **Gauge / GSM** | **Not** on bag panel — Structure web totals only |

### Next — planned (user)

- [ ] Hard refresh + **manual test**: change W/H/G on each bag subtype; save estimate; reload dimensions
- [ ] 3D: extend to other subtypes if bottom-gusset test passes (or keep 2D-only for non-bottom-gusset)
- [ ] Optional: further 2D alignment tweaks per subtype (courier POD, diaper NC, etc.)

### Key files (bag configurator)

```
packages/web/src/lib/bagConfiguratorCatalog.ts  — subtype map, field defs, seedBagDimensionPatch
packages/web/src/lib/bagDrawDims.ts             — draw normalization + status bar labels
packages/web/src/components/BagSchematic.tsx    — 9× Bolt-style 2D SVG + mm dim labels
packages/web/src/components/BagGeometry3D.tsx   — bottom-gusset mesh (no branding)
packages/web/src/components/BagScene3D.tsx        — R3F canvas (lazy import)
packages/web/src/components/BagConfigurator.tsx — input row + 2D/3D toggle + status
packages/web/package.json                       — three, @react-three/fiber, @react-three/drei
packages/web/vite.config.ts                     — optimizeDeps for three/R3F
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
