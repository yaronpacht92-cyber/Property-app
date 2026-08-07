import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession, getPropertyAccessFilter } from "@/lib/session";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatCurrency, formatDate, propertyTypeLabel } from "@/lib/utils";
import type { PropertyType } from "@prisma/client";

const FILTERS: { key: string; label: string; type?: PropertyType }[] = [
  { key: "all", label: "All Properties" },
  { key: "residential", label: "Residential", type: "RESIDENTIAL" },
  { key: "commercial", label: "Commercial", type: "COMMERCIAL" },
  { key: "vacant", label: "Vacant Land", type: "VACANT_LAND" },
  { key: "other", label: "Other", type: "OTHER" },
];

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; archived?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const selected = FILTERS.find((f) => f.key === params.type) ?? FILTERS[0];
  const baseFilter = await getPropertyAccessFilter(
    session.user.id,
    session.user.organizationId,
    session.user.roleKey,
  );

  const properties = await prisma.property.findMany({
    where: {
      ...baseFilter,
      ...(selected.type ? { propertyType: selected.type } : {}),
    },
    include: {
      valuations: { orderBy: { createdAt: "desc" }, take: 1 },
      contacts: {
        where: { role: "PROPERTY_MANAGER" },
        include: { contact: true },
        take: 1,
      },
      reminders: {
        where: { status: { in: ["OVERDUE", "DUE_SOON", "UPCOMING"] }, deletedAt: null },
        orderBy: { dueDate: "asc" },
        take: 1,
      },
    },
    orderBy: { nickname: "asc" },
  });

  const canAdd = hasPermission(session.user.permissions, PERMISSIONS.PROPERTIES_WRITE);

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/home" label="Back to Home" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold md:text-5xl">Properties</h1>
          <p className="mt-2 text-xl text-[var(--muted-foreground)]">
            Choose a property to view its details.
          </p>
        </div>
        {canAdd ? (
          <Button asChild size="large">
            <Link href="/properties/new">Add New Property</Link>
          </Button>
        ) : null}
      </div>

      {params.archived ? (
        <Alert tone="success" title="Property archived">
          The property was archived and can be restored by an administrator if needed.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter properties">
        {FILTERS.map((filter) => {
          const active = filter.key === selected.key;
          return (
            <Link
              key={filter.key}
              href={filter.key === "all" ? "/properties" : `/properties?type=${filter.key}`}
              className={`min-h-12 rounded-xl px-4 py-3 text-lg font-semibold ${
                active
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)] hover:bg-[var(--secondary)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5">
        {properties.length === 0 ? (
          <Alert tone="info" title="No properties in this list yet">
            {canAdd
              ? "Use Add New Property to create your first property."
              : "Ask a family administrator to add properties or assign them to you."}
          </Alert>
        ) : (
          properties.map((property) => {
            const valuation = property.valuations[0];
            const manager = property.contacts[0]?.contact;
            const reminder = property.reminders[0];
            return (
              <article
                key={property.id}
                className="grid gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 md:grid-cols-[180px_1fr_auto] md:items-center"
              >
                <div
                  className="flex min-h-36 items-center justify-center rounded-2xl bg-[var(--muted)] text-center text-base font-semibold text-[var(--muted-foreground)]"
                  aria-hidden="true"
                >
                  Property photo
                  <br />
                  not added yet
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-semibold">{property.nickname}</h2>
                    {property.isSampleData ? <Badge tone="info">Sample data</Badge> : null}
                  </div>
                  <p className="mt-1 text-lg">
                    {property.streetAddress}, {property.city}, {property.state} {property.zipCode}
                  </p>
                  <p className="mt-2 text-lg text-[var(--muted-foreground)]">
                    {propertyTypeLabel(property.propertyType)} · Est.{" "}
                    {formatCurrency(valuation?.estimatedValue?.toString())}
                    {valuation?.isEstimated ? "*" : ""}
                  </p>
                  <p className="mt-1 text-lg">
                    Manager: {manager?.name || "Not assigned"}
                  </p>
                  {reminder ? (
                    <p className="mt-2 text-lg">
                      <Badge tone={reminder.status === "OVERDUE" ? "danger" : "warning"}>
                        Reminder: {reminder.title}
                      </Badge>
                    </p>
                  ) : (
                    <p className="mt-2 text-base text-[var(--muted-foreground)]">
                      No upcoming reminders · Updated {formatDate(property.updatedAt)}
                    </p>
                  )}
                  {valuation?.isEstimated ? (
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      * Estimated value — not a guaranteed appraisal.
                    </p>
                  ) : null}
                </div>
                <Button asChild size="large">
                  <Link href={`/properties/${property.id}`}>View Property</Link>
                </Button>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
