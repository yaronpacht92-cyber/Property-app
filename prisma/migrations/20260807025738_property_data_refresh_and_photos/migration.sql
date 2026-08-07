-- CreateEnum
CREATE TYPE "PhotoProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'SAVED_BOTH', 'EXPIRED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "bathrooms" DECIMAL(4,1),
ADD COLUMN     "bedrooms" INTEGER,
ADD COLUMN     "lastDataRefreshAt" TIMESTAMP(3),
ADD COLUMN     "lastDataRefreshSource" TEXT,
ADD COLUMN     "lastPhotoRefreshAt" TIMESTAMP(3),
ADD COLUMN     "lotSizeSqFt" INTEGER,
ADD COLUMN     "photoSource" TEXT,
ADD COLUMN     "propertyFeaturesSource" TEXT,
ADD COLUMN     "propertyFeaturesUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "squareFootage" INTEGER,
ADD COLUMN     "yearBuilt" INTEGER;

-- CreateTable
CREATE TABLE "PropertySaleHistory" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "salePrice" DECIMAL(14,2),
    "buyerSeller" TEXT,
    "source" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "externalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertySaleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPhotoProposal" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "status" "PhotoProposalStatus" NOT NULL DEFAULT 'PENDING',
    "proposedStorageKey" TEXT NOT NULL,
    "proposedMimeType" TEXT NOT NULL,
    "proposedSource" TEXT NOT NULL,
    "proposedRetrievedAt" TIMESTAMP(3) NOT NULL,
    "currentDocumentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,

    CONSTRAINT "PropertyPhotoProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyDataRefreshLog" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "source" TEXT,
    "fieldsUpdated" JSONB NOT NULL DEFAULT '[]',
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PropertyDataRefreshLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertySaleHistory_propertyId_saleDate_idx" ON "PropertySaleHistory"("propertyId", "saleDate");

-- CreateIndex
CREATE UNIQUE INDEX "PropertySaleHistory_propertyId_externalKey_key" ON "PropertySaleHistory"("propertyId", "externalKey");

-- CreateIndex
CREATE INDEX "PropertyPhotoProposal_propertyId_status_idx" ON "PropertyPhotoProposal"("propertyId", "status");

-- CreateIndex
CREATE INDEX "PropertyDataRefreshLog_organizationId_startedAt_idx" ON "PropertyDataRefreshLog"("organizationId", "startedAt");

-- CreateIndex
CREATE INDEX "PropertyDataRefreshLog_propertyId_startedAt_idx" ON "PropertyDataRefreshLog"("propertyId", "startedAt");

-- CreateIndex
CREATE INDEX "Property_lastDataRefreshAt_idx" ON "Property"("lastDataRefreshAt");

-- AddForeignKey
ALTER TABLE "PropertySaleHistory" ADD CONSTRAINT "PropertySaleHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPhotoProposal" ADD CONSTRAINT "PropertyPhotoProposal_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDataRefreshLog" ADD CONSTRAINT "PropertyDataRefreshLog_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
