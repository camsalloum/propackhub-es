# Product Requirements Document — v3 Final
## Flexible Packaging Estimation & Quotation Platform
**Web App + Native Mobile App**
**Date:** June 2026 | **Status:** Final Build Specification

---

## 1. Executive Summary

A two-surface B2B SaaS platform for flexible packaging manufacturers operating in GCC/MENA markets. The system solves a specific, high-value problem: a sales rep standing in front of a customer needs a credible, margin-protected selling price in under 3 minutes — without calling back to the office, without revealing internal costs, and without producing a spreadsheet that looks amateur.

**How it works:**
- Admin builds and maintains a library of standard laminate structure templates, complete with full cost data and fixed margins
- Sales rep opens the mobile app, selects a template or builds a custom structure, adjusts specs, and receives an instant selling price
- Rep submits for manager approval; manager reviews the full cost breakdown and approves or requests changes
- On approval, rep shares a branded, professional PDF quotation with the customer via email or WhatsApp
- All activity is tracked: conversion rates, margin analytics, rep performance, material price history

**Languages supported:** English and Arabic (full RTL layout)

---

## 2. Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (REST + WS)                  │
│              Node.js / Express + PostgreSQL + Redis         │
│   Auth · Templates · Pricing Engine · Queues · WebSocket   │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
   ┌──────────▼──────┐   ┌──────────▼──────────┐
   │   Web App        │   │   Mobile App         │
   │   React + Next.js│   │   React Native       │
   │                  │   │   iOS + Android      │
   │  Admin           │   │                      │
   │  Manager         │   │  Sales Rep (primary) │
   │  Full estimation │   │  Manager (approval)  │
   └──────────────────┘   └──────────────────────┘
```

**Tech Stack:**
| Layer | Technology | Reason |
|---|---|---|
| Backend API | Node.js + Express | Consistent with ProPackHub stack |
| Database | PostgreSQL 16 | JSONB support, full-text search, strong typing |
| Cache | Redis 7 | Pricing engine cache, job queue, session store |
| Job Queue | BullMQ (Redis-backed) | PDF generation, email delivery |
| WebSocket | Socket.io | Real-time approval notifications |
| Web Frontend | React 18 + Next.js 14 | SSR for fast initial load, App Router |
| Mobile | React Native 0.74 | Shared business logic with web |
| PDF Generation | Puppeteer | Server-side, handles SVG, Arabic text, charts |
| File Storage | S3-compatible (min.io or AWS S3) | PDF storage, logo, profile photos |
| Auth | JWT (access 15min + refresh 30d) | Stateless, works across web and mobile |

---

## 3. Design System

### 3.1 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `navy` | `#0F1F3D` | Primary surfaces, top navigation, headers |
| `gold` | `#C8962A` | Selling price, CTAs, key data highlights, accents |
| `slate` | `#F4F5F7` | Page background |
| `white` | `#FFFFFF` | Cards, panels, input backgrounds |
| `ink` | `#1A1D23` | Primary text |
| `mist` | `#8A8E97` | Secondary text, labels, placeholders |
| `success` | `#1A7F5A` | Approved status, positive values |
| `warning` | `#B8820A` | Pending, expiry alerts |
| `danger` | `#C0392B` | Rejected, errors, delete actions |
| `border` | `#E2E4E8` | Input borders, dividers |

### 3.2 Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display / Price figures | DM Sans | 600 | 32–42px |
| Section headings | DM Sans | 600 | 18–24px |
| Subheadings | DM Sans | 500 | 14–16px |
| Body copy | Inter | 400 | 14px |
| Labels / metadata | Inter | 400 | 12px |
| Numeric data (microns, density, costs) | JetBrains Mono | 400 | 13px |
| Arabic (all) | Cairo | 400/600 | same scale |

### 3.3 Layer Type Visual Identity (Laminate Visualizer)

| Layer Type | Color | Pattern |
|---|---|---|
| Substrate (BOPP, PET, CPP) | `#1D5FA3` (blue family) | Solid |
| Ink system | `#9B4CA0` (purple) | Semi-transparent (70%) |
| Adhesive / Primer | `#2E8B6E` (green) | Semi-transparent (60%) |
| Aluminium Foil | `#8A8A8A` (metallic grey) | Solid with shimmer gradient |
| Extrusion (PE, PP) | `#B85C2C` (warm orange) | Solid |
| Coating | `#4A7CA8` (light blue) | Thin band, semi-transparent |

Layer thickness in the visualizer is proportional to the micron value.

### 3.4 Motion Principles

| Interaction | Duration | Easing |
|---|---|---|
| Selling price count-up animation | 600ms | ease-out |
| Layer added to stack | 200ms | ease-out (slide down) |
| Layer removed from stack | 150ms | ease-in (fade + collapse) |
| Status pill change | 150ms | cross-fade |
| Bottom sheet open (mobile) | 280ms | spring (iOS feel) |
| Toast notification appear | 200ms | slide-in from top-right |
| PDF progress bar | Real-time | linear |
| Page transitions | 150ms | fade |

No decorative animations. Every motion communicates a state change.

### 3.5 Signature UI Element: Laminate Stack Visualizer

The single most distinctive element of this platform. Renders the laminate structure as a proportional cross-section diagram with each layer as a colored, labeled band. Appears in:

1. **Template cards** — compact thumbnail in the template grid
2. **Estimation form** (web) — sticky right panel, live updating
3. **Mobile layer builder** — top of the screen, updates as layers are added
4. **Estimation / quote detail** — full-width cross-section with GSM and cost labels
5. **Customer quotation PDF** — rendered as SVG, embedded in the PDF

---

## 4. User Roles & Permissions

### 4.1 Roles

| Role | Primary Platform | Description |
|---|---|---|
| **Admin** | Web | Full system access — templates, materials, margins, users, settings |
| **Manager** | Web + Mobile | Reviews and approves/rejects/comments on quotations |
| **Sales Rep** | Mobile (primary) | Creates estimates, submits for approval, shares with customers |

### 4.2 Permissions Matrix

| Capability | Admin | Manager | Sales Rep |
|---|---|---|---|
| Create / edit / delete templates | ✅ | ❌ | ❌ |
| Manage material library | ✅ | ❌ | ❌ |
| Set / edit margins | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| View all estimations | ✅ | ✅ | Own only |
| Create estimation (web, full) | ✅ | ✅ | ❌ |
| Create estimation (mobile) | ✅ | ✅ | ✅ |
| See cost breakdown | ✅ | ✅ | ❌ |
| See selling price | ✅ | ✅ | ✅ |
| See margin % | ✅ | ✅ | ❌ |
| Approve / reject quotations | ✅ | ✅ | ❌ |
| Request changes on quotation | ✅ | ✅ | ❌ |
| Add comments on estimation | ✅ | ✅ | ✅ (own) |
| Share quotation with customer | ✅ | ✅ | After approval only |
| Mark quote Won / Lost | ✅ | ✅ | ✅ (own) |
| View analytics dashboard | ✅ | ✅ | Own stats only |
| Export reports | ✅ | ✅ | ❌ |
| View audit log | ✅ | ❌ | ❌ |
| Bulk approve quotes | ✅ | ✅ | ❌ |
| Logo / branding settings | ✅ | ❌ | ❌ |
| Manage customers | ✅ | ✅ | Create + own |

