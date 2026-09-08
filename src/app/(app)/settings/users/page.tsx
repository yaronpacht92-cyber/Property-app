import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Badge } from "@/components/ui/badge";
import { AddUserForm } from "@/components/settings/add-user-form";

export default async function UsersSettingsPage() {
  const session = await requirePermission(PERMISSIONS.USERS_MANAGE);
  const memberships = await prisma.membership.findMany({
    where: { organizationId: session.user.organizationId },
    include: { user: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/settings" label="Back to Settings" />
      <div>
        <h1 className="text-4xl font-semibold">Family users</h1>
        <p className="mt-2 text-lg text-[var(--muted-foreground)]">
          Everyone here has full access to view and edit the portfolio.
        </p>
      </div>
      <div className="space-y-3">
        {memberships.map((membership) => (
          <div
            key={membership.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div>
              <p className="text-xl font-semibold">{membership.user.name}</p>
              <p className="text-lg text-[var(--muted-foreground)]">{membership.user.email}</p>
            </div>
            <Badge tone="success">Full access</Badge>
          </div>
        ))}
      </div>
      <AddUserForm />
    </div>
  );
}
