import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPropertyDataProvider } from "@/adapters/property-data";
import { getFileStorage } from "@/adapters/storage";

export type RefreshTrigger = "manual" | "weekly" | "api";

export type RefreshResult = {
  propertyId: string;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  source: string | null;
  fieldsUpdated: string[];
  photoProposalId: string | null;
  message: string;
  refreshedAt: Date;
};

function decimalNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : Number(value.toString());
}

function isNewer(incoming: Date | null | undefined, existing: Date | null | undefined) {
  if (!incoming) return false;
  if (!existing) return true;
  return incoming.getTime() > existing.getTime();
}

function valuesDiffer(
  incoming: number | null | undefined,
  existing: number | null | undefined,
  epsilon = 0.01,
) {
  if (incoming === null || incoming === undefined) return false;
  if (existing === null || existing === undefined) return true;
  return Math.abs(incoming - existing) > epsilon;
}

/** Refresh public property data from an authorized provider adapter. Idempotent and safe to retry. */
export async function refreshPropertyPublicData(options: {
  propertyId: string;
  organizationId: string;
  trigger: RefreshTrigger;
  actorUserId?: string | null;
  overwriteManualOverrides?: boolean;
}): Promise<RefreshResult> {
  const startedAt = new Date();
  const fieldsUpdated: string[] = [];
  let photoProposalId: string | null = null;
  let source: string | null = null;

  const property = await prisma.property.findFirst({
    where: {
      id: options.propertyId,
      organizationId: options.organizationId,
      deletedAt: null,
    },
    include: {
      valuations: { orderBy: { createdAt: "desc" }, take: 1 },
      taxRecords: { orderBy: { createdAt: "desc" }, take: 1 },
      saleHistory: { orderBy: { saleDate: "desc" }, take: 20 },
      photoProposals: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!property) {
    return {
      propertyId: options.propertyId,
      status: "FAILED",
      source: null,
      fieldsUpdated: [],
      photoProposalId: null,
      message: "We could not find that property.",
      refreshedAt: startedAt,
    };
  }

  const log = await prisma.propertyDataRefreshLog.create({
    data: {
      propertyId: property.id,
      organizationId: options.organizationId,
      trigger: options.trigger,
      status: "RUNNING",
      startedAt,
      fieldsUpdated: [],
    },
  });

  try {
    const provider = getPropertyDataProvider();
    const snapshot = await provider.fetchPublicSnapshot({
      streetAddress: property.streetAddress,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
    });
    source = snapshot.providerName;

    // Valuation — preserve manual overrides unless explicitly overwritten.
    const latestValuation = property.valuations[0];
    if (snapshot.valuation) {
      const canUpdate =
        options.overwriteManualOverrides || !latestValuation?.isManualOverride;
      const newer =
        !latestValuation ||
        isNewer(snapshot.valuation.sourceUpdatedAt, latestValuation.sourceUpdatedAt) ||
        valuesDiffer(
          snapshot.valuation.estimatedValue,
          decimalNumber(latestValuation.estimatedValue),
        );
      if (canUpdate && newer) {
        await prisma.propertyValuation.create({
          data: {
            propertyId: property.id,
            estimatedValue: snapshot.valuation.estimatedValue,
            source: snapshot.valuation.source,
            sourceUpdatedAt: snapshot.valuation.sourceUpdatedAt,
            isEstimated: true,
            isManualOverride: false,
            notes: "Updated from authorized property data refresh.",
            createdById: options.actorUserId ?? null,
          },
        });
        fieldsUpdated.push("Estimated market value");
      }
    }

    // Tax — preserve manual overrides.
    const latestTax = property.taxRecords[0];
    if (snapshot.tax) {
      const canUpdate = options.overwriteManualOverrides || !latestTax?.isManualOverride;
      const newer =
        !latestTax ||
        isNewer(snapshot.tax.sourceUpdatedAt, latestTax.sourceUpdatedAt) ||
        valuesDiffer(snapshot.tax.assessedValue, decimalNumber(latestTax.assessedValue)) ||
        valuesDiffer(snapshot.tax.annualTax, decimalNumber(latestTax.annualTax));
      if (canUpdate && newer) {
        await prisma.propertyTaxRecord.create({
          data: {
            propertyId: property.id,
            assessedValue: snapshot.tax.assessedValue,
            annualTax: snapshot.tax.annualTax,
            authority: snapshot.tax.authority,
            parcelNumber: snapshot.tax.parcelNumber,
            source: snapshot.tax.source,
            sourceUpdatedAt: snapshot.tax.sourceUpdatedAt,
            isManualOverride: false,
            paymentStatus: latestTax?.paymentStatus ?? "UNKNOWN",
            jurisdiction: latestTax?.jurisdiction ?? null,
          },
        });
        fieldsUpdated.push("Assessed value / property taxes");
      }
    }

    // Characteristics — only apply non-null provider fields so partial county
    // feeds (e.g. lot size only) do not wipe beds/baths/sqft already on file.
    if (snapshot.characteristics) {
      const chars = snapshot.characteristics;
      const data: {
        bedrooms?: number | null;
        bathrooms?: number | null;
        squareFootage?: number | null;
        lotSizeSqFt?: number | null;
        yearBuilt?: number | null;
        propertyFeaturesSource: string;
        propertyFeaturesUpdatedAt: Date;
      } = {
        propertyFeaturesSource: chars.source,
        propertyFeaturesUpdatedAt: chars.sourceUpdatedAt,
      };
      let changed = false;
      if (chars.bedrooms !== null && chars.bedrooms !== property.bedrooms) {
        data.bedrooms = chars.bedrooms;
        changed = true;
      }
      if (
        chars.bathrooms !== null &&
        valuesDiffer(chars.bathrooms, decimalNumber(property.bathrooms))
      ) {
        data.bathrooms = chars.bathrooms;
        changed = true;
      }
      if (
        chars.squareFootage !== null &&
        chars.squareFootage !== property.squareFootage
      ) {
        data.squareFootage = chars.squareFootage;
        changed = true;
      }
      if (
        chars.lotSizeSqFt !== null &&
        chars.lotSizeSqFt !== property.lotSizeSqFt
      ) {
        data.lotSizeSqFt = chars.lotSizeSqFt;
        changed = true;
      }
      if (chars.yearBuilt !== null && chars.yearBuilt !== property.yearBuilt) {
        data.yearBuilt = chars.yearBuilt;
        changed = true;
      }
      const newer = isNewer(chars.sourceUpdatedAt, property.propertyFeaturesUpdatedAt);
      if (changed && (newer || !property.propertyFeaturesUpdatedAt)) {
        await prisma.property.update({
          where: { id: property.id },
          data,
        });
        fieldsUpdated.push("Property characteristics");
      }
    }

    // Sale history — insert only new external keys
    if (snapshot.saleHistory?.length) {
      let salesAdded = 0;
      for (const sale of snapshot.saleHistory) {
        const existing = await prisma.propertySaleHistory.findUnique({
          where: {
            propertyId_externalKey: {
              propertyId: property.id,
              externalKey: sale.externalKey,
            },
          },
        });
        if (existing) continue;
        await prisma.propertySaleHistory.create({
          data: {
            propertyId: property.id,
            saleDate: sale.saleDate,
            salePrice: sale.salePrice,
            buyerSeller: sale.buyerSeller,
            source: sale.source,
            sourceUpdatedAt: sale.sourceUpdatedAt,
            externalKey: sale.externalKey,
          },
        });
        salesAdded += 1;
      }
      if (salesAdded > 0) {
        fieldsUpdated.push(`Public sale history (${salesAdded} new)`);
      }
    }

    // Exterior photo — propose if user already has a photo; otherwise apply.
    if (snapshot.photo) {
      const storage = getFileStorage();
      const uploaded = await storage.upload({
        organizationId: options.organizationId,
        fileName: snapshot.photo.fileName,
        mimeType: snapshot.photo.mimeType,
        data: snapshot.photo.data,
      });

      if (property.photoDocumentId) {
        // Expire older pending proposals for this property.
        await prisma.propertyPhotoProposal.updateMany({
          where: { propertyId: property.id, status: "PENDING" },
          data: { status: "EXPIRED", resolvedAt: new Date() },
        });
        const proposal = await prisma.propertyPhotoProposal.create({
          data: {
            propertyId: property.id,
            status: "PENDING",
            proposedStorageKey: uploaded.storageKey,
            proposedMimeType: uploaded.mimeType,
            proposedSource: snapshot.photo.source,
            proposedRetrievedAt: snapshot.photo.retrievedAt,
            currentDocumentId: property.photoDocumentId,
          },
        });
        photoProposalId = proposal.id;
        await prisma.property.update({
          where: { id: property.id },
          data: { lastPhotoRefreshAt: snapshot.photo.retrievedAt },
        });
        fieldsUpdated.push("New exterior photo proposed");
      } else {
        const document = await prisma.document.create({
          data: {
            organizationId: options.organizationId,
            propertyId: property.id,
            category: "PHOTO",
            name: `Exterior photo — ${property.nickname}`,
            storageKey: uploaded.storageKey,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
            uploadedById: options.actorUserId ?? null,
            scanStatus: "SKIPPED",
            notes: `Retrieved from ${snapshot.photo.source}`,
          },
        });
        await prisma.property.update({
          where: { id: property.id },
          data: {
            photoDocumentId: document.id,
            photoSource: snapshot.photo.source,
            lastPhotoRefreshAt: snapshot.photo.retrievedAt,
          },
        });
        fieldsUpdated.push("Exterior photo");
      }
    }

    const finishedAt = new Date();
    await prisma.property.update({
      where: { id: property.id },
      data: {
        lastDataRefreshAt: finishedAt,
        lastDataRefreshSource: source,
      },
    });

    const status = fieldsUpdated.length ? "SUCCESS" : "SUCCESS";
    const message = fieldsUpdated.length
      ? `Updated: ${fieldsUpdated.join(", ")}.`
      : "Checked for updates. No newer public data was available.";

    await prisma.propertyDataRefreshLog.update({
      where: { id: log.id },
      data: {
        status,
        source,
        fieldsUpdated,
        message,
        finishedAt,
      },
    });

    return {
      propertyId: property.id,
      status,
      source,
      fieldsUpdated,
      photoProposalId,
      message,
      refreshedAt: finishedAt,
    };
  } catch (error) {
    const finishedAt = new Date();
    const friendly =
      "We could not refresh public property data right now. Your saved information is unchanged.";
    // Avoid logging PII/financial values.
    console.error("property_data_refresh_failed", {
      propertyId: property.id,
      trigger: options.trigger,
      error: error instanceof Error ? error.name : "unknown",
    });
    await prisma.propertyDataRefreshLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        source,
        fieldsUpdated,
        message: friendly,
        finishedAt,
      },
    });
    return {
      propertyId: property.id,
      status: "FAILED",
      source,
      fieldsUpdated,
      photoProposalId,
      message: friendly,
      refreshedAt: finishedAt,
    };
  }
}

export async function refreshAllPropertiesWeekly() {
  const properties = await prisma.property.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, organizationId: true },
  });

  const results: RefreshResult[] = [];
  for (const property of properties) {
    // Failures are logged per property and do not stop the batch.
    const result = await refreshPropertyPublicData({
      propertyId: property.id,
      organizationId: property.organizationId,
      trigger: "weekly",
      overwriteManualOverrides: false,
    });
    results.push(result);
  }

  return {
    processed: results.length,
    succeeded: results.filter((r) => r.status === "SUCCESS").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    results,
  };
}