---

## 5. User Management

Admin creates all users — no self-registration.

### 5.1 User Record Fields

Name, email, password (auto-generated, forced reset on first login), phone, role, job title, team/region (text, for grouping reps), language preference (English / Arabic), profile photo, active status.

### 5.2 Onboarding Flow

1. Admin creates user in the web app
2. System generates a secure temporary password
3. Welcome email sent: "Your account is ready. Log in at [URL] with your temporary password."
4. On first login: forced password change screen before access to any feature
5. Optional: admin-triggered onboarding tour on first web login

### 5.3 Session Management

- JWT access token: 15-minute TTL
- Refresh token: 30-day TTL, stored in HTTP-only cookie (web) / secure storage (mobile)
- On mobile: persistent login across app restarts using refresh token
- On web: "Remember me" checkbox controls whether refresh token survives browser close
- Force logout: admin can invalidate all sessions for a user (blacklist in Redis)

---

## 6. Customer / CRM Module

### 6.1 Customer Record

| Field | Type | Notes |
|---|---|---|
| Company name | String | Required |
| Contact name | String | Primary contact at the company |
| Phone | String | |
| Email | String | Used for quotation delivery |
| Country | Select | |
| City | String | |
| Customer type | Enum | Prospect / Active / Key Account / Inactive |
| Assigned rep | FK → users | Default rep for new quotes |
| Margin override % | Decimal | Nullable — overrides template margin for this customer |
| Internal notes | Text | Not visible on quotation |
| Active | Boolean | |

### 6.2 Customer Detail Page (Web)

- All quotations sent to this customer (status, value, date, rep)
- Total quoted value current year (AED)
- Win rate: Won quotes ÷ Shared quotes
- Last activity date
- Quick action: "New quote for this customer" — opens estimation form with customer pre-filled
- Comment/note timeline at the bottom

### 6.3 Mobile Autocomplete

On the New Quote flow Step 1, the customer name field triggers an autocomplete after 2 characters typed, showing:
- Company name (large)
- Contact name (small, below)
- Badge: "4 quotes previously — last: Jun 2026"

Selecting a customer fills the company, contact, and email fields automatically. If the customer is new, rep taps "Add new customer" and fills a short form (company, contact name, phone, email).

---

## 7. Structure Template System

### 7.1 Template Record

| Field | Notes |
|---|---|
| Name | e.g. "Duplex BOPP Transparent" |
| Code | Unique reference e.g. "DX-BOPP-T" |
| Product category | Roll / Pouch / Sheet / Sleeve |
| Description | Internal — shown to admin only |
| Tags | Array — e.g. "food-safe", "high-barrier", "standard" |
| Active | Boolean — inactive templates hidden from mobile |
| Version | Integer — increments on each edit |
| Created by | FK → users |

### 7.2 Template Layer Record

| Field | Notes |
|---|---|
| Template FK | |
| Layer order | Integer — determines stack position (1 = outermost) |
| Layer type | Substrate / Ink / Adhesive / Foil / Extrusion / Coating |
| Material FK | Links to material library |
| Default micron | Pre-set value shown to rep |
| Micron min | Lower bound rep can adjust to |
| Micron max | Upper bound rep can adjust to |
| Density override | Overrides material library value for this template |
| Solid override | Overrides material library value |
| Waste override | Overrides material library value |
| Cost/kg override | Overrides material library value |
| Locked | Boolean — if true, rep cannot remove or modify this layer |

### 7.3 Template Process Record

One record per process per template.

| Field | Notes |
|---|---|
| Template FK | |
| Process name | Extrusion / Printing Gravure / Printing Flexo / Rewinding / Lamination 1–3 / Slitting / Sleeving / Doctoring / Pouch Making |
| Enabled | Boolean |
| Default speed | m/min or pcs/hr |
| Default setup hrs | |

### 7.4 Margin Configuration (Per Template)

| Field | Notes |
|---|---|
| Margin type | Percentage or fixed AED per KG |
| Default margin value | Applied when no customer-specific override exists |
| Min selling price floor | Hard floor — engine cannot return a price below this |

**Margin resolution order (highest priority first):**
1. Customer-specific margin override (set on the customer record)
2. Template default margin
3. Global default margin (from Settings)

### 7.5 Template Versioning

Every edit to a template increments its version number. Estimations store the `template_version` they were created with. If admin edits a template, existing estimations are unaffected — they carry their own copy of the layer and process data at creation time (via `estimation_layers` and `estimation_processes` tables). Admin can view which version each estimation used.

### 7.6 Template Management UI (Web)

**Grid view** with card per template. Each card shows:
- Laminate stack visualizer thumbnail
- Template name and code
- Product category badge
- Default margin %
- Usage count this month
- "Last updated" date with days-ago indicator

**Filters:** Category, tags, active/inactive, sort by: name / usage / last updated

**Actions per card:** Edit, Clone, Archive, Preview (opens a modal with full cost breakdown at current material prices)

### 7.7 Template Creation — Split-Pane UI

Left pane: step-by-step form (Header → Layers → Processes → Margin → Preview)
Right pane: live laminate visualizer + cost summary updating as admin builds the stack

**Layer builder controls:**
- Drag-to-reorder layers
- Click "+" to add a layer via material picker (Category → Subcategory → Material)
- Each layer card shows: color-coded type indicator, material name, default micron, min/max range inputs, lock toggle, delete button
- Locked layers are highlighted with a lock icon and a tooltip: "Sales rep cannot remove this layer"

---

## 8. Material Library

### 8.1 Hierarchy

```
Category  →  Subcategory  →  Material (specific grade/supplier)
```

Examples:
- Substrate → BOPP → "BOPP 20µ Clear — Taghleef iNRT140"
- Ink System → Solvent-Based → "Siegwerk PU White Base"
- Adhesive → Solvent-Based → "Henkel Liofol LA 7765"

### 8.2 Material Record Fields

