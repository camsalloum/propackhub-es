# Estimation Studio — Independent Audit Report
**Snapshot audited:** `propackhub-es-main` (upload `1781947296232`, 2026-06-20)
**Method:** Not a doc review. Every claim below was reproduced by actually installing, building, running, and querying the code in a clean sandbox — not inferred from `LIVE_STATE.md` or other self-reported status files, which are treated as unverified claims throughout.

---

## Headline finding: the "all green" docs are not reproducible — again

This is the second snapshot in a row where `LIVE_STATE.md` claims **"Tests 26/26 ✅, TypeScript clean ✅"** and **"Acceptance Criteria — ALL MET ✅"**, and the second snapshot in a row where that's demonstrably false from a clean checkout. The specific bugs changed slightly, but the *pattern* — confident "production ready" claims that don't survive a real reproduction — is itself the most important thing for you to know as the person relying on these reports. Treat every "✅" in these docs as "claimed," not "verified."

---

## 1. Database setup is still completely broken on a clean clone (unfixed from before)

This is the exact same root cause I found in the previous snapshot. It was **not fixed** in this version.

**Root cause, confirmed by direct reproduction:**
- `.gitignore` has a blanket `*.sql` rule. Result: **zero `.sql` files exist anywhere in the repo** — not `scripts/schema-patches.sql`, not `setup-db.sql`, nothing. Anything depending on a checked-in SQL file is broken from a fresh clone.
- Root `package.json` carries stray `"drizzle-orm": "^0.45.2"` and `"pg": "^8.21.0"` dependencies that have no source file at the repo root using them — traced to a leftover ad-hoc debug script (`packages/server/check-cols.cjs`, with a hardcoded DB password) that someone ran once and never cleaned up. Because this version doesn't match `packages/server`'s own `drizzle-orm@^0.30.10`, npm installs **two separate copies**. `drizzle-kit` (hoisted to the workspace root) resolves the *wrong* one, and **silently exits 1 with no error message** when you run `npm run db:push`.

