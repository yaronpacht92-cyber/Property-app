-- AlterTable
ALTER TABLE "EmailThreadReference" ADD COLUMN "providerUrl" TEXT;
ALTER TABLE "EmailThreadReference" ADD COLUMN "hasAttachment" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "EmailThreadReference_organizationId_propertyId_receivedAt_idx" ON "EmailThreadReference"("organizationId", "propertyId", "receivedAt");
