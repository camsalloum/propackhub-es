# LIVE STATE — Estimation Studio



**Last updated:** 2026-06-20  

**Session:** Master Data cleanup + TemplatePicker 4-tier classification grid



## Status: ✅ Master Data in-app + TemplatePicker classification grid



- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`

- **Platform master:** PostgreSQL `platform_master_materials` + `platform_reference_items`

- **Admin UI:** `/platform/master-data` (platform_admin)

- **Sync:** Save on Master Data page → all tenants updated automatically

- **Tests:** server 14/14 ✅

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

npm install

cd packages/server && npm run db:patch

cd ../.. && npm run start:servers

# http://localhost:5000 (web)

# http://localhost:5001 (api)



# Platform admin → Master Data — edit materials/lists; saves sync all tenants



cd packages/server && npm run test

cd packages/engine && npm run test

```



---



## Next session

1. Smoke-test RM Types loop: add "Plate" code in Master Data → RM Types, save, open Raw Materials → verify Plate tab appears; add a plate material → verify it's filterable
2. Smoke-test TemplatePicker classification grid
3. Smoke-test Master Data: Printing Web / Ink Families / Adhesive Families tabs are gone
4. Optional: remove `Master Data.xlsx` from repo root (keep in archive) once satisfied
5. Commit when ready



---



**Project Status:** ✅ In-app Master Data shipped; Excel optional for legacy import only

