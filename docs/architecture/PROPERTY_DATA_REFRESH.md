# Property Data Refresh

## Overview

Pachtfolio refreshes public property information through the authorized `PropertyDataProvider` adapter. Consumer websites are never scraped.

Default mode (`PROPERTY_DATA_PROVIDER=auto`) uses **public county / municipal GIS parcel layers** when the property address is covered, and falls back to the labeled mock provider otherwise.

## Public county GIS (current)

| Jurisdiction | Source | What we import |
|--------------|--------|----------------|
| Montgomery County, AL | [Parcels MapServer](https://gis.montgomeryal.gov/server/rest/services/Parcels/MapServer/0) (ArcGIS REST) | Parcel number, assessor total value (`TotalValue`), lot size from acres |

Important limitations:

- Assessor **total value is not a market estimate** (not Zillow/AVM). It is stored under tax / assessed value only.
- Beds, baths, living area, annual tax bill, sale history, and photos are usually not available from this layer.
- Coverage is opt-in per county via `src/adapters/property-data/county-layers.ts`. There is no free nationwide AVM.

## Weekly automatic refresh

- Endpoint: `GET/POST /api/cron/weekly-property-refresh`
- Auth: `Authorization: Bearer $CRON_SECRET` (or `?secret=`)
- Schedule: Mondays 12:00 UTC via `vercel.json` cron (adjust as needed)
- Local run: `npm run jobs:weekly-refresh`

The job is idempotent. A failure for one property is logged and does not stop the rest of the portfolio.

## Manual refresh

Property profiles include a **Refresh Property Data** button for users with `properties.write`. Manual overrides are preserved unless a future overwrite option is used.

## Photo handling

- If no current photo exists, an authorized provider photo may be applied automatically.
- If a current photo exists, a newer provider photo becomes a **proposed update**.
- Users choose: Keep Current Photo, Replace with New Photo, or Save Both.
- `lastPhotoRefreshAt` and photo source are shown on the property profile.
- County GIS layers currently do not supply exterior photos.

## Fields refreshed when available

- Estimated market value (licensed/mock providers only — not county assessor totals)
- Assessed value / parcel / authority (county GIS + licensed/mock)
- Beds, baths, square footage, lot size, year built (partial updates; nulls do not wipe existing values)
- Public sale history
- Representative exterior photo (licensed/public sources only)
