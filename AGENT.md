# AGENT.md — Estimation Studio (ES)

> Read this before writing code. Workspace: `D:\ProPackHub\apps\estimation-studio\`

## Session start

1. Read `docs/ES_MEMORY.md` — living memory and costing rules
2. Read `docs/LOCKED_DECISIONS.md` — strategic locks
3. Read `docs/ES_PRD_v3_FINAL_BUILD_SPEC.md` — build spec (when implementing)
4. Read `docs/LIVE_STATE.md` — current phase
5. Engine reference: `archive/legacy-laravel/COSTING_NOTES.md`
6. Platform context: `../../platform/docs/PLATFORM_MASTER_PLAN.md`

## Product

- **Name:** ProPackHub Estimation Studio
- **Not** PEBI MES `/estimator` — mirrors legacy Laravel estimator only
- **Repo:** `https://github.com/camsalloum/propackhub-es.git` (main — docs pushed 2026-06-13)

## Session end (automatic)

At the end of any session with code or doc changes (all agents / IDEs):

1. Append dated bullets to `docs/ES_MEMORY.md` session log
2. Append `docs/SESSION_LOG.md`
3. Update `docs/LIVE_STATE.md`
4. Say: **"Memory updated. [N] files changed."**

Skip for read-only Q&A with no file edits.
