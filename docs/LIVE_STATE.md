# LIVE STATE — Estimation Studio

> ✅ **2026-06-21 update:** Deep re-audit + fixes ([ES_DEEP_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-21.md](./ES_DEEP_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-21.md)). Build blockers are now **fixed**: web `tsc` **0 errors**, server `tsc` **0 errors**, engine **34/34**, server **36/36** (verified, live Postgres). A CI typecheck gate now fails the build on type errors. Remaining work (verified bug backlog BUG-1…13, migrations, mobile, PEBI seam, visual/domain Phase 7) is tracked in the deep-audit doc — treat it as the roadmap of record. Note: the prior "TypeScript clean" claim only became true with this session's fixes.



**Last updated:** 2026-06-21  

**Session:** Template/estimate UX polish — Excel job header, Cancel nav, blank canvas removed (ready for user smoke test)



## Status: ✅ MES plan complete (Phases A–F + §14 UI + V1 nice-to-haves)



- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`

- **Platform master:** PostgreSQL `platform_master_materials` + `platform_reference_items`

- **Admin UI:** `/platform/master-data` (platform_admin)

- **Sync:** Save on Master Data page → all tenants updated automatically

- **Tests:** engine 67/67 ✅, server integration tests ✅

- **GET /templates:** ✅ fixed (template_key collision on legacy duplicate rows)

- **Change feed:** `GET /api/v1/platform/master-data/changes` (JWT or service key)

- **API contract:** [docs/API_MASTER_DATA.md](./API_MASTER_DATA.md)

- **All changes uncommitted** — user to commit when ready



---



## What works (verified 2026-06-23)



| Area | Status |

|------|--------|

| Platform master tables + seed from JSON on first API start | ✅ |

| Master Data page — materials + reference CRUD | ✅ |

| Template library — Standard Templates page (browse/create/edit) | ✅ |

| Template → Estimate explosion (instantiate) | ✅ |

| Structure lock: template-exploded estimates lock layers (µ + dimensions only) | ✅ |

| Layer table: # / Type / Family / Grade Name / Value / Total GSM / Cost/Kg / Cost/M² | ✅ |

| Family dropdown filtered by template materialClass (PE → PE only) | ✅ |

| Grade dropdown filtered by family + classification | ✅ |

| Micron starts at 0 on explosion — user fills in | ✅ |

| Total GSM formula: substrate = µ×density, ink/adhesive = (solid%×µ)/100 | ✅ |

| Waste removed from cost formula — applied at order level later | ✅ |

| Engine tests: 67/67 (golden fixtures updated for no-waste) | ✅ |

| Cost/Kg shows x.xx in display currency | ✅ |

| Cost/M² shows x.xxxx — **BUG: value showing 0.09 instead of 0.09384** | 🔴 |



---



## Open Bug: Cost/M² wrong value

**Symptom:** LDPE Natural 60µ → GSM=55.2, Cost/kg=1.70 USD → expected Cost/M²=0.0938, showing 0.09

**Formula confirmed correct:** `(GSM × cost/kg) / 1000 = (55.2 × 1.70) / 1000 = 0.09384`

**Engine formula** (`calculateLayer`): substrate → `(gsm/1000) × costPerKgUsd` ✅ matches

**Suspect:** `clientCalcResult.estimate.layers[idx].costPerM2` is receiving a wrong cost/kg value (possibly 1.50 instead of 1.70). Debug logs were added (`[toMaterial] LDPE` and `[runClientCalculation] layers[0]`) but console showed collapsed `Object` — not expanded before session close.

**Next step:** Open DevTools → Console → expand `[toMaterial] LDPE` object → verify `costPerKgUsd` value. If it's not 1.70, trace where the wrong value enters `materials` state.



---



## Next session

1. **Fix Cost/M² bug** — expand DevTools objects to find wrong costPerKgUsd value in engine
2. Commit all session changes when bug is resolved