| Field | Type | Notes |
|---|---|---|
| Name | String | Specific grade and supplier |
| Subcategory | FK | |
| Supplier | String | Optional |
| Solid % | Decimal | |
| Density g/cm³ | Decimal | |
| Cost per KG | Decimal | Current price |
| Waste % | Decimal | Default process waste |
| Micron min/max | Decimal | Informational range |
| TDS reference | String/URL | Internal reference |
| Notes | Text | |
| Price updated at | Timestamp | Drives stale-price alerts |
| Active | Boolean | |

### 8.3 Material Price History

Every price update creates a new `material_price_history` record:

```
material_price_history:
  material_id, price_per_kg, effective_from, effective_to,
  changed_by, change_note
```

**Admin UI on material detail page:**
- Price history sparkline chart (last 12 months)
- Table: date, price, changed by, note
- "Update price" button → form: new price + mandatory note (e.g. "July 2026 supplier price list")

### 8.4 Stale Price Alerts

Materials with `price_updated_at` older than 90 days are flagged:
- Orange warning badge on material card/row in the admin UI
- Weekly email digest to admin: list of all materials with stale prices
- Dashboard widget: "X materials not updated in 90+ days"

### 8.5 Bulk Price Update

Admin can select multiple materials and enter a new price or a percentage adjustment (e.g. "+5% across all BOPP variants"). Creates individual price history records for each updated material.

---

## 9. Pricing Engine

### 9.1 Server-Side Only

The pricing engine runs exclusively on the server. Margin values are never sent to the client. The mobile client sends inputs; the server returns only the selling price tiers.

### 9.2 Calculation Flow

```
INPUT:
  - Layer stack: [{material_id, micron, density, solid%, waste%, cost_per_kg}]
  - Dimensions: {width_mm, cutoff_mm, trim_mm, n_ups}
  - Processes: [{name, enabled, speed, setup_hrs, machine_cost_hr}]
  - Order quantity + unit
  - Zipper spec (optional)
  - margin_percent (resolved server-side from customer/template/global)

CALCULATIONS:
  1. Per layer:
     gsm[i]        = micron[i] × density[i]
     cost_m2[i]    = (gsm[i] / 1000) × cost_per_kg[i] × (1 + waste%[i])
     est_kg[i]     = (width × cutoff × order_qty × gsm[i]) / 1,000,000

  2. Totals:
     total_gsm     = Σ gsm[i]
     total_cost_m2 = Σ cost_m2[i]
     mat_cost_kg   = total_cost_m2 × 1000 / total_gsm

  3. Printing film width:
     print_width   = width + (2 × trim)

  4. Process cost per KG:
     run_hrs[j]    = (order_in_meters / speed[j]) + setup_hrs[j]
     proc_cost[j]  = run_hrs[j] × machine_cost_hr[j]
     total_proc_kg = Σ proc_cost[j] / order_in_kg

  5. Zipper (if applicable):
     zipper_cost_kg = (zipper_weight_per_m × zipper_cost_per_kg) / (cutoff / 1000)

  6. Total cost:
     total_cost_kg = mat_cost_kg + total_proc_kg + zipper_cost_kg

  7. Selling price (margin applied server-side):
     selling_price_kg    = MAX(total_cost_kg × (1 + margin%), min_floor)
     selling_price_1kpcs = selling_price_kg × (order_kg / order_kpcs)
     selling_price_sqm   = selling_price_kg / (1000 / total_gsm)
     selling_price_lm    = selling_price_sqm × (width / 1000)
     selling_price_roll  = selling_price_kg × kg_per_roll

OUTPUT TO ADMIN/MANAGER:
  {
    total_gsm, mat_cost_kg, proc_cost_kg, total_cost_kg,
    margin_percent, margin_aed_per_kg,
    selling_price_kg, selling_price_1kpcs, selling_price_sqm,
    selling_price_lm, selling_price_roll,
    order_total_cost, order_total_selling, estimated_margin_aed,
    layer_cost_breakdown: [{name, cost_m2, cost_percent}],
    process_cost_breakdown: [{name, cost_kg, hours}]
  }

OUTPUT TO SALES REP (margin stripped):
  {
    selling_price_kg, selling_price_1kpcs, selling_price_sqm,
    selling_price_lm, selling_price_roll, order_total_selling
  }
```

### 9.3 Performance

**Debounce (client-side):** API call fires 250ms after the user stops changing inputs. Prevents hammering the server on every keypress.

**Redis cache:**
```
key:   "pricing:" + SHA256(JSON.stringify(inputs_without_margin))
TTL:   60 seconds
store: Redis
```
Margin is applied after cache retrieval — the cached value is the cost-only result. If the same layer stack + dimensions is requested again within 60 seconds, return the cached cost without recomputing.

**Rate limit:** 60 calculate requests per user per minute.

---

## 10. Estimation (Core Record)

### 10.1 Estimation Status Lifecycle

```
DRAFT
  │
  └──► PENDING APPROVAL  (rep submits)
          │
          ├──► CHANGES REQUESTED  (manager requests changes)
          │         │
          │         └──► PENDING APPROVAL  (rep resubmits)
          │
          ├──► REJECTED  (hard rejection — no resubmit of this version)
          │
          └──► APPROVED
                  │
                  └──► SHARED  (rep sends PDF to customer)
                          │
                          ├──► WON   (rep marks as won)
                          └──► LOST  (rep marks as lost + reason)
```

### 10.2 Opportunity & Revision Model

Multiple estimation versions (revisions) are grouped under an **Opportunity**:

```
Opportunity: "Al Rawabi — Triplex 5T KG"
  ├── Estimation Rev.1  →  Rejected (margin too low)
  ├── Estimation Rev.2  →  Approved → Shared → Lost (price)
  └── Estimation Rev.3  →  Approved → Shared → Won ✓
```

Creating a revision: rep taps "Revise" on any estimation. System creates a new estimation linked to the opportunity, pre-filled with all previous data. Manager sees "Rev. 2 — compare with Rev. 1" in the approval queue.

### 10.3 Estimation Form — Web App Layout

**Split-pane layout (1024px+):**

```
┌──────────────────────────────┬────────────────────────┐
│  LEFT PANEL (scrollable)     │  RIGHT PANEL (sticky)  │
│                              │                        │
│  Section nav (sticky top):   │  Laminate visualizer   │
│  A · B · C · D · E · F · G  │  (live, proportional)  │
│  ─────────────────────────   │  ─────────────────     │
│  A. Job Header               │  Total GSM: —          │
│  B. Layer Stack              │  Total µ: —            │
│  C. Dimensions               │  Cost/KG: AED —        │
│  D. Zipper                   │  ─────────────────     │
│  E. Process Costs            │  Selling price:        │
│  F. Actual Costs             │  AED — / KG  (gold)   │
│  G. Pricing Summary          │  ─────────────────     │
│                              │  Layer cost chart      │
│                              │  (horizontal bar)      │
│                              │                        │
│  [Save Draft]  [Submit]      │  [PDF] [Duplicate]     │
└──────────────────────────────┴────────────────────────┘
```

