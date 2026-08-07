import "dotenv/config";
import { prisma } from "../src/lib/db";
import { refreshPropertyPublicData } from "../src/server/services/property-data-refresh";

async function main() {
  const property = await prisma.property.findFirst({
    where: { nickname: "Saddlewood lane", deletedAt: null },
  });
  if (!property) {
    throw new Error("Saddlewood lane property not found. Run npm run db:seed or add the property.");
  }

  const result = await refreshPropertyPublicData({
    propertyId: property.id,
    organizationId: property.organizationId,
    trigger: "manual",
    overwriteManualOverrides: false,
  });

  const tax = await prisma.propertyTaxRecord.findFirst({
    where: { propertyId: property.id },
    orderBy: { createdAt: "desc" },
  });
  const updated = await prisma.property.findUnique({ where: { id: property.id } });

  console.log(
    JSON.stringify(
      {
        result,
        tax: tax
          ? {
              assessedValue: tax.assessedValue?.toString(),
              parcelNumber: tax.parcelNumber,
              source: tax.source,
              authority: tax.authority,
            }
          : null,
        lotSizeSqFt: updated?.lotSizeSqFt,
        lastDataRefreshSource: updated?.lastDataRefreshSource,
        propertyFeaturesSource: updated?.propertyFeaturesSource,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
