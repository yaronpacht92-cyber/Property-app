import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { BackLink } from "@/components/layout/back-link";
import { AddPropertyWizard } from "@/components/properties/add-property-wizard";

export default async function NewPropertyPage() {
  await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const entities = await prisma.ownershipEntity.findMany({
    where: { organizationId: session.user.organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/properties" label="Back to Properties" />
      <div>
        <h1 className="text-4xl font-semibold md:text-5xl">Add a Property</h1>
        <p className="mt-2 max-w-3xl text-xl text-[var(--muted-foreground)]">
          We will walk you through a few short steps. You can skip optional sections and finish them
          later.
        </p>
      </div>
      <AddPropertyWizard
        ownershipEntities={entities.map((e) => ({ id: e.id, name: e.name }))}
      />
    </div>
  );
}
