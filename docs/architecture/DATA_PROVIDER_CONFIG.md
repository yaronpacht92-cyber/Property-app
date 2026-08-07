# Data-Provider Configuration Guide

Pachtfolio never scrapes consumer real-estate websites. Property valuation and tax data must come from:

1. Manual entry / override by the family, or
2. A properly licensed provider adapter.

## Configuration

```env
PROPERTY_DATA_PROVIDER=mock
PROPERTY_DATA_API_KEY=
```

When a licensed provider is selected, implement the `PropertyDataProvider` interface and register it in `src/adapters/property-data/index.ts`.

## Required UI behaviors (all providers)

- Show data source name
- Show date last updated
- Label estimated values clearly
- Provide Refresh (when connected)
- Provide Manual correct/override
- Never present estimates as guaranteed or exact