**Net effect — I tested all three documented setup paths from a clean install, and all three fail:**
| Documented path | Result |
|---|---|
| `SETUP-DATABASE.bat` → `setup-db.sql` | File doesn't exist |
| `npm run db:push` (drizzle-kit) | Exits 1 silently, zero tables created |
| `npm run db:patch` (LIVE_STATE.md's recommended command) | `ENOENT: scripts/schema-patches.sql` |

**I confirmed this is exactly the cause, not a guess:** I removed the two stray root dependencies, and `npm run db:push` immediately started working and created all 16 tables correctly. This proves the diagnosis and that the underlying schema/business logic is fine — it's purely a packaging mistake.

**Corroborating evidence this isn't just my sandbox:** `.github/workflows/ci.yml` runs:
```
npm run db:push --workspace packages/server || true     # ← failure silenced
npm run db:patch --workspace packages/server             # ← then this, no fallback
```
Someone already hit this exact failure in CI and patched around it with `|| true` instead of fixing it — and the very next step (`db:patch`) has no such guard, so CI almost certainly fails today on the missing SQL file. This means the "26/26 tests" claim was never actually validated by CI either.

**Fix:** remove `drizzle-orm`/`pg`/`xlsx` from the **root** `package.json` (they belong only in `packages/server`'s own `package.json`, where `pg` is already declared correctly), delete `check-cols.cjs`, change `.gitignore`'s `*.sql` to something scoped (e.g. `*.local.sql`), and commit the actual `schema-patches.sql` / `setup-db.sql` files.

---

## 2. Excel → DB materials pipeline: live data-integrity bugs (directly affects "Excel is the source for all")

This is the part most relevant to what you described — Excel as the master source, tenants building their own material/template libraries on top of it. I read the actual `Master Data.xlsx` in this upload, not just the code.

### 2a. 29% of master materials have a silent $0 cost, right now, in your data
`master-materials-io.ts` computes the material's real cost as:
```ts
costPerKgUsd: roundUsd(parsePrice(cell(row, 'User Price', ...)) ?? 0)
```
If "User Price" is blank, cost becomes **0** — there is no fallback to "Market Price" for the actual costing field, and no warning is printed anywhere.

I opened your actual `Master Data.xlsx` and checked every row:

| Sheet | Rows | Rows with blank "User Price" |
|---|---|---|
| Substrate | 47 | 0 |
| Ink & Coating | 13 | **13 (100%)** |
| Adhesive | 3 | **3 (100%)** |
| Packaging | 3 | **3 (100%)** |

That's **19 of 66 materials (29%)** — and I confirmed these zeros are already baked into the committed `master-materials-seed.json`, the file every new tenant gets seeded from. **Right now, any estimate using an ink, adhesive, or packaging layer is computing $0 material cost for that layer.** This isn't a hypothetical edge case — it's every single row in three of your four material sheets.

**Fix:** at minimum, fall back to Market Price when User Price is blank (your code already does the reverse — Market Price falls back to User Price). Better: make the import script print a loud warning (or refuse to import) for any row with no price at all, so this can't happen silently again.

### 2b. "Refresh from Excel" silently overwrites tenant customizations — defeating the "own DB" goal
You said: *"users can make their own DB of raw materials and templates."* The code's own comment agrees with this intent:
> *"licensed users may add/edit rows in the app (tenant-only, not written to Excel)"*

But `syncMaterialsForTenant()` (used by both the "Refresh from Excel" admin button and `npm run db:sync-materials`) does this for every material it can match to an Excel row by family/grade/hoover:
```ts
await db.update(schema.materials).set({
  ...,
  costPerKgUsd: row.costPerKgUsd,   // ← unconditional, from Excel
  ...
}).where(eq(schema.materials.id, match.id));
```
There is **no column anywhere in the `materials` table** (no `isCustomPrice`, `priceSource`, nothing) to mark "a tenant edited this, don't overwrite it." So: a tenant prices a raw material based on their own supplier quote → someone runs a refresh → their price is silently replaced by whatever's in the master Excel, including back to $0 if that row is one of the 19 above. Only materials that don't match any Excel row at all (true one-off custom entries) are safe.

**Fix:** add an `isCustomized` boolean (or `priceSource: 'excel' | 'manual'`) set on manual edit, and skip overwriting `costPerKgUsd`/`marketPriceUsd` for rows flagged that way during sync.

### 2c. The Excel file itself has a recurring corruption problem that's being patched, not fixed
There's a whole script (`repair-master-data-excel.py`) dedicated to fixing a documented corruption pattern: an Excel **defined name** sharing a name with a **Table** breaks the file and triggers Excel's "repair" dialog. The fix script:
- Makes a timestamped backup before every run
- I found **three such backups** in this upload, all within an 8-minute window (`121259`, `121310`, `122012`) — meaning this repair had to be run three times in a row recently
- Two Excel lock files (`~$Master Data.xlsx`, `~$Costing_form ES.xlsx`) are also sitting in the repo, meaning these files were zipped while open in Excel

There's also a code comment flagging that an earlier Node.js-based fix (`fix-master-data-excel.ts`, now `@deprecated`) **"destroys Excel Tables"** — i.e., a previous attempt to fix this in Node actively made it worse, which is why they pivoted to Python/openpyxl. That pivot also introduces an **undeclared Python dependency** (no `requirements.txt` anywhere) in an otherwise pure Node/TypeScript project — anyone without Python+openpyxl installed gets no guidance when `npm run repair-master-data-excel` fails.

**Fix:** this is a workflow problem, not just a code problem — find out what's re-introducing the name/table collision (likely a manual Excel edit habit, like typing a name into Name Manager that matches a table) and stop it at the source; the repair script is a symptom-treatment, not a cure. Also add a `requirements.txt` and document the Python prerequisite.

---

## 3. Materials ↔ Templates linkage is fragile for tenant-created ("My") templates

- **Standard templates** resolve each layer's material via a portable string key (`ref_material_key`, fuzzy-matched against family/grade) — resilient to material rows being re-created during a sync.
- **"My Templates"** (created via "save estimate as template") instead store a literal `materialId` (raw UUID) per layer.
- That UUID reference lives only inside a JSONB column (`defaultLayers`) — there's **no real foreign key**, so the database won't stop you from deleting a material that a custom template depends on.
- At instantiate-time, if that UUID no longer resolves, the code does:
  ```ts
  if (!materialId) { console.warn(...); continue; }   // silently skips the layer
  ```
  The user gets a new estimate **missing a layer**, with only a server-side console log (which they'll never see) — no error, no warning banner in the UI.
- Deleting a material that's used by an *existing estimate* (not a template) is at least safe at the DB level — `layers.materialId` has no `onDelete` clause, so Postgres defaults to `RESTRICT` and blocks the delete. But the route just catches that and returns a bare `"Failed to delete material"` 500 — no indication of *why*, so the tenant user can't self-diagnose ("this material is used in 4 estimates").

**Fix:** make custom templates use the same portable key-based resolution as standard ones, or at minimum check for orphaned `materialId` references before instantiate and surface a clear error/warning to the user rather than silently dropping the layer. Give the delete-material endpoint a real error message when blocked by referential integrity.

---

## 4. Documentation vs. reality on tests/typecheck

| Claim in `LIVE_STATE.md` | What I found on reproduction |
|---|---|
| Engine tests 19/19 ✅ (now 12/12 in docs, 20/20 actual) | **True** — 20/20 pass |
| Server integration tests 7/7 ✅ | **False as committed** — fails immediately (`ENOENT: schema-patches.sql`). Only passes 7/7 once you manually fix §1's bugs and create a placeholder file yourself. |
| Web tsc ✅ | **False** — 2 real errors, including an unsafe `Record<string, unknown>` → `Material` cast in `Library.tsx` that's masking a genuine type mismatch (worth investigating, not just suppressing) |
| Server tsc ✅ | **False** — 9 errors: `Cannot find module 'puppeteer'` (see §5), several implicit-`any` parameters, unused variables |

---

## 5. Puppeteer / PDF generation — a real deployment risk for wherever you host the backend

`puppeteer@21` needs to download a ~200MB Chromium binary during `npm install`. I reproduced this failing with a 403 from Google's CDN in a network-restricted environment — exactly the kind of restriction common on PaaS hosts, locked-down corporate networks, or minimal containers. When that postinstall fails, the package isn't actually present afterward.

**Credit where due:** the actual PDF route (`estimates.ts`) is written defensively — it does a *dynamic* `await import('puppeteer')` inside a try/catch with a genuine three-tier fallback (Puppeteer → pdfkit → plain HTML), so a missing Puppeteer won't crash the server. That's the right pattern.

**Still worth knowing for your mobile/hosting plans:** the CI workflow has to apt-install ~25 native Chromium runtime libraries just to make the *happy path* work. If you ever containerize this backend for the mobile app's API, budget for that, or consider dropping Puppeteer entirely in favor of the pdfkit path (which is already implemented and branded) to avoid the whole class of problem.

---

## 6. Security: JWTs never expire, no refresh mechanism

```ts
await fastify.register(fastifyJwt, { secret: jwtSecret });   // no expiresIn anywhere
```
No `expiresIn` is set at registration or at either `jwt.sign()` call site. **Tokens issued by this API never expire.** There's no refresh-token flow and no server-side revocation list — "logout" just deletes the token from `localStorage` client-side; the token itself remains valid forever if anyone has a copy of it (an earlier doc snapshot claimed "120s TTL" + "token refresh handling," which doesn't exist in this code — it seems to have regressed or was never actually built).

For a mobile app this matters more, not less: tokens commonly get cached in device storage/backups, and a single leaked token is a permanent credential with no kill switch short of rotating `JWT_SECRET` for every user.

**Fix:** set a real `expiresIn` (e.g. 15 min–1 hr for access tokens), add a refresh-token endpoint + rotation, and store a revocation/session table if you need server-side logout.

---

## 7. Mobile app (iOS/Android) readiness assessment

**Good news:** auth uses `Authorization: Bearer <token>` headers, not cookies — this is the right shape for native mobile networking (no cookie-jar/CORS-credentials complexity to fight). Tenant isolation is consistently enforced via `tenantId` filtering in queries across the routes I checked.

**Gaps to address before/while building the mobile client:**
1. **JWT expiry/refresh (§6)** — build this before shipping a mobile client; you don't want indefinitely-valid tokens floating around on phones.
2. **Fix the DB setup chain (§1)** first — you can't reliably stand up a backend instance (staging, CI, a teammate's machine) for mobile client development against until this is fixed.
3. **API error responses are inconsistent** — most failure paths return a generic `{ error: '...' }` with a 500, with no machine-readable error codes. A mobile client needs to distinguish "network issue," "validation issue," "auth expired," etc. to show the right UI; right now it'd have to guess from HTTP status + string matching.
4. **No pagination observed** on list endpoints I checked (materials, templates) — fine at current data volumes, but worth adding before a mobile client with metered data/slower connections is pulling full lists repeatedly.
5. **Offline support is explicitly out of scope today** (per the old IMPLEMENTATION_COMPLETE.md "Lower Priority" list) — decide early whether the mobile app needs any offline draft capability, since that's an architecture decision (e.g. local SQLite + sync queue) that's much cheaper to plan for now than retrofit later.
6. **Decide: wrap the existing React PWA (Capacitor) vs. build native.** The web app already has a service worker and some mobile-responsive work (per docs) — if a wrapped PWA is acceptable for your use case, that's by far the cheaper path than two native codebases, and it inherits the same API client you already have. Worth deciding before investing in native-specific work.

---

## 8. Repo hygiene (lower priority, but easy to fix)

- Excel lock files (`~$Master Data.xlsx`, `~$Costing_form ES.xlsx`) and three timestamped Excel backups were included in this upload — none of these belong in version control.
- `DATABASE_READY.md` has a plaintext DB password committed in markdown (`es_user` / `es_password`) — low risk since it's a local dev default, but worth not making a habit of.
- `check-cols.cjs` (ad-hoc debug script with a hardcoded connection string) should be deleted — it's also the direct cause of the §1 dependency conflict.
- Multiple overlapping "status" docs (`LIVE_STATE.md`, `IMPLEMENTATION_COMPLETE.md`, `README_IMPLEMENTATION.md`, `DATABASE_READY.md`, `CRITICAL_BUGS_FIXED.md`, `ES_BUGS_AND_PRD_GAPS.md`) — several contradict each other or are stale (IMPLEMENTATION_COMPLETE.md is from 2026-06-14, predates most of what's in LIVE_STATE.md). Worth consolidating into one living status doc to stop this exact "which claim do I trust" problem from recurring.

---

## Suggested priority order

1. Fix §1 (DB setup) — nothing else can be reliably verified by anyone until this works from a clean clone.
2. Fix §2a (the $0 cost bug) — this affects real money in current estimates.
3. Decide on §2b (customization-overwrite) before telling tenants they can build "their own DB" — right now that promise isn't true for anything that overlaps the master Excel taxonomy.
4. §6 (JWT expiry) before any mobile rollout.
5. §3, §4, §5, §8 as ongoing hardening.
