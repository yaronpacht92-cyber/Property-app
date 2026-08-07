import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePropertyBasicsAction } from "@/server/actions/properties";

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

  const property = await prisma.property.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
  });
  if (!property) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <BackLink href={`/properties/${id}`} label="Back to Property" />
      <h1 className="text-4xl font-semibold">Edit Property</h1>
      <form
        action={async (formData) => {
          "use server";
          await updatePropertyBasicsAction(id, formData);
        }}
        className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="nickname">Property nickname</Label>
          <Input id="nickname" name="nickname" defaultValue={property.nickname} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="streetAddress">Street address</Label>
          <Input
            id="streetAddress"
            name="streetAddress"
            defaultValue={property.streetAddress}
            required
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={property.city} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" defaultValue={property.state} required maxLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP code</Label>
            <Input id="zipCode" name="zipCode" defaultValue={property.zipCode} required />
          </div>
        </div>
        <Button type="submit" size="large">
          Save Changes
        </Button>
      </form>
    </div>
  );
}
