# Property Data Refresh

## Overview

Pachtfolio refreshes public property information through the authorized `PropertyDataProvider` adapter. Consumer websites are never scraped.

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

## Fields refreshed when available

- Estimated market value
- Assessed value / annual taxes
- Beds, baths, square footage, lot size, year built
- Public sale history
- Representative exterior photo (licensed/public sources only)