Below 1024px: right panel collapses to a floating summary bar at the bottom of the screen.

**Auto-save:** Form auto-saves draft every 30 seconds. Toast shows "Saved just now." No data lost on accidental browser close.

**Section A — Job Header**

| Field | Type |
|---|---|
| Customer | Autocomplete → Customer record |
| Job / Product name | Text |
| Product type | Select: Roll / Pouch / Sheet / Sleeve |
| Order quantity | Numeric |
| Unit | Select: KG / 1000 pcs / Metres / Rolls |
| Project number | Text (auto-suggested: "QT-2026-XXXXX") |
| Date | Date picker |
| Opportunity | FK — auto-set if created as a revision |

**Section B — Layer Stack**

Drag-to-reorder rows. Each row:
- Material picker (grouped dropdown: Category → Subcategory → Material)
- On material select: solid%, density, waste%, cost/KG auto-filled from library via AJAX
- Fields: type, solid%, micron, density, GSM (calc), cost/KG, waste%, cost/m² (calc), est. KG (calc)
- Delete row button
- "Add layer" button at bottom

**Section C — Dimensions**

Tabs: Roll | Pouch (shows relevant fields per product type)

Roll fields: real width, cut-off, extra trim, pieces per cut, number of ups, core ID, roll OD
Pouch fields: lay-flat, real width, cut-off, extra trim, number of ups, open height, open width

**Section D — Zipper** (collapsible, off by default)

Weight/m, cost/m, cost/g (calc), weight/pouch (calc), cost/pouch (calc), cost/KG (calc), qty required

**Section E — Process Costs**

10 toggleable process rows. Each enabled row: speed, setup hrs, run hrs (calc), machine cost/hr (from settings), total process cost (calc).

Process checkboxes: Extrusion, Printing (Gravure), Printing (Flexo), Rewinding, Lamination 1/2/3, Slitting, Sleeving, Doctoring, Pouch Making.

**Section F — Actual Costs** (comparison section)

Two dynamic tables:
1. Actual raw material costs: material name, consumption, cost/KG, total (repeating rows)
2. Actual process costs: process name, actual hrs, cost/hr, total (repeating rows)

Subtotals, differences vs. estimated, solvent mix sub-section.

**Section G — Pricing Summary**

Six-tier output table (auto-calculated): Cost/KG, per 1000 pcs, per SQM, per LM, per Roll — across 6 pricing tiers.

Additional: markup %, last sales price, estimated margin, actual margin, difference values with percentages. Remarks field.

---

## 11. Mobile App — Sales Rep

### 11.1 Navigation

```
Bottom Tab Bar:
  🏠 Home  |  ➕ New Quote  |  📋 My Quotes  |  ☰ More
```

"New Quote" is the center tab — styled as a primary action (larger icon, gold background on Android; prominent center on iOS).

### 11.2 Home Screen

- "Good morning, [First name]" header
- **Needs action:** gold-highlighted cards for quotes needing the rep's attention:
  - "Changes requested" — manager asked for edits
  - "Approved — ready to share" — tap to share now
- **Quick start:** last 3 used templates as tappable cards with laminate thumbnail
- **Recent quotes:** last 5, with status pill and customer name
- No revenue dashboards — those are for manager/admin

### 11.3 New Quote Flow — 4 Steps

**Step 1: Customer & Job**
- Customer field: autocomplete (2-char trigger), shows company + last quote date
- "New customer" option if not found → short form (company, contact, phone, email)
- Job/product name (text)
- Reference number (auto-generated, editable)
- Date (auto-filled)

**Step 2: Structure**

_Option A — Template (primary)_
- Grid of active template cards, each with:
  - Laminate stack thumbnail (the visualizer)
  - Template name and code
  - Category badge
  - Tags (food-safe, high-barrier, etc.)
- Search bar + filter by category and tags
- "Recently used" section pinned at top
- Tap template → pre-fills layer stack → advances to Step 3

_Option B — Build from scratch_
- "Custom structure" option at bottom of template list
- Starts with empty stack
- Same Step 3 UI but all layers user-added

**Step 3: Specs & Layers**

Top of screen: **Laminate Stack Visualizer** — live, proportional cross-section, updates as rep changes anything.

**Layer cards** (stacked vertically):
```
┌──────────────────────────────────────────┐
│ ▓ PET 12µ                    [↕]  [🗑]  │
│   Substrate                              │
│   ●────────────────── 12µ ──────────── ▶│  ← slider (min–max)
└──────────────────────────────────────────┘
```
- Left colored edge = layer type
- Micron adjustable via slider within admin-defined min/max
- Locked layers show lock icon, slider and delete are disabled
- Drag handle on right to reorder
- "＋ Add Layer" button below all layers → opens bottom sheet:
  - Search bar
  - Category pills (Substrate / Ink / Adhesive / Foil / Extrusion)
  - Material list filtered by selected category
  - Tap material → adds layer card, closes sheet

**Dimensions section** (below layers):
- Product type toggle: Roll / Pouch
- Width, cut-off, trim, ups fields — large numeric inputs, single tap to activate
- Pouch: open height, open width additionally

**Order quantity:** Large numeric input with unit selector (KG / 1000 pcs / m / Rolls)

**Zipper toggle** (off by default): reveals zipper fields if enabled

**Step 4: Selling Price**

Full-screen "reveal" layout:
```
┌────────────────────────────────────────┐
│  Triplex — PET/AL/LLDPE                │
│  Al Rawabi Dairy                       │
│  ─────────────────────────────────    │
│                                        │
│        AED 18.40 / kg               │  ← 42px DM Sans 600, gold
│                                        │
│  Order: 5,000 KG   Total: AED 92,000   │
│  ─────────────────────────────────    │
│  Per 1000 pcs       AED 184.00         │
│  Per SQM            AED 1.79           │
│  Per LM             AED 0.574          │
│  Per Roll           AED 9,200          │
│                                        │
│  ─────────────────────────────────    │
│  Note to manager (optional)...         │
│                                        │
│  [     Submit for Approval      ]      │  ← navy, full width
│  [          Save Draft          ]      │  ← text only
└────────────────────────────────────────┘
```

- Price number animates count-up from 0 over 600ms (ease-out)
- Medium haptic when animation completes
- Rep sees **only** selling price tiers — zero cost data visible
- Note field: free text to manager (e.g. "Customer asked for 3-month validity")

### 11.4 Quote Status Timeline

