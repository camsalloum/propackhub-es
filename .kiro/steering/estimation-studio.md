---
inclusion: always
---

# Estimation Studio (ES)

1. **Read first:** [docs/ES_MEMORY.md](docs/ES_MEMORY.md) for latest session decisions.
2. **Simplicity:** ES mirrors **legacy Laravel** math/UI — not PEBI MES `/estimator`.
3. **Engine source:** [archive/legacy-laravel/COSTING_NOTES.md](archive/legacy-laravel/COSTING_NOTES.md)

## Costing (do not drift)

- Layer types: `substrate` | `ink` | `adhesive` only
- **Wide Web printing → Ink SB (30% solid)** + solvent ratio block — **default for all printed PGs including Labels & Sleeves**
- **Narrow Web printing → Ink UV (100% solid)** — no solvent for ink; user selects on estimate
- Not color-specific inks (no Black/White SKUs)
- Laminate duplex: PET + Ink SB + Adhesive SB + LDPE
- Triplex Alu: insert Adhesive SB + Aluminium + Adhesive SB before PE
- Microns always user-variable
- Sale price: additive columns (RM + markup% + plates + delivery + operation) — engine only
- **Sales rep UI:** selling price only — no markup/RM/cost breakdown (Decision #20)
- Admin: Settings → Team & visibility per user

## Number inputs (app-wide rule)

Numeric inputs that carry a default value (commonly `0`) MUST select-all on focus
so the user types over the default instead of manually deleting it first. Attach
`onFocus={selectOnFocus}` from `lib/inputs.ts`. Applies to dimensions (reel width,
cutoff, pouch/bag fields), order quantity, markup/plates/delivery, slab qty/price,
layer micron/gsm/cost, and solvent fields.

## UI copy (app-wide rule)

**Instructional / clarification helper text MUST NOT be rendered as visible inline body copy.**
Attach it to the nearest heading/label via `components/SectionTitle.tsx`, which shows
the copy only on hover (native tooltip) behind a small info icon.

- Applies to every page and component (estimate editor, lists, dashboard, settings,
  master data, etc.) — not one screen.
- **Convert:** "how to use" sentences, section descriptions, clarifying subtitles
  (e.g. "pick a customer, then Save", "Within the next 7 days", "Structure yield per web unit").
- **Keep visible (exempt):** data + counts (e.g. "12 customers"), field/column labels,
  status/feedback text, input placeholders, error/validation messages, and the
  Login/marketing hero tagline.
- **Field-level helper** directly under a single input may stay, but prefer moving it
  to the label via `SectionTitle as="label"`.
- New sections: add the title with `<SectionTitle hint="…">` from day one; do not add a
  separate `<p>` of guidance under a heading.

## Docs

- Build spec: [docs/ES_PRD_v3_FINAL_BUILD_SPEC.md](docs/ES_PRD_v3_FINAL_BUILD_SPEC.md)
- Locks: [docs/LOCKED_DECISIONS.md](docs/LOCKED_DECISIONS.md)
- Templates seed: [docs/ES_STANDARD_TEMPLATES_SEED.json](docs/ES_STANDARD_TEMPLATES_SEED.json)

After material/costing decisions in chat, append a dated entry to **docs/ES_MEMORY.md** session log (automatic at session end per `AGENT.md` §2).
