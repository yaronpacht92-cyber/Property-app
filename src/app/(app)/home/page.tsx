import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession, getPropertyAccessFilter } from "@/lib/session";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Building2, CalendarClock, FileWarning, Wrench } from "lucide-react";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const orgId = session.user.organizationId;
  const propertyFilter = await getPropertyAccessFilter(
    session.user.id,
    orgId,
    session.user.roleKey,
  );

  const [propertyCount, reminders, recentProperties, accounting, email] = await Promise.all([
    prisma.property.count({ where: propertyFilter }),
    prisma.reminder.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { in: ["OVERDUE", "DUE_SOON", "UPCOMING"] },
      },
      include: { property: true },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.property.findMany({
      where: propertyFilter,
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.accountingConnection.findFirst({ where: { organizationId: orgId } }),
    prisma.emailConnection.findFirst({ where: { organizationId: orgId } }),
  ]);

  const insuranceRenewals = reminders.filter((r) => r.type === "INSURANCE_RENEWAL").length;
  const taxDeadlines = reminders.filter((r) => r.type === "PROPERTY_TAX").length;
  const maintenanceDue = reminders.filter(
    (r) => r.type === "ROUTINE_MAINTENANCE" && r.status !== "UPCOMING",
  ).length;
  const needingAttention = reminders.filter((r) =>
    ["OVERDUE", "DUE_SOON"].includes(r.status),
  );

  const canAdd = hasPermission(session.user.permissions, PERMISSIONS.PROPERTIES_WRITE);

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold md:text-5xl">
            Good day, {session.user.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-2 max-w-2xl text-xl text-[var(--muted-foreground)]">
            Here is a simple view of your portfolio and what needs attention.
          </p>
        </div>
        {canAdd ? (
          <div className="flex flex-wrap gap-3">
            <Button asChild size="large" variant="secondary">
              <Link href="/financials">View portfolio P&amp;L</Link>
            </Button>
            <Button asChild size="large" className="animate-soft-pulse">
              <Link href="/properties/new">Add Property</Link>
            </Button>
          </div>
        ) : (
          <Button asChild size="large" variant="secondary">
            <Link href="/financials">View portfolio P&amp;L</Link>
          </Button>
        )}
      </div>

      {params.error === "permission" ? (
        <Alert tone="warning" title="You do not have permission for that action">
          Ask a family administrator if you need access.
        </Alert>
      ) : null}

      <form action="/search" className="rounded-2xl border-2 border-[var(--border-strong)] bg-white p-3">
        <label htmlFor="q" className="sr-only">
          Search properties, addresses, documents, or notes
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            id="q"
            name="q"
            defaultValue={params.q}
            placeholder="Search properties, addresses, documents, or notes"
            className="min-h-14 flex-1 rounded-xl px-4 text-lg outline-none"
          />
          <Button type="submit">Search</Button>
        </div>
      </form>

      <section aria-label="Portfolio summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={<Building2 className="h-7 w-7" aria-hidden="true" />}
          label="Total Properties"
          value={String(propertyCount)}
        />
        <SummaryCard
          icon={<CalendarClock className="h-7 w-7" aria-hidden="true" />}
          label="Upcoming Insurance Renewals"
          value={String(insuranceRenewals)}
        />
        <SummaryCard
          icon={<FileWarning className="h-7 w-7" aria-hidden="true" />}
          label="Upcoming Property Tax Deadlines"
          value={String(taxDeadlines)}
        />
        <SummaryCard
          icon={<Wrench className="h-7 w-7" aria-hidden="true" />}
          label="Maintenance Due"
          value={String(maintenanceDue)}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-7 w-7" aria-hidden="true" />}
          label="Items Needing Attention"
          value={String(needingAttention.length)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-3xl font-semibold">Needs Attention</h2>
          <p className="mt-1 text-lg text-[var(--muted-foreground)]">
            Start here — these items are overdue or due soon.
          </p>
          <ul className="mt-5 space-y-3">
            {needingAttention.length === 0 ? (
              <li className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-lg">
                Nothing needs attention right now.
              </li>
            ) : (
              needingAttention.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4"
                >
                  <div>
                    <p className="text-lg font-semibold">{item.title}</p>
                    <p className="text-base text-[var(--muted-foreground)]">
                      {item.property?.nickname || "General"} · Due {formatDate(item.dueDate)}
                    </p>
                    <Badge tone={item.status === "OVERDUE" ? "danger" : "warning"} className="mt-2">
                      {item.status === "OVERDUE" ? "Overdue" : "Due soon"}
                    </Badge>
                  </div>
                  <Button asChild variant="secondary" size="small">
                    <Link href={item.propertyId ? `/properties/${item.propertyId}` : "/reminders"}>
                      View
                    </Link>
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-3xl font-semibold">Recently Updated</h2>
            <ul className="mt-4 space-y-3">
              {recentProperties.map((property) => (
                <li key={property.id}>
                  <Link
                    href={`/properties/${property.id}`}
                    className="block rounded-2xl bg-white px-4 py-3 text-lg font-semibold hover:bg-[var(--muted)]"
                  >
                    {property.nickname}
                    <span className="mt-1 block text-base font-normal text-[var(--muted-foreground)]">
                      Updated {formatDate(property.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-3xl font-semibold">Integrations</h2>
            <ul className="mt-4 space-y-3 text-lg">
              <li className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                <span>QuickBooks</span>
                <Badge tone={accounting?.status === "CONNECTED" ? "success" : "neutral"}>
                  {statusLabel(accounting?.status)}
                </Badge>
              </li>
              <li className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                <span>Email</span>
                <Badge tone={email?.status === "CONNECTED" ? "success" : "neutral"}>
                  {statusLabel(email?.status)}
                </Badge>
              </li>
            </ul>
            {hasPermission(session.user.permissions, PERMISSIONS.INTEGRATIONS_MANAGE) ? (
              <Button asChild variant="outline" className="mt-4">
                <Link href="/settings/integrations">Manage integrations</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-[var(--primary)]">{icon}</div>
      <p className="mt-4 text-4xl font-bold">{value}</p>
      <p className="mt-2 text-lg font-semibold leading-snug">{label}</p>
    </div>
  );
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "CONNECTED":
      return "Connected";
    case "ERROR":
      return "Needs attention";
    case "DISCONNECTED":
      return "Disconnected";
    default:
      return "Not connected";
  }
}