Every quote detail screen replaces the status pill with a full timeline:

```
● Created              Jun 9 · 14:32
● Submitted            Jun 9 · 14:35 — "Customer needs delivery Dubai"
● Under Review         Jun 9 · 14:35 — Sent to Ahmed Al Mansouri
◌ Approved / Rejected
◌ Shared with customer
◌ Won / Lost
```

Completed: filled circle + timestamp. Current: pulsing circle. Future: empty circle.

### 11.5 My Quotes List

- Status filter tabs: All / Pending / Approved / Shared / Won
- Each row: status badge (colour-coded), customer name, structure, total value, date
- Swipe left on a row: archive (saves as Draft) / duplicate options
- Tap row: opens quote detail with timeline

### 11.6 Sharing an Approved Quote

After approval, a gold "Share" button appears prominently on the quote detail:

1. **Share PDF** → generates PDF (progress bar while generating) → opens native share sheet (WhatsApp, Gmail, Files, AirDrop, etc.)
2. **Send email** → in-app composer, pre-filled: To (customer email from record), Subject ("Quotation [number] — [job name]"), PDF attached, editable message body
3. **WhatsApp** → deep link opens WhatsApp with PDF attached (WhatsApp Share API)

### 11.7 Won / Lost Marking

From the Shared screen, rep sees two secondary buttons: "Mark as Won" and "Mark as Lost".

Won: optional PO number entry → saved, confetti animation, status → Won.
Lost: reason select (Price / Competitor / Cancelled / No Response / Other) → saved, status → Lost.

Both trigger notifications to manager and admin.

### 11.8 Empty States

- My Quotes (empty): Document illustration + "No quotes yet" + "Start New Quote" button
- Templates (empty): "No templates set up yet — contact your admin"
- Home - no pending action: Checkmark illustration + "You're all caught up"
- Search with no results: Magnifier + "No matches — try different keywords"

---

## 12. Approval Workflow

### 12.1 Manager Approval Queue (Web)

**Dashboard widget:** "X quotes awaiting approval" with direct link to queue.

**Approval queue page:** Server-paginated table sorted oldest-first (default).

| Column | Notes |
|---|---|
| Rep (avatar + name) | |
| Customer | |
| Structure | Template name or "Custom" |
| Selling price | AED value |
| Margin % | Visible to manager |
| Submitted | Timestamp + "X hours ago" |
| Revision | "Rev. 2" badge if applicable |
| Actions | Approve / Request Changes / Reject / View |

**Bulk action:** Select multiple rows → "Approve selected" for standard low-value quotes.

**Quote detail (approval view):**
- Full estimation breakdown visible (layers, costs, margins, all data)
- Laminate visualizer
- Rep's submission note
- Comment thread
- "Compare with Rev. 1" button if this is a revision (side-by-side diff)
- Action buttons: Approve | Request Changes | Reject

### 12.2 Approval Actions

**Approve:** Status → Approved. Rep notified instantly via push + WebSocket toast.

**Request Changes:** Status → Changes Requested. Manager enters a note (required). Rep notified. Rep can edit the estimation and resubmit.

**Reject:** Status → Rejected. Manager enters a reason (required). Rep notified. Rep can create a revision if needed.

### 12.3 Comment Thread

Available on every estimation, visible to all parties with access:
- Any party can add a comment
- Comments are real-time (WebSocket: new comment appears without page refresh)
- Manager comments do not change approval status
- Each comment: avatar, name, text, timestamp
- Rep receives push notification when manager adds a comment on their quote

### 12.4 Approval on Mobile (Manager)

Manager mobile home screen has an "Approval Queue" section with a count badge. Tap to open the queue. Each quote shows: rep name, customer, structure, selling price, margin %, submitted time. Inline Approve / Request Changes / Reject buttons (no need to open full detail for straightforward decisions).

---

## 13. Customer Quotation PDF

Generated server-side via Puppeteer. Queued (not synchronous). Output stored in S3, TTL 90 days.

### 13.1 Layout

**Header (navy background, full width):**
- Company logo (left)
- "QUOTATION" in DM Sans 600 36px (right)
- Quotation number + date (right, below heading)
- Gold accent line at bottom of header

**Contact block (two columns):**
- Left: "To:" — customer company, contact name, email, phone, country
- Right: "From:" — company name, address, VAT/trade license, rep name + direct phone

**Subject line:** "Re: [Job Name] — [Structure Code/Name]"

**Structure specification table:**
| Field | Value |
|---|---|
| Structure | [Laminate cross-section SVG — the visualizer diagram] |
| Total thickness | Xµ |
| Total GSM | X g/m² |
| Width | Xmm |
| Repeat / Cut-off | Xmm |
| No. of ups | X |
| Product type | Roll / Pouch |

**Pricing table:**
| Item | Quantity | Unit | Unit Price | Total |
|---|---|---|---|---|
| [Job Name] | 5,000 | KG | AED 18.40 | AED 92,000 |

No cost. No margin. No breakdown. Only selling price.

**Terms block:**
- Payment terms
- Delivery terms
- "This quotation is valid until [date]"
- "Prices are subject to raw material price fluctuations beyond validity date"
- Revision note (e.g. "Revision 2") if applicable

**Signature block:**
- "Prepared by: [Rep Name], [Job Title]"
- Rep phone + email
- "Authorised by: [Manager Name]" (after approval)
- Customer acceptance line (for printed version)

**Footer:**
- Company full address · phone · email · website
- Trade License No. · VAT Registration No.
- Page X of Y

### 13.2 Arabic Version

- Same layout mirrored RTL
- Cairo font throughout
- All company and product content translatable
- Customer preference (English/Arabic) stored on customer record

---

## 14. Analytics & Reporting Module

### 14.1 Dashboard Widgets (Admin / Manager)

| Widget | Description |
|---|---|
| Approval queue | Count of pending quotes with "Review Now" link |
| Pipeline funnel | Draft → Pending → Approved → Shared → Won/Lost (count + AED value per stage) |
| Quotes this month | Count vs. last month delta |
| Total quoted value | AED this month vs. last month |
| Win rate | Won ÷ Shared (rolling 90 days) |
| Pending follow-ups | Approved quotes shared 14+ days ago with no Won/Lost marking |
| Stale material prices | Count of materials not updated in 90+ days |

### 14.2 Reports

All reports: date range picker, export to CSV, print view.

**Sales Pipeline Report**
- Quote funnel by stage with conversion rates between stages
- Average days in each stage (bottleneck identification)
- Filterable by: rep, customer, template category, date range

**Rep Performance Report**
- Per rep: quotes submitted, approval rate (% approved first submission), win rate, avg quote value, avg time from approved to shared
- Ranking table with sparklines

