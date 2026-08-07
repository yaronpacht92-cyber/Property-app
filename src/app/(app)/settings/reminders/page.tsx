import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Alert } from "@/components/ui/alert";

export default async function ReminderDefaultsPage() {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const settings = (org?.settings || {}) as {
    reminderDefaults?: { insuranceRenewalDays?: number[] };
  };
  const days = settings.reminderDefaults?.insuranceRenewalDays || [90, 60, 30, 7];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <BackLink href="/settings" label="Back to Settings" />
      <h1 className="text-4xl font-semibold">Reminder defaults</h1>
      <Alert tone="info" title="Insurance renewal reminders">
        Pachtfolio creates reminders before policy renewal dates using these defaults.
      </Alert>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-xl font-semibold">Default schedule</p>
        <ul className="mt-4 space-y-2 text-lg">
          {days.map((day) => (
            <li key={day} className="rounded-xl bg-white px-4 py-3">
              {day} days before renewal
            </li>
          ))}
        </ul>
        <p className="mt-4 text-base text-[var(--muted-foreground)]">
          Editing defaults from the UI can be expanded later; values are stored on the organization
          settings object and used when new insurance policies are saved.
        </p>
      </div>
    </div>
  );
}
