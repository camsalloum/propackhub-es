# LIVE STATE — Estimation Studio

> ✅ **2026-06-21 update:** Deep re-audit + fixes ([ES_DEEP_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-21.md](./ES_DEEP_AUDIT_AND_ENHANCEMENT_PLAN_2026-06-21.md)). Build blockers are now **fixed**: web `tsc` **0 errors**, server `tsc` **0 errors**, engine **34/34**, server **36/36** (verified, live Postgres). A CI typecheck gate now fails the build on type errors. Remaining work (verified bug backlog BUG-1…13, migrations, mobile, PEBI seam, visual/domain Phase 7) is tracked in the deep-audit doc — treat it as the roadmap of record. Note: the prior "TypeScript clean" claim only became true with this session's fixes.



**Last updated:** 2026-06-21  

**Session:** Template/estimate UX polish — Excel job header, Cancel nav, blank canvas removed (ready for user smoke test)



## Status: ✅ MES plan complete (Phases A–F + §14 UI + V1 nice-to-haves)



- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`

- **Platform master:** PostgreSQL `platform_master_materials` + `platform_reference_items`

- **Admin UI:** `/platform/master-data` (platform_admin)

- **Sync:** Save on Master Data page → all tenants updated automatically

- **Tests:** server 36/36 ✅

- **GET /templates:** ✅ fixed (template_key collision on legacy duplicate rows)

- **Change feed:** `GET /api/v1/platform/master-data/changes` (JWT or service key)

- **API contract:** [docs/API_MASTER_DATA.md](./API_MASTER_DATA.md)

- **All changes uncommitted** — user to commit when ready



---



## What works (verified 2026-06-20)



| Area | Status |

|------|--------|

| Platform master tables + seed from JSON on first API start | ✅ |

| Master Data page — materials + reference CRUD | ✅ |

| Auto sync all tenants on platform master save | ✅ |

| `GET /api/v1/master-data/reference` from DB | ✅ |

| Library / EstimateEditor live reload via `MasterDataProvider` | ✅ |

| Tenant registration seeds from platform DB | ✅ |

| Excel refresh removed from Library UI | ✅ |

| Legacy `refresh-from-excel` API → platform DB sync | ✅ |

| Template → material via `costingKey` + relink | ✅ |

| Ink as layer — SB/UV from ink material | ✅ |

| Standard Templates admin CRUD | ✅ |

| Client-side `@es/engine` instant price preview | ✅ |

| Server integration tests | ✅ **14/14** |



---



## How to build and test



```bash

npm install   # postinstall builds @es/engine

cd packages/server && npm run db:patch

cd ../.. && npm run start:servers   # also builds engine before start

# Or double-click RUN-ES.bat (kill ports → engine build → db:patch → servers; browser after /health)

# http://localhost:5000 (web)

# http://localhost:5001 (api)



# Platform admin → Master Data — edit materials/lists; saves sync all tenants



cd packages/server && npm run test

cd packages/engine && npm run test

```



---



## Next session

1. **User smoke test:** `/templates?new=1` → job header → pick template → configure µ/dimensions → Save & Calculate → Cancel back to list
2. **User smoke test:** Same customer, two estimates (different templates / job names)
3. Run `npm run db:patch` in `packages/server` if `order_quantity_unit` column missing locally
4. **P2 backlog:** side-by-side estimate compare; file attachments per estimate
5. Commit when ready



---



**Project Status:** ✅ In-app Master Data shipped; Excel optional for legacy import only