**Template Analytics**
- Usage count and total quoted value per template (month/quarter/year)
- Average actual margin achieved on won quotes per template
- Unused templates (candidates for archiving)

**Margin Analytics**
- Distribution histogram of selling margins across approved quotes
- Quotes at minimum floor (should be zero — flags enforcement gaps)
- Margin trend over time per product category

**Customer Analytics**
- Top 10 customers by quoted value and won value
- Customer pipeline: prospects → active → key accounts
- Customers with no activity in 60+ days (churn risk)
- New customers quoted this period

**Material Cost Trend**
- Price history chart per material (last 12 months)
- Impact simulation: "If BOPP price increases 10%, which templates are most affected and by how much?"

### 14.3 Sales Rep — Own Stats (Mobile)

- My quotes this month (count)
- Win rate this month
- Pending approvals
- Quotes expiring soon
No margin data, no cost data.

---

## 15. Notification System

### 15.1 Delivery Channels

| Channel | When | Notes |
|---|---|---|
| WebSocket toast (web) | App is open in browser | Instant, dismissible |
| Push notification (mobile) | App in background or closed | FCM (Android), APNs (iOS) |
| Email | All critical events | Always delivered even if app is closed |
| In-app notification center | All events | Persistent; read/unread state |

### 15.2 Notification Events

| Event | Who Notified | Channels |
|---|---|---|
| Quote submitted for approval | All managers + admin | Push + Email |
| Quote approved | Submitting rep | Push + WS + Email |
| Quote rejected | Submitting rep | Push + WS + Email (includes reason) |
| Changes requested | Submitting rep | Push + WS + Email (includes note) |
| Comment added | All parties on estimation | Push + WS |
| Quote expiring in 3 days | Submitting rep | Push + Email |
| Quote marked Won | Manager + Admin | Email |
| Quote marked Lost | Manager + Admin | Email |
| Material price not updated 90d | Admin | Weekly email digest |
| New user account created | New user | Email (welcome + temp password) |

### 15.3 In-App Notification Center

**Web:** Bell icon in top nav with unread badge count. Dropdown shows last 10; "View all" link to full page.

**Mobile:** Badge on More tab. Notification list screen within More.

Each notification item: icon (type), title, short description, timestamp, read/unread state. Tap → navigates to the relevant record. "Mark all read" bulk action.

---

## 16. Settings (Admin — Web)

| Section | Settings |
|---|---|
| Company profile | Name, address, logo, brand colour, VAT number, trade license number, website |
| Quotation defaults | Validity period (days), default payment terms, default delivery terms, quotation number format (prefix + year + sequence) |
| Language & region | Default language (English / Arabic), currency (AED), date format |
| Global margin | Default margin % applied when no template or customer override exists |
| Machine costs | Cost per hour per process type (used in pricing engine) |
| Email configuration | SMTP host, port, from address, from name |
| Push notifications | FCM server key, APNs config |
| Integration webhooks | URL to call on Won status; payload format; secret key |
| Audit log viewer | Filterable log of all system mutations |

---

## 17. Complete Data Model

### Core Tables

```sql
users (
  id, name, email, password_hash, role ENUM('admin','manager','sales_rep'),
  team, phone, job_title, language ENUM('en','ar') DEFAULT 'en',
  profile_photo_url, active BOOL DEFAULT true,
  last_login_at, created_at, updated_at, deleted_at
)

customers (
  id, company_name, contact_name, phone, email,
  country, city,
  customer_type ENUM('prospect','active','key_account','inactive'),
  assigned_rep_id FK users, margin_override_percent DECIMAL(5,2),
  notes TEXT, active BOOL, created_by FK users,
  created_at, updated_at, deleted_at
)

opportunities (
  id, customer_id FK, title, status ENUM('open','won','lost','cancelled'),
  created_by FK users, created_at, updated_at
)

categories ( id, name, created_at, updated_at )
subcategories ( id, category_id FK, name, created_at, updated_at )

materials (
  id, subcategory_id FK, name, supplier,
  solid_percent DECIMAL(5,2), density DECIMAL(6,4),
  cost_per_kg DECIMAL(10,4), waste_percent DECIMAL(5,2),
  micron_min DECIMAL(8,2), micron_max DECIMAL(8,2),
  tds_reference TEXT, notes TEXT,
  price_updated_at TIMESTAMP, active BOOL,
  created_at, updated_at, deleted_at
)

material_price_history (
  id, material_id FK, price_per_kg DECIMAL(10,4),
  effective_from TIMESTAMP, effective_to TIMESTAMP,
  changed_by FK users, change_note TEXT, created_at
)
```

### Template Tables

```sql
structure_templates (
  id, name, code VARCHAR(50) UNIQUE,
  product_category ENUM('roll','pouch','sheet','sleeve'),
  description TEXT, tags JSONB,
  margin_type ENUM('percent','per_kg'),
  margin_value DECIMAL(10,4),
  min_selling_price_floor DECIMAL(10,4),
  active BOOL, version INT DEFAULT 1,
  created_by FK users,
  created_at, updated_at, deleted_at
)

template_layers (
  id, template_id FK, layer_order INT,
  layer_type ENUM('substrate','ink','adhesive','foil','extrusion','coating'),
  material_id FK,
  default_micron DECIMAL(8,2),
  micron_min DECIMAL(8,2), micron_max DECIMAL(8,2),
  density_override DECIMAL(6,4), solid_override DECIMAL(5,2),
  waste_override DECIMAL(5,2), cost_per_kg_override DECIMAL(10,4),
  locked BOOL DEFAULT false,
  created_at, updated_at
)

template_processes (
  id, template_id FK,
  process_name VARCHAR(100), enabled BOOL,
  default_speed DECIMAL(10,2), default_setup_hrs DECIMAL(6,2),
  created_at, updated_at
)
```

### Estimation Tables

