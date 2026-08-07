-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "leaseExpiresAt" TIMESTAMP(3),
ADD COLUMN     "leaseLengthMonths" INTEGER,
ADD COLUMN     "monthlyRent" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "ownershipPercent" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyOwner_propertyId_idx" ON "PropertyOwner"("propertyId");

-- CreateIndex
CREATE INDEX "Property_leaseExpiresAt_idx" ON "Property"("leaseExpiresAt");

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
