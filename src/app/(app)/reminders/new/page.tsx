import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReminderAction } from "@/server/actions/reminders";

export default async function NewReminderPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const session = await requirePermission(PERMISSIONS.REMINDERS_WRITE);
  const params = await searchParams;
  const properties = await prisma.property.findMany({
    where: { organizationId: session.user.organizationId, deletedAt: null },
    orderBy: { nickname: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <BackLink href="/reminders" label="Back to Reminders" />
      <h1 className="text-4xl font-semibold">Add Reminder</h1>
      <form
        action={async (formData) => {
          "use server";
          await createReminderAction(formData);
        }}
        className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="propertyId">Property</Label>
          <select
            id="propertyId"
            name="propertyId"
            defaultValue={params.propertyId || ""}
            className="min-h-14 w-full rounded-xl border-2 border-[var(--border-strong)] bg-white px-4 text-lg"
          >
            <option value="">General (no specific property)</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.nickname}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Reminder type</Label>
          <select
            id="type"
            name="type"
            defaultValue="CUSTOM"
            className="min-h-14 w-full rounded-xl border-2 border-[var(--border-strong)] bg-white px-4 text-lg"
          >
            <option value="INSURANCE_RENEWAL">Insurance renewal</option>
            <option value="PROPERTY_TAX">Property tax deadline</option>
            <option value="LEASE_EXPIRATION">Lease expiration</option>
            <option value="LOAN_MATURITY">Loan maturity</option>
            <option value="INSPECTION">Inspection</option>
            <option value="ROUTINE_MAINTENANCE">Routine maintenance</option>
            <option value="WARRANTY_EXPIRATION">Warranty expiration</option>
            <option value="CONTRACTOR_FOLLOW_UP">Contractor follow-up</option>
            <option value="LICENSE_RENEWAL">License or registration renewal</option>
            <option value="CUSTOM">Custom reminder</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Reminder title</Label>
          <Input id="title" name="title" required placeholder="What should we remember?" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" placeholder="Optional details" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" required />
        </div>
        <Button type="submit" size="large">
          Save Reminder
        </Button>
      </form>
    </div>
  );
}