```sql
estimations (
  id, user_id FK, customer_id FK, opportunity_id FK,
  job_name, product_type ENUM('roll','pouch','sheet','sleeve'),
  order_quantity DECIMAL(12,2), unit ENUM('kg','kpcs','metres','rolls'),
  project_number, project_date DATE,
  status ENUM('draft','pending','changes_requested','rejected','approved','shared','won','lost'),
  source ENUM('web','mobile'),
  template_id FK (nullable), template_version INT,
  revision_number INT DEFAULT 1, parent_estimation_id FK (nullable),
  submission_note TEXT,
  approved_by FK users, approved_at,
  rejection_note TEXT,
  lost_reason ENUM('price','competitor','cancelled','no_response','other'),
  shared_at, won_lost_at, won_lost_by FK users,
  external_order_id VARCHAR(100),
  created_at, updated_at, deleted_at
)

estimation_layers (
  id, estimation_id FK, layer_order INT,
  layer_type ENUM('substrate','ink','adhesive','foil','extrusion','coating'),
  material_id FK, material_name,
  micron DECIMAL(8,2), density DECIMAL(6,4),
  solid_percent DECIMAL(5,2), waste_percent DECIMAL(5,2),
  cost_per_kg DECIMAL(10,4),         -- snapshot at creation time
  gsm DECIMAL(8,4),                  -- calculated, stored
  cost_per_sqm DECIMAL(10,6),        -- calculated, stored
  created_at, updated_at
)

estimation_dimensions (
  id, estimation_id FK UNIQUE,
  roll_real_width DECIMAL(10,2), roll_cutoff DECIMAL(10,2),
  roll_trim DECIMAL(10,2), pieces_per_cut INT, number_of_ups INT,
  lay_flat DECIMAL(10,2), open_height DECIMAL(10,2), open_width DECIMAL(10,2),
  core_inside_diameter DECIMAL(10,2), roll_outside_diameter DECIMAL(10,2),
  zipper_weight_per_m DECIMAL(10,4), zipper_cost_per_m DECIMAL(10,4),
  zipper_qty DECIMAL(10,2),
  markup_percent DECIMAL(5,2), last_sales_price DECIMAL(10,4),
  remarks TEXT,
  created_at, updated_at
)

estimation_processes (
  id, estimation_id FK, process_name VARCHAR(100),
  enabled BOOL, speed DECIMAL(10,2), setup_hrs DECIMAL(6,2),
  run_hrs DECIMAL(8,2), machine_cost_per_hr DECIMAL(10,4),
  total_process_cost DECIMAL(12,4),
  created_at, updated_at
)

estimation_costs (
  id, estimation_id FK UNIQUE,
  total_gsm DECIMAL(8,4), mat_cost_per_kg DECIMAL(10,4),
  proc_cost_per_kg DECIMAL(10,4), zipper_cost_per_kg DECIMAL(10,4),
  total_cost_per_kg DECIMAL(10,4),
  margin_percent DECIMAL(5,2), selling_price_per_kg DECIMAL(10,4),
  selling_price_per_1kpcs DECIMAL(10,4), selling_price_per_sqm DECIMAL(10,4),
  selling_price_per_lm DECIMAL(10,4), selling_price_per_roll DECIMAL(10,4),
  order_total_cost DECIMAL(14,2), order_total_selling DECIMAL(14,2),
  estimated_margin_aed DECIMAL(14,2), estimated_margin_percent DECIMAL(5,2),
  layer_cost_breakdown JSONB,    -- [{name, gsm, cost_m2, pct}]
  process_cost_breakdown JSONB,  -- [{name, hrs, cost_kg}]
  computed_at TIMESTAMP
)

actual_material_costs (
  id, estimation_id FK, material_name,
  consumption DECIMAL(12,4), cost_per_kg DECIMAL(10,4),
  total_amount DECIMAL(12,4), is_solvent BOOL DEFAULT false,
  created_at, updated_at
)

actual_process_costs (
  id, estimation_id FK, process_name,
  actual_hrs DECIMAL(8,2), cost_per_hr DECIMAL(10,4),
  total_amount DECIMAL(12,4),
  created_at, updated_at
)
```

### Supporting Tables

```sql
quotations (
  id, estimation_id FK, quotation_number VARCHAR(50) UNIQUE,
  valid_until DATE, payment_terms TEXT, delivery_terms TEXT,
  customer_contact_name, notes TEXT, language ENUM('en','ar'),
  pdf_url, pdf_generated_at,
  status ENUM('draft','sent'),
  sent_via ENUM('email','whatsapp','other'),
  sent_at, created_at, updated_at
)

estimation_comments (
  id, estimation_id FK, user_id FK,
  body TEXT,
  status_at_time,   -- snapshot of estimation status when posted
  created_at, updated_at, deleted_at
)

notifications (
  id, user_id FK, type VARCHAR(100),
  title, body TEXT,
  entity_type, entity_id BIGINT,
  read_at TIMESTAMP, created_at
)

audit_log (
  id, user_id FK, action VARCHAR(100),
  entity_type, entity_id BIGINT,
  old_values JSONB, new_values JSONB,
  ip_address, user_agent, created_at
)
```

### Key Indexes

```sql
CREATE INDEX idx_est_user_status    ON estimations(user_id, status);
CREATE INDEX idx_est_customer       ON estimations(customer_id);
CREATE INDEX idx_est_opportunity    ON estimations(opportunity_id);
CREATE INDEX idx_est_created        ON estimations(created_at DESC);
CREATE INDEX idx_est_fts            ON estimations USING gin(to_tsvector('english', job_name));
CREATE INDEX idx_layers_est         ON estimation_layers(estimation_id, layer_order);
CREATE INDEX idx_mat_subcat         ON materials(subcategory_id);
CREATE INDEX idx_mat_fts            ON materials USING gin(to_tsvector('english', name));
CREATE INDEX idx_tmpl_active        ON structure_templates(active) WHERE active = true;
CREATE INDEX idx_tmpl_category      ON structure_templates(product_category);
CREATE INDEX idx_notif_user_unread  ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_audit_entity       ON audit_log(entity_type, entity_id);
CREATE INDEX idx_customers_rep      ON customers(assigned_rep_id);
CREATE INDEX idx_price_hist_mat     ON material_price_history(material_id, effective_from DESC);
```

---

## 18. API Endpoint Summary

All routes prefixed `/api/v1/`. Authentication via Bearer JWT on all routes.

### Auth
```
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/reset-password/request
POST   /auth/reset-password/confirm
GET    /auth/me
PATCH  /auth/me
```

### Users
```
GET    /users                        admin only
POST   /users                        admin only
GET    /users/:id
PATCH  /users/:id                    admin only
DELETE /users/:id                    admin only (soft delete)
POST   /users/:id/force-logout       admin only
```

### Customers
```
GET    /customers
POST   /customers
GET    /customers/:id
PATCH  /customers/:id
DELETE /customers/:id                soft delete
GET    /customers/:id/estimations
GET    /customers/autocomplete?q=    mobile autocomplete
```

### Materials
```
GET    /materials                    ?subcategory=&search=
POST   /materials                    admin only
GET    /materials/:id
PATCH  /materials/:id                admin only
DELETE /materials/:id                admin only
GET    /materials/:id/price-history
POST   /materials/bulk-price-update  admin only
GET    /materials/lookup/:name       autocomplete for form
```

