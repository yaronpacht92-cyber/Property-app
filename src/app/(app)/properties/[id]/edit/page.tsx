import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { EditPropertyForm } from "@/components/properties/edit-property-form";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const { id } = await params;
  const access = await assertPropertyAccess(
    id,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!access) notFound();

  const [property, entities] = await Promise.all([
    prisma.property.findFirst({
      where: { id, organizationId: session.user.organizationId, deletedAt: null },
      include: {
        owners: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.ownershipEntity.findMany({
      where: { organizationId: session.user.organizationId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!property) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <BackLink href={`/properties/${id}`} label="Back to Property" />
      <h1 className="text-4xl font-semibold">Edit Property</h1>
      <EditPropertyForm
        property={{
          id: property.id,
          nickname: property.nickname,
          streetAddress: property.streetAddress,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode,
          ownershipEntityId: property.ownershipEntityId,
          monthlyRent: property.monthlyRent?.toString() || "",
          leaseLengthMonths: property.leaseLengthMonths?.toString() || "",
          leaseExpiresAt: property.leaseExpiresAt
            ? property.leaseExpiresAt.toISOString().slice(0, 10)
            : "",
          bedrooms: property.bedrooms?.toString() || "",
          bathrooms: property.bathrooms?.toString() || "",
          squareFootage: property.squareFootage?.toString() || "",
          lotSizeSqFt: property.lotSizeSqFt?.toString() || "",
          yearBuilt: property.yearBuilt?.toString() || "",
          owners: property.owners.map((owner) => ({
            name: owner.name,
            email: owner.email || "",
            phone: owner.phone || "",
            ownershipPercent: owner.ownershipPercent?.toString() || "",
          })),
        }}
        ownershipEntities={entities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          entityType: entity.entityType,
        }))}
      />
    </div>
  );
}
