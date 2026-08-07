import { notFound } from "next/navigation";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { MaintenanceForm } from "@/components/properties/maintenance-form";

const CATEGORIES = [
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "ROOF",
  "APPLIANCES",
  "LANDSCAPING",
  "INTERIOR",
  "EXTERIOR",
  "SAFETY",
  "OTHER",
] as const;

export default async function NewMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.MAINTENANCE_WRITE);
  const { id } = await params;
  const property = await assertPropertyAccess(
    id,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <BackLink href={`/properties/${id}?tab=maintenance`} label="Back to Property" />
      <div>
        <h1 className="text-4xl font-semibold">Add Maintenance Record</h1>
        <p className="mt-2 text-xl text-[var(--muted-foreground)]">
          Record work completed at {property.nickname}.
        </p>
      </div>
      <MaintenanceForm propertyId={id} categories={[...CATEGORIES]} />
    </div>
  );
}
