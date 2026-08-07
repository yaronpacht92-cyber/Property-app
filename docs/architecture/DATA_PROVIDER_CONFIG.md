# Data-Provider Configuration Guide

Pachtfolio never scrapes consumer real-estate websites. Property valuation and tax data must come from:

1. Manual entry / override by the family, or
2. A public county / municipal GIS adapter (where registered), or
3. A properly licensed commercial provider adapter.

## Configuration

```env
PROPERTY_DATA_PROVIDER=auto
PROPERTY_DATA_API_KEY=
```

| Value | Behavior |
|-------|----------|
| `auto` (default) | Public county GIS when address matches a registered layer; else mock |
| `county` / `county-open-data` | Same as `auto` |
| `mock` | Sample labeled data only |

When a licensed provider is selected, implement the `PropertyDataProvider` interface and register it in `src/adapters/property-data/index.ts`.

## Adding another county

1. Confirm a public ArcGIS REST (or equivalent open) parcels endpoint and ToS/attribution.
2. Add a layer entry in `src/adapters/property-data/county-layers.ts` with field mapping and `matchesAddress`.
3. Add a unit test with a fixture response (prefer mocked HTTP).

## Required UI behaviors (all providers)

- Show data source name
- Show date last updated
- Label estimated values clearly
- Never present assessor totals as market estimates
- Provide Refresh (when connected)
- Provide Manual correct/override
- Never present estimates as guaranteed or exact
