# ProPackHub Estimation Studio — Wireframes (Step 2)

**Status:** Draft for owner review — blocks React implementation  
**Date:** 2026-06-12  
**PRD:** [ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md) §5  
**Memory:** [ES_MEMORY.md](./ES_MEMORY.md)  
**Principle:** **One scrollable estimate** (Laravel parity) — not PEBI 8-step wizard.

---

## Wireframe index

| # | Screen | Primary journey |
|---|--------|-----------------|
| WF-1 | Dashboard | Return user, quick quote |
| WF-2 | New estimate — template picker | Start quote |
| WF-3 | Estimate editor | Core quoting (signature screen) |
| WF-4 | Customer detail + re-quote | History & refresh prices |
| WF-5 | My library — materials | RM prices |
| WF-6 | Proposal preview / PDF | Send to customer |

**Global nav (all authenticated screens):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [ES logo]  Dashboard  Customers  Estimates  Library  Settings    [User ▾]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

Mobile: hamburger → same items. PWA install prompt on 2nd visit (Decision #8).

**Mobile = same webapp** (Decision #20) — responsive reflow, not a separate native app. Visibility rules identical on phone.

---

## WF-3b — Sales rep view (default visibility)

Same screen as WF-3 but **cost fields removed** (not collapsed):

```
│ Layer table: # · Type · Material · µ ONLY (no $/kg, no $/m²)     │
│ NO solvent-mix card · NO markup/plates/delivery section           │
│ Sidebar: Visualizer + GSM + **Selling price (gold)** + PDF        │
│ NO cost breakdown bar · NO "RM + markup" subline                  │
│ Mobile: sticky footer = Selling price + PDF only                  │
```

---

## WF-7 — Settings → Team & visibility (tenant_admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings › Team & visibility                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Default profile for new users                                               │
│ [x] Structure  [x] Selling price  [ ] Material $/kg  [ ] Markup %          │
│ [ ] Cost breakdown  [ ] Operations  [ ] Library prices                        │
│                                                                             │
│ Team members                                                                │
│ Sarah · user · Sales rep default                    [ Customize visibility ]│
│ Ahmed · user · Custom (markup ON)                   [ Customize visibility ]│
└─────────────────────────────────────────────────────────────────────────────┘
```

Per-user customize opens toggle grid; saved to `users.visibility_profile`. API strips disallowed fields on every calculate response.

---

## WF-1 — Dashboard

**Goal:** Pipeline snapshot + start quote in one tap.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  + New Estimate             │  │ Draft 12 │ │ Sent  8  │ │ Won   3  │   │
│  │  (primary CTA — gold)       │  └──────────┘ └──────────┘ └──────────┘   │
│  └─────────────────────────────┘                                            │
│                                                                             │
│  Recent estimates                              Recent customers             │
│  ┌──────────────────────────────────────┐    ┌─────────────────────────┐  │
│  │ QT-2026-00142  Acme Snacks  Laminates│    │ Acme Snacks      [→]    │  │
│  │ Draft · 2 slabs · AED 11.40/kg       │    │ Gulf Foods       [→]    │  │
│  │──────────────────────────────────────│    │ ...                     │  │
│  │ QT-2026-00138  Gulf PE bag  Sent     │    └─────────────────────────┘  │
│  └──────────────────────────────────────┘                                   │
│                                                                             │
│  Empty state (first login):                                                 │
│  "Your library is ready — 14 materials seeded. Create your first estimate." │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Actions:** New Estimate → WF-2. Row click → WF-3. Customer → WF-4.

---

## WF-2 — New estimate (template picker)

**Goal:** Template OR Blank Canvas + My Templates. Groups A / B / C (Decision #17).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ New Estimate                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Customer  [ Search or + New customer ▾ ]     Job name  [________________]  │
│                                                                             │
│  [ Standard templates ]  [ My Templates ]  [ Blank Canvas ]                 │
│                                                                             │
│  ── A · PE Mono ─────────────────────────────────────────────────────────  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ ▓▓▓▓       │ │ ▓▓ purple  │ │ ▓▓▓▓       │ │ ▓▓ purple  │  ...        │
│  │ Commercial │ │ Commercial │ │ Industrial │ │ Industrial │               │
│  │ Plain      │ │ Printed    │ │ Plain      │ │ Printed    │               │
│  │ pouch      │ │ pouch      │ │ roll       │ │ roll       │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
│  (mini stack thumbnail on each card — §5.6)                                 │
│                                                                             │
│  ── B · Non PE Mono ─────────────────────────────────────────────────────  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                               │
│  │ Mono Layer │ │ Shrink     │ │ Labels     │                               │
│  │ Printed    │ │ Sleeves    │ │            │                               │
│  └────────────┘ └────────────┘ └────────────┘                               │
│                                                                             │
│  ── C · Non PE Multilayer ───────────────────────────────────────────────  │
│  ┌────────────┐                                                             │
│  │ Laminates  │  4-layer duplex thumbnail                                   │
│  └────────────┘                                                             │
│                                                                             │
│                              [ Continue → ]  (disabled until customer+name) │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Blank Canvas:** empty stack, user picks product_type roll/pouch.  
**My Templates:** user-saved structures only (no prices).

---

## WF-3 — Estimate editor (signature screen)

**Goal:** Laravel-simple single form + Laminate Visualizer + live price. **4–5 sections**, one scroll (left) + sticky sidebar (right).

### Desktop layout (≥1024px)

```
┌──────────────────────────────────────────┬──────────────────────────────────┐
│ LEFT — scroll                            │ RIGHT — sticky                   │
├──────────────────────────────────────────┤                                  │
│ Job: QT-2026-00142 · Acme · Laminates    │  ┌─ Laminate Visualizer ──────┐  │
│ Status: Draft                            │  │ ████ PET 12µ               │  │
│                                          │  │ ██ Ink SB 2µ               │  │
│ ── 1. Structure ─────────────────────   │  │ █ Adhesive SB 3µ           │  │
│ Printing web  ( ) Wide Web  (•) Narrow*  │  │ █████████████████ LDPE 50µ │  │
│   * only when ink layer present          │  └────────────────────────────┘  │
│   Wide Web → Ink SB · Narrow → Ink UV    │  Total GSM  78.4   Total µ 67   │
│                                          │                                  │
│ ┌────┬──────────┬───┬────┬──────┬──────┐ │  ── Sale price ──                │
│ │ #  │ Type     │Mat│ µ  │$/kg  │$/m²  │ │  AED 12.48 / kg  (gold, large) │
│ ├────┼──────────┼───┼────┼──────┼──────┤ │  RM 9.80 + markup + plates ...   │
│ │ 1  │Substrate │PET│ 12 │ 8.70 │ ...  │ │                                  │
│ │ 2  │ Ink      │SB │  2 │12.00 │ ...  │ │  Breakdown (user)                │
│ │ 3  │ Adhesive │SB │  3 │ 6.50 │ ...  │ │  Material 78%  Waste 4%          │
│ │ 4  │Substrate │PE │ 50 │ 2.10 │ ...  │ │  Markup   15%                    │
│ └────┴──────────┴───┴────┴──────┴──────┘ │                                  │
│ [ + Add layer ]  [ Add metallized barrier ]│  [ Generate Proposal PDF ]       │
│   (Laminates only — inserts Alu block)     │  [ Save draft ]                  │
│                                          │                                  │
│ ── Solvent-mix (SB stack only) ────────  │  ── tenant_admin only ──         │
│ Solvent-mix $/kg  [____]                 │  Processes (collapsed)           │
│ Ink-to-solvent ratio [ 0.5 ]             │  Machine rates → Settings        │
│                                          │                                  │
│ ── 2. Dimensions (roll) ───────────────  │                                  │
│ Roll width mm [800]  Cut-off [600] ...   │                                  │
│                                          │                                  │
│ ── 3. Quantity slabs ─────────────────   │                                  │
│ ┌──────────┬────────────┬─────────────┐  │                                  │
│ │ Qty (kg) │ Price/kg   │ Order total │  │                                  │
│ ├──────────┼────────────┼─────────────┤  │                                  │
│ │ 1,000    │ 12.48      │ 12,480      │  │                                  │
│ │ 2,000    │ 11.90      │ 23,800      │  │                                  │
│ │ [+ row]  │            │             │  │                                  │
│ └──────────┴────────────┴─────────────┘  │                                  │
│ Load slab template [Standard 4-tier ▾]     │                                  │
│                                          │                                  │
│ ── 4. Markup & extras ─────────────────   │                                  │
│ Markup % [15]  Plates/kg [0]  Delivery [0]│                                  │
└──────────────────────────────────────────┴──────────────────────────────────┘
```

### Mobile (≤768px) — adaptive UI, not shrunk desktop

**Same webapp / PWA** — but layer editor uses **cards + bottom sheets**, not the desktop table.

```
┌──────────────────────────────┐
│ QT-2026-00142 · Draft        │
├──────────────────────────────┤
│ [ Laminate stack ▾ expand ]  │
│  colored bands · 78 GSM      │
├──────────────────────────────┤
│ Wide Web · SB    [segmented] │
├──────────────────────────────┤
│ ┌ PET Transparent    12µ  ⋮│
│ ┌ Ink SB              2µ  ⋮│
│ ┌ Adhesive SB         3µ  ⋮│
│ ┌ LDPE Natural       50µ  ⋮│
│ [ + Add layer ]              │
│ [ Add metallized barrier ]   │
├──────────────────────────────┤
│ Dimensions · Slabs · …       │
├──────────────────────────────┤
│ STICKY: AED 12.48/kg  [ PDF ]│
└──────────────────────────────┘

Tap ⋮ → Edit · Delete · Move up/down
Tap + Add layer → bottom sheet (type → material)
Swipe left on card → Delete (confirm)
```

**Sales rep:** no $/kg on cards, no markup section, sticky bar = selling price only.

**QA gate:** add/edit/remove/reorder 4 layers on 375px width without horizontal scroll on layer list.

### Key interactions

| Action | Behaviour |
|--------|-----------|
| Change **Printing web** | Swap ink row SB↔UV; toggle solvent block; recalc 250ms debounce |
| Edit **µ** | Visualizer band height updates; GSM recalc |
| **Add metallized barrier** | Insert Adhesive SB + Alu + Adhesive SB before PE (Decision #19) |
| **+ Add layer** | Pick type → material from library → default µ editable |
| Material **$/kg** | Read from tenant library; inline override optional (snapshot on save) |
| Admin **Processes** | Hidden for `user`; shown for `tenant_admin` between structure and dimensions |

### Re-quote banner (when `source_estimation_id` set)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ℹ Re-quoted from QT-2026-00142 (3 Jun 2026). Prices refreshed from library. │
│   PET Transparent: AED 8.20 → 8.70/kg                          [Dismiss]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## WF-4 — Customer detail + history

**Goal:** Estimate list + re-quote with current RM (Decision #15, Laravel duplicate improved).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Customers    Acme Snacks Ltd                                              │
│ contact@acme.com · +971 ...                    [ + New estimate for customer ]│
├─────────────────────────────────────────────────────────────────────────────┤
│ Estimates                                                                   │
│ ┌────────┬───────────────┬────────────┬────────┬──────────┬───────────────┐ │
│ │ Ref    │ Job           │ Structure  │ Status │ Date     │ Actions       │ │
│ ├────────┼───────────────┼────────────┼────────┼──────────┼───────────────┤ │
│ │00142   │ Chips duplex  │ PET/PE 4L  │ Draft  │ 12 Jun   │ Open          │ │
│ │        │               │            │        │          │ Re-quote ↻    │ │
│ │00138   │ Bag 400x550   │ PE+ink     │ Sent   │ 01 Jun   │ Open · PDF    │ │
│ └────────┴───────────────┴────────────┴────────┴──────────┴───────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Re-quote ↻:** `POST /estimations/:id/requote` → new draft WF-3 with banner.

---

## WF-5 — My library (materials)

**Goal:** Tenant RM prices — seeded from platform master (Decision #14, #6 current price only).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Library › Materials                              [ Search... ]  [ + Add ]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Filter: [ All ] [ Substrate ] [ Ink ] [ Adhesive ]                          │
│                                                                             │
│ ┌────────────────┬──────┬────────┬────────┬─────────┬──────────┐          │
│ │ Material       │ Type │ Solid% │ Density│ Waste % │ $/kg     │          │
│ ├────────────────┼──────┼────────┼────────┼─────────┼──────────┤          │
│ │ Ink SB         │ Ink  │ 30     │ 1.00   │ 5       │ [12.00]  │          │
│ │ Ink UV         │ Ink  │ 100    │ 1.00   │ 5       │ [14.50]  │          │
│ │ Adhesive SB    │ Adh  │ 100    │ 1.05   │ 3       │ [ 6.50]  │          │
│ │ PET Transparent│ Sub  │ 100    │ 1.38   │ 2       │ [ 8.70]  │          │
│ │ Aluminium      │ Sub  │ 100    │ 2.70   │ 2       │ [18.00]  │          │
│ └────────────────┴──────┴────────┴────────┴─────────┴──────────┘          │
│                                                                             │
│ Row click → slide-over edit (density, solid, waste, cost/kg).               │
│ No price history V1. Re-quote picks up edits automatically.                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## WF-6 — Proposal preview / PDF

**Goal:** Branded commercial output + slab table (Decision #12).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Proposal preview — QT-2026-00142                    [ Download PDF ] [ Send ]│
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Tenant logo]              QUOTATION                                │   │
│  │ Acme Snacks Ltd · Valid until 30 Jun 2026                           │   │
│  │─────────────────────────────────────────────────────────────────────│   │
│  │ Product: Laminates duplex · Roll 800mm                              │   │
│  │ [ SVG laminate stack ]                                              │   │
│  │ Spec: GSM 78 · Structure PET/Ink SB/Adh SB/LDPE                     │   │
│  │─────────────────────────────────────────────────────────────────────│   │
│  │ Quantity slab pricing                                               │   │
│  │ ┌────────────┬─────────────┬──────────────┐                         │   │
│  │ │ Quantity   │ Price/kg    │ Total        │                         │   │
│  │ ├────────────┼─────────────┼──────────────┤                         │   │
│  │ │ 1,000 kg   │ AED 12.48   │ AED 12,480   │                         │   │
│  │ │ 2,000 kg   │ AED 11.90   │ AED 23,800   │                         │   │
│  │ └────────────┴─────────────┴──────────────┘                         │   │
│  │ Terms & conditions (from tenant settings)                           │   │
│  │ Footer · company address                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Never shows: process/machine detail, internal margin breakdown (customer). │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Send V1:** Download PDF + manual email. Share link / portal = Phase 2.

---

## Settings (brief — not numbered WF)

| Section | user | tenant_admin |
|---------|------|--------------|
| Proposal branding (logo, footer, T&C) | ✓ | ✓ |
| Default markup %, slab templates | ✓ | ✓ |
| Machine costs / hr, process defaults | — | ✓ |
| Account & subscription | ✓ | ✓ |

---

## Responsive & PWA notes

| Breakpoint | Estimate editor |
|------------|-----------------|
| ≥1024px | Split pane — visualizer sticky right |
| 768–1023px | Visualizer top, form below, floating price chip |
| ≤767px | Single column; bottom sticky **Price/kg** + **PDF** |

Touch targets ≥44px. Layer table horizontal scroll on small screens.

---

## Explicitly omitted (V1)

- PEBI 8-step wizard, BOM2, routing AI
- Actual vs Estimated cost tables (Laravel Phase 2)
- Approval workflow
- Community template marketplace
- Full 10-process matrix UI (admin: simplified process toggles only)

---

## Owner review checklist

- [ ] WF-3 single-scroll layout feels Laravel-simple enough?
- [ ] Printing web toggle placement OK (top of structure section)?
- [ ] **Add metallized barrier** button placement OK?
- [ ] Slab table position (below dimensions) OK?
- [ ] Mobile bottom bar sufficient for reps?

**When approved → Step 3:** Scaffold `propackhub-es/` monorepo.

**Visual mockup:** Open [`mockup/es-estimate-editor.html`](./mockup/es-estimate-editor.html) in a browser — interactive navy/gold design (not ASCII wireframes).

---

*Linked from [ES_MEMORY.md](./ES_MEMORY.md) build sequence Step 2.*
