# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-26 (bag visual configurator)
**Session focus:** Bag schematic configurator from MES HTML; inline dimension editing on Job details

---

## Where we stopped (read this first tomorrow)

| **Bag visual configurator** | ✅ When Product type = Bag + mapped subtype: `BagConfigurator` shows SVG schematic with editable dimension inputs on drawing; syncs to `dimensions` JSONB; spec-row bag dims hidden |

### Key files (bag configurator)

```
packages/web/src/lib/bagConfiguratorCatalog.ts   — subtype → schematic type, field → dimension key
packages/web/src/components/BagSchematic.tsx     — 9 bag SVG drawings + foreignObject inputs
packages/web/src/components/BagConfigurator.tsx  — schematic + supplementary fields (µm, vents, wicket)
packages/web/src/pages/EstimateEditor.tsx      — renders configurator; seeds defaults on subtype change
mes_packaging_configurator_v2.html               — source reference (not runtime)
```

### Done this session (prior)

| Area | Status |
|------|--------|
| **Template estimates — ink & coating** | ✅ `structureLocked` when `sourceTemplateKey` set. **Stack composition** fixed (no add/remove substrate/adhesive). All layers: family, grade, µ, $/kg editable. Ink only: add/remove/reorder via `+▲▼✕` |
| **Ink row controls (desktop)** | ✅ Dedicated **4%** column — vertical `+▲▼✕` stack (ink rows only); not inside $/m². Unlocked estimates: 10% horizontal actions col |
| **`insertInkLayerAfter`** | ✅ Adds ink below row; `insertInkLayerAfter(-1)` for first ink on row 1 when template has none |
| **Removed bottom add dropdown** | ✅ Template quotes: no “+ Add Layer…” below table; ink added via row `+` |
| **Ink grade GSM fix** | ✅ Grade change on ink uses `gsm = micron` (not µ×density) |
| **TemplateBuilder fullscreen** | ✅ Full viewport: header / scroll body / footer. Layers as full-width **table** (#, Type, Material, Order) not cramped flex rows |
| **Helpers** | ✅ `canEditLayerStructure` (ink-only row actions when template-locked) |

### UX iterations (what failed — do not repeat)

| Attempt | Problem |
|---------|---------|
| Horizontal ▲▼✕ actions column on template quotes | Stole width; Type/Family overlapped |
| Controls under Type badge (left) | Stretched row height; cramped columns |
| Absolute overlay on $/m² | Blocked clicks; gap + misaligned headers |
| Separate 2px / 14px trailing column + `pr-8` | Empty cells on all non-ink rows; **big gap** after $/m² |
| **Current (keep):** dedicated 12% controls column for ink row actions | Replaces inline $/m² stack that overlapped cost values |

### Key files

```
packages/web/src/pages/EstimateEditor.tsx
  structureLocked, canEditLayerStructure, renderInkControlsCell, insertInkLayerAfter
  Desktop structure table colgroup — NO ink column when locked

packages/web/src/components/TemplateBuilder.tsx
  Fullscreen layout; layers as table; MaterialSelect w-full

packages/web/src/components/StructureGradeSelect.tsx
  Portal dropdown for grade (unchanged)
```

### Template lock rules (source of truth)

| Field | Substrate / adhesive (template) | Ink & coating (template) |
|-------|--------------------------------|---------------------------|
| Family / grade | Dropdowns (within template classification) | Dropdowns |
| µ / gsm value | Editable input | Editable input |
| $/kg | Editable | Editable |
| Add / move / remove | Hidden | `+` `▲` `▼` `✕` in controls column |

Non-template quotes: full actions column + “+ Add Layer…” dropdown unchanged.

### Not done / verify tomorrow

- [ ] Hard refresh (`Ctrl+Shift+R`) — user reported not seeing column width changes (cache?)
- [ ] Mobile: dashed “+ Add ink & coating” still shown when locked — desktop uses inline `+` only
- [ ] Ink controls in $/m² may still feel cramped — consider dedicated **side rail** outside `<table>` synced to row heights if user wants zero impact on columns
- [ ] Type/Family column squeeze on long names — may need colgroup tweak
- [ ] Session memory from earlier in chat: Web Totals, FilmStackVisualizer, height sync — still active; see prior SESSION_LOG rows

---

## Architecture (unchanged)

- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`
- **Engine tests:** 79/79 (per prior session)
