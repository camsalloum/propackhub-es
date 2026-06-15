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

## Docs

- Build spec: [docs/ES_PRD_v3_FINAL_BUILD_SPEC.md](docs/ES_PRD_v3_FINAL_BUILD_SPEC.md)
- Locks: [docs/LOCKED_DECISIONS.md](docs/LOCKED_DECISIONS.md)
- Templates seed: [docs/ES_STANDARD_TEMPLATES_SEED.json](docs/ES_STANDARD_TEMPLATES_SEED.json)

After material/costing decisions in chat, append a dated entry to **docs/ES_MEMORY.md** session log (automatic at session end per `AGENT.md` §2).
