# Pricing method cheat sheet (internal)

One page for sales / estimators. Engine source: `@es/engine` `priceWithNewModel`.

## Three Manufacturing & Operating methods

| Method (Settings / estimate) | Cost breakdown row label | How M&O is computed |
|------------------------------|--------------------------|---------------------|
| **Fixed CoRM** (`fixed_per_group`) | Margin Over Raw Material | Template/estimate CoRM (display currency/kg) × (1 + waste%) |
| **Markup over material** (`markup_over_rm`) | Markup Over Material | Total RM × Markup % |
| **Per-kg process** (`process_per_kg`) | Manufacturing & Operating | Sum of enabled process $/kg × quantity; plus **Profit margin** |

## Sale price (all methods)

```
Sale/kg = Total RM + M&O + PrePress + Transport + accessory [+ Profit]
```

- **Total RM** = material $/kg × (1 + band waste%) + packaging + consumables (in RM block)
- **PrePress** = plates/kg + tooling amortized by slab qty (when billed)
- **Transport** = delivery/kg + freight amortized (when not EXW / charge > 0)
- **Profit** = **process method only**: `defaultProfitMarginPercent`% (default 5) × (Total RM + M&O + PrePress + Transport + accessory)

## Who can override method on an estimate

- `platform_admin` / `tenant_admin`, or Team visibility `overrideOperatingCostMethod`
- Others always use tenant Settings method; labels still follow the active method

## Fields beside the method dropdown

| Active method | Editable field | Persists on estimate |
|---------------|----------------|----------------------|
| Fixed CoRM | CoRM (display/kg) | `corm_per_kg_*` |
| Markup | Markup % | `markup_percent` |
| Process | Profit % | `profit_margin_percent` |

**Use tenant default** restores method + profit/markup defaults + template CoRM snapshot.

## Common mistakes

1. Changing Settings Fixed CoRM but leaving an open estimate — hard-refresh / re-open so live calc picks up method (Auth refresh on Settings save).
2. Expecting Profit % on Fixed CoRM / Markup — profit line is process-only.
3. Material card vs Cost breakdown — both use **Total RM** (waste-adjusted), not pre-waste RM.
4. Orange Packaging/Consumables banners — unit prices $0 in Master Data; run `npm run db:check-sync-health` / PEBI re-sync (not a quote bug).

## Automated goldens

- Engine: `packages/engine/src/pricing-model.test.ts`, `price-buildup.test.ts`
- Offline smoke: `npm run smoke:ultra-gates --workspace=packages/server`
