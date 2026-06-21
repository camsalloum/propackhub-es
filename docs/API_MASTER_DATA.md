# Master Data API — MES Integration Contract

**Version:** 1.0 (MES Phase E/F)  
**Base URL:** `/api/v1`

This document describes how external systems (PEBI MES sync agents) read platform master data changes and authenticate without user JWTs.

---

## Authentication

| Consumer | Header | Notes |
|----------|--------|-------|
| Platform admin (human) | `Authorization: Bearer <jwt>` | `platform_admin` or `tenant_admin`; 7-day expiry |
| MES sync agent | `X-ES-Service-Key: es_sk_…` | Read-only; scoped; revocable; 120 req/min |

**Do not** use non-expiring user JWTs for machine consumers.

### JWT refresh

When the access token is near expiry, re-issue without re-login:

```
POST /api/v1/auth/refresh
Authorization: Bearer <current-jwt>
→ { "token": "..." }
```

Requires a still-valid (unexpired) JWT.

### Service keys

Create via admin API (platform admin JWT required):

```
POST /api/v1/platform/service-keys
{ "label": "MES staging", "scopes": ["master_data:read"] }
```

Response includes `plainKey` **once**. Store it securely; only `key_hash` is persisted.

Revoke:

```
DELETE /api/v1/platform/service-keys/:id
```

---

## Versioning

- `master_data_version` — monotonic integer on `platform_master_state`
- Bumped on every platform material or reference list mutation
- Stamped on new estimates as `estimates.master_data_version`
- Layer rows store `platform_master_key_snapshot` + `costing_key_snapshot` at write time

---

## Change feed

```
GET /api/v1/platform/master-data/changes?since_version=42&include_snapshot=false
```

**Auth:** platform admin JWT **or** `X-ES-Service-Key` with `master_data:read`.

**Response:**

```json
{
  "currentVersion": 45,
  "sinceVersion": 42,
  "changes": [
    {
      "version": 43,
      "entityType": "material",
      "entityKey": "bopp-transparent",
      "action": "update",
      "changedAt": "2026-06-21T08:00:00.000Z",
      "before": { "key": "bopp-transparent", "costPerKgUsd": 2.1 },
      "after": { "key": "bopp-transparent", "costPerKgUsd": 2.15 },
      "actorType": "user",
      "actorId": "uuid"
    }
  ]
}
```

Set `include_snapshot=true` to embed full `materials` + `reference` catalogs at `currentVersion` (useful for initial sync).

Service-key calls are logged in `platform_master_audit_log` with `entityKey: change_feed`. Rate limit: **120 requests/minute** per key (`429` + `Retry-After`).

---

## Entity keys

| Entity | Column | Example |
|--------|--------|---------|
| Platform material | `platform_master_materials.key` | `ldpe-natural` |
| Costing / BOM alias | `materials.costing_key` | `ink-sb` |
| RM type | `platform_reference_items.code` | `substrate` |
| Standard template | `structure_templates.template_key` | `laminates-non-pe-duplex` |
| Tenant template | auto `tenant-{slug}-{shortId}` | not in PEBI catalog |

---

## Template lookup

```
GET /api/v1/templates?template_key=laminates-non-pe-duplex
POST /api/v1/templates/instantiate
{ "templateKey": "laminates-non-pe-duplex", "jobName": "Quote A" }
```

---

## External identity (Phase E)

Optional admin-editable fields — **never overwritten** by platform→tenant sync:

| Table | Columns |
|-------|---------|
| `platform_master_materials` | `external_id`, `external_source` |
| `materials` | `external_id`, `external_source` |
| `structure_templates` | `external_id`, `external_source` |

Use for future PEBI/Oracle/MES item mapping.

---

## Tenant sync semantics

On platform master save:

1. Bump `master_data_version`
2. Append audit log entries
3. `syncPlatformMasterToAllTenants()` — match tenant rows by `platform_master_key`
4. Manual tenant prices (`price_source = manual`) preserved

---

## Appendix — PEBI parent PG ↔ template_key (standard catalog)

| Display name | template_key (example) | material_class |
|--------------|------------------------|----------------|
| Commercial Items Plain | `commercial-items-plain-pe-mono` | PE |
| Commercial Items Printed | `commercial-items-printed-pe-mono` | PE |
| Laminates · Duplex | `laminates-non-pe-duplex` | Non PE |
| Laminates · Triplex | `laminates-non-pe-triplex` | Non PE |
| Laminates · Quadriplex | `laminates-non-pe-quadriplex` | Non PE |
| Labels | `labels-non-pe` | Non PE |
| Shrink Sleeves | `shrink-sleeves-non-pe` | Non PE |

My Templates use `tenant-{slug}-{shortId}` — not exported to PEBI catalog.

Full seed: `docs/ES_STANDARD_TEMPLATES_SEED.json` · live keys: `GET /api/v1/templates`

---

## Related docs

- [MES_READY.md](./MES_READY.md) — full phased plan
- [ES_MEMORY.md](./ES_MEMORY.md) — costing + lineage decisions
