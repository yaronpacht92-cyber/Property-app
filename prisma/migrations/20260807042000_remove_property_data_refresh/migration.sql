-- Remove automated property-data refresh / GIS / photo-proposal subsystem.
-- Portfolio values remain manual entry only.

DROP TABLE IF EXISTS "PropertyDataRefreshLog";
DROP TABLE IF EXISTS "PropertyPhotoProposal";
DROP TABLE IF EXISTS "PropertySaleHistory";

DROP TYPE IF EXISTS "PhotoProposalStatus";

DROP INDEX IF EXISTS "Property_lastDataRefreshAt_idx";

ALTER TABLE "Property"
  DROP COLUMN IF EXISTS "photoSource",
  DROP COLUMN IF EXISTS "lastPhotoRefreshAt",
  DROP COLUMN IF EXISTS "lastDataRefreshAt",
  DROP COLUMN IF EXISTS "lastDataRefreshSource",
  DROP COLUMN IF EXISTS "propertyFeaturesSource",
  DROP COLUMN IF EXISTS "propertyFeaturesUpdatedAt";
