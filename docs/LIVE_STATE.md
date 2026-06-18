# LIVE STATE — Estimation Studio

**Last updated:** 2026-06-18

## Status: V1 implementation plan complete

- **Phase:** PRD §14.1 Phases 1–6 + Platform (partial SSO) — **100% of plan items**
- **Workspace:** `D:\ProPackHub\apps\estimation-studio\`
- **Implementation plan:** [ES_IMPLEMENTATION_PLAN.md](./ES_IMPLEMENTATION_PLAN.md)
- **Build spec (canonical):** [ES_PRD_v3_FINAL_BUILD_SPEC.md](./ES_PRD_v3_FINAL_BUILD_SPEC.md) — **PRD v3.4**, V1 status in Appendix A.1

---

## What works (verified 2026-06-18)

| Area | Status |
|------|--------|
| Auth + tenant + material/template seed | ✅ |
| Quote loop: template → edit → save → calculate → price | ✅ |
| Client-side `@es/engine` instant price preview | ✅ |
| Dashboard summary + expiring proposals (7 days) | ✅ |
| Display currency, visibility, re-quote + auto-calc | ✅ |
| PDF (Puppeteer + branded pdfkit fallback) | ✅ |
| PWA service worker (Vite prod assets) | ✅ |
| Mobile: bottom nav, cards, sheets, swipe delete, keyboard-safe sheets | ✅ |
| Platform admin: master library API + UI | ✅ |
| PEBI SSO stub (`PEBI_SSO_URL` + login button) | ✅ |
| Builds: web + server + engine | ✅ |
| Tests: engine 18/18, server 5/5 | ✅ |

---

## Optional / post-V1

1. Full PEBI SSO token exchange (when PPH auth API ready)
2. Push master library changes to existing tenants
3. Run `npm run db:patch --workspace=packages/server` after pull if schema behind

---

## Setup

```bash
npm install
cd packages/server && cp .env.example .env
npm run db:push   # or db:patch if push fails
cd ../.. && npm run start:servers
# http://localhost:5000
```

---

## Database

13 tables + `quotation_valid_days` on tenants; `sent_at` / `valid_until` on estimates.