### Categories & Subcategories
```
GET    /categories
POST   /categories                   admin only
PATCH  /categories/:id               admin only
DELETE /categories/:id               admin only
GET    /subcategories?category_id=
POST   /subcategories                admin only
PATCH  /subcategories/:id            admin only
DELETE /subcategories/:id            admin only
```

### Templates
```
GET    /templates                    mobile: active only; admin: all
POST   /templates                    admin only
GET    /templates/:id
PATCH  /templates/:id                admin only
DELETE /templates/:id                admin only (soft delete)
POST   /templates/:id/clone          admin only
GET    /templates/:id/preview        returns full cost breakdown
```

### Pricing Engine
```
POST   /pricing/calculate            body: {layers, dimensions, processes, qty, customer_id?, template_id?}
                                     Returns: full breakdown (admin/manager) or selling price only (rep)
```

### Estimations
```
GET    /estimations                  scoped by role
POST   /estimations
GET    /estimations/:id              cost data stripped for sales_rep role
PATCH  /estimations/:id
DELETE /estimations/:id              soft delete
POST   /estimations/:id/submit       rep submits for approval
POST   /estimations/:id/approve      manager/admin
POST   /estimations/:id/reject       manager/admin — body: {reason}
POST   /estimations/:id/request-changes  manager/admin — body: {note}
POST   /estimations/:id/revise       creates new estimation as revision
POST   /estimations/:id/won          body: {po_number?}
POST   /estimations/:id/lost         body: {reason}
GET    /estimations/:id/comments
POST   /estimations/:id/comments
```

### Quotations
```
POST   /quotations                   body: {estimation_id, language, valid_until, payment_terms, ...}
GET    /quotations/:id/status        poll for PDF generation status
GET    /quotations/:id/pdf           download PDF (streams from S3)
POST   /quotations/:id/send-email    body: {to, subject, message}
GET    /quotations/:id/whatsapp-link generates WhatsApp deep link
```

### Analytics
```
GET    /analytics/pipeline
GET    /analytics/reps
GET    /analytics/templates
GET    /analytics/margins
GET    /analytics/customers
GET    /analytics/material-trends
```

### Notifications
```
GET    /notifications                ?unread_only=true
PATCH  /notifications/:id/read
POST   /notifications/read-all
```

### Settings
```
GET    /settings
PATCH  /settings                     admin only
POST   /settings/logo                multipart upload
GET    /settings/machine-costs
PATCH  /settings/machine-costs       admin only
```

---

## 19. Backend Infrastructure

### 19.1 WebSocket Events

```
Server → Client events:
  quote:submitted          {estimation_id, rep_name, customer, value}  → managers
  quote:approved           {estimation_id, approved_by}                → rep
  quote:rejected           {estimation_id, reason}                     → rep
  quote:changes_requested  {estimation_id, note}                       → rep
  quote:comment            {estimation_id, comment_id, from_name}      → all parties
  notification:new         {notification_id, type, title}              → user
  material:price_updated   {material_id, name, new_price}              → admins
```

### 19.2 Job Queues (BullMQ)

```
Queue: pdf-generation
  Job: GeneratePDF
  Input: { quotation_id, estimation_id, language }
  Process: Puppeteer renders → S3 upload → update quotation.pdf_url → emit socket event
  Retry: 3 attempts, exponential backoff

Queue: email-delivery
  Job: SendEmail
  Input: { to, subject, template, data, attachment_url? }
  Process: SMTP send via Nodemailer
  Retry: 5 attempts

Queue: push-notifications
  Job: SendPush
  Input: { user_ids[], title, body, data }
  Process: FCM (Android) + APNs (iOS) via Firebase Admin SDK
  Retry: 2 attempts
```

### 19.3 Rate Limits

```
POST /pricing/calculate       60 / min / user
POST /quotations              10 / min / user  (PDF generation)
POST /auth/login              10 / min / IP
POST /auth/reset-password/*   5  / min / IP
GET  /api/v1/*                300/ min / user
```

### 19.4 Audit Log

All mutations (POST, PATCH, DELETE) on: users, customers, estimations, structure_templates, materials, quotations, settings — are logged to `audit_log` with before/after JSONB values. Middleware-level implementation, not per-controller.

---

## 20. Development Phases

### Phase 1 — Foundation (Weeks 1–6)
Backend: Auth, users, customers, categories, subcategories, materials (with price history), pricing engine core.
Web: Design system setup, login, user management, material library CRUD.
Mobile: Auth, home screen shell, navigation skeleton.

### Phase 2 — Templates & Estimation Core (Weeks 7–12)
Backend: Template system, estimation CRUD, estimation_layers/dimensions/processes, estimation_costs.
Web: Template management with laminate visualizer, estimation form (split-pane).
Mobile: New Quote flow (all 4 steps), template selection, layer builder, price reveal screen.

### Phase 3 — Approval & Quotation (Weeks 13–17)
Backend: Approval workflow, comment threads, WebSocket setup, PDF generation queue, Puppeteer quotation PDF.
Web: Approval queue, comment thread UI, quotation PDF template.
Mobile: Submit flow, quote status timeline, PDF share sheet, Won/Lost marking.

### Phase 4 — Analytics & Notifications (Weeks 18–22)
Backend: Analytics queries, notification system, push notification integration, in-app notification center API.
Web: Analytics dashboard, reports module, notification center.
Mobile: Push notifications, notification center, My Stats view.

### Phase 5 — Arabic, Polish & Launch (Weeks 23–26)
Arabic language support (i18n setup, RTL layout, Arabic PDF generation), empty states, onboarding tour, performance audit, security review, production deployment.

---

## 21. What This Fixes From the Original App

| # | Original Problem | Solution in v3 |
|---|---|---|
| 1 | No server-side form validation | Typed request validation on all API endpoints |
| 2 | Hardcoded server paths in PDF | Environment-driven config, server-side Puppeteer |
| 3 | Hardcoded record ID in print_view | Removed; all routes take explicit IDs |
| 4 | Array fields stored as VARCHAR | All numeric fields properly typed (DECIMAL, INT) |
| 5 | No soft deletes | Soft deletes on all major entities |
| 6 | 120-column flat secondary_table | Normalised into 5 focused tables |
| 7 | Access control is UI-only | Role middleware enforced at API layer |
| 8 | No server-side pagination | Server-side pagination on all list endpoints |
| 9 | No audit trail | Full audit_log table on all mutations |
| 10 | No feedback admin panel | Comment threads + notification center replaces this |
| 11 | PDF generated synchronously | BullMQ queue, client polls for status |
| 12 | No real-time notifications | WebSocket + push notifications |
| 13 | No price history on materials | material_price_history table + admin UI |
| 14 | No Arabic / RTL | Full i18n from phase 5 |
| 15 | No conversion tracking | Won/Lost status + analytics module |
