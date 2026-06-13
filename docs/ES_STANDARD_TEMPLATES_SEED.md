# ES Standard Templates — Default Layer Stacks (Step 1)

**Status:** Draft for owner review  
**Date:** 2026-06-12 (v3)  
**Memory:** [ES_MEMORY.md](./ES_MEMORY.md) · **Decision #19**

**Layer types:** `substrate` | `ink` | `adhesive`  
**Microns:** always user-variable — seed values are hints only.

---

## Printing web class (all printed templates)

| UI selection | Ink | Solid % | Default |
|--------------|-----|---------|---------|
| **Wide Web printing** | Ink SB | 30 | **Yes** — including Labels & Shrink Sleeves |
| **Narrow Web printing** | Ink UV | 100 | User switches when needed |

Solvent-mix block: when SB ink and/or SB adhesive in stack.

---

## Summary table

| # | Parent PG | Ink default | Printing default |
|---|-----------|-------------|------------------|
| 1–7 | PE plain/printed/shrink/wide | SB if printed | Wide Web |
| 8 | Mono Layer Printed | SB | Wide Web |
| 9 | Shrink Sleeves | SB | Wide Web |
| 10 | Labels | SB | Wide Web |
| 11 | Laminates | SB + Adhesive SB | Wide Web |

---

## Laminates

**Duplex default:** PET + Ink SB + Adhesive SB + LDPE

**Add Alu barrier (before PE):** Adhesive SB + Aluminium + Adhesive SB

---

## Master library

| Type | Materials |
|------|-----------|
| substrate | LDPE, PET, BOPP, CPP, PVC shrink, **Aluminium** |
| ink | **Ink SB** (30%), **Ink UV** (100%) |
| adhesive | **Adhesive SB**, Solvent Base |

JSON v3: [ES_STANDARD_TEMPLATES_SEED.json](./ES_STANDARD_TEMPLATES_SEED.json)

---

## Owner review

- [x] Labels & Sleeves default SB (Wide Web) — locked
- [x] Narrow Web = UV selection — locked
- [x] Alu insert pattern — locked
- [ ] Micron hints OK for plant?

**Next:** Step 2 wireframes — [ES_WIREFRAMES.md](./ES_WIREFRAMES.md)
