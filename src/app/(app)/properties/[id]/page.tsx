import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, assertPropertyAccess } from "@/lib/session";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatCurrency, formatDate, propertyTypeLabel } from "@/lib/utils";
import { PropertyNotesForm } from "@/components/properties/notes-form";
import { ValuationOverrideForm } from "@/components/properties/valuation-override-form";
import { ArchivePropertyButton } from "@/components/properties/archive-property-button";
import { RefreshPropertyDataButton } from "@/components/properties/refresh-property-data-button";
import { PhotoProposalPanel } from "@/components/properties/photo-proposal-panel";
import { getFileStorage } from "@/adapters/storage";

const TABS = [
  "overview",
  "financials",
  "maintenance",
  "insurance",
  "documents",
  "emails",
  "contacts",
  "notes",
] as const;

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; created?: string; saved?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const query = await searchParams;
  const tab = (TABS.includes((query.tab as (typeof TABS)[number]) ?? "overview")
    ? query.tab
    : "overview") as (typeof TABS)[number];

  const access = await assertPropertyAccess(
    id,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!access) notFound();

  const property = await prisma.property.findFirst({
    where: { id, organizationId: session.user.organizationId, deletedAt: null },
    include: {
      ownershipEntity: true,
      owners: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
      valuations: { orderBy: { createdAt: "desc" }, take: 3 },
      taxRecords: { orderBy: { createdAt: "desc" }, take: 1 },
      mortgages: { take: 1 },
      insurancePolicies: { where: { deletedAt: null }, include: { agentContact: true } },
      maintenanceRecords: {
        where: { deletedAt: null },
        include: { contractor: true },
        orderBy: { completedAt: "desc" },
        take: 20,
      },
      documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20 },
      reminders: {
        where: { deletedAt: null, status: { in: ["OVERDUE", "DUE_SOON", "UPCOMING"] } },
        orderBy: { dueDate: "asc" },
        take: 5,
      },
      contacts: { include: { contact: true } },
      notes: {
        where: { deletedAt: null },
        include: { author: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      emailThreads: { orderBy: { receivedAt: "desc" }, take: 10 },
      accountingMappings: true,
      financialTransactions: { orderBy: { txnDate: "desc" }, take: 8 },
      saleHistory: { orderBy: { saleDate: "desc" }, take: 8 },
      photoProposals: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      dataRefreshLogs: { orderBy: { startedAt: "desc" }, take: 3 },
    },
  });

  if (!property) notFound();

  const valuation = property.valuations[0];
  const tax = property.taxRecords[0];
  const manager = property.contacts.find((c) => c.role === "PROPERTY_MANAGER")?.contact;
  const ownerNames = property.owners.map((owner) => owner.name).filter(Boolean);
  const canEdit = hasPermission(session.user.permissions, PERMISSIONS.PROPERTIES_WRITE);
  const storage = getFileStorage();
  const currentPhoto = property.photoDocumentId
    ? await prisma.document.findFirst({
        where: {
          id: property.photoDocumentId,
          organizationId: session.user.organizationId,
          deletedAt: null,
        },
      })
    : null;
  const currentPhotoUrl = currentPhoto
    ? (await storage.getSignedDownloadUrl(currentPhoto.storageKey, 600)).url
    : null;
  const pendingProposal = property.photoProposals[0];
  const proposedPhotoUrl = pendingProposal
    ? (await storage.getSignedDownloadUrl(pendingProposal.proposedStorageKey, 600)).url
    : null;
  const canMaintain = hasPermission(session.user.permissions, PERMISSIONS.MAINTENANCE_WRITE);
  const canDocs = hasPermission(session.user.permissions, PERMISSIONS.DOCUMENTS_WRITE);
  const canNotes = hasPermission(session.user.permissions, PERMISSIONS.NOTES_WRITE);
  const canReminders = hasPermission(session.user.permissions, PERMISSIONS.REMINDERS_WRITE);
  const canDelete = hasPermission(session.user.permissions, PERMISSIONS.PROPERTIES_DELETE);

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/properties" label="Back to Properties" />

      {query.created ? (
        <Alert tone="success" title="Property saved">
          You can add more details any time using the sections below.
        </Alert>
      ) : null}
      {query.saved ? (
        <Alert tone="success" title="Changes saved">
          Your updates are ready.
        </Alert>
      ) : null}

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-4xl font-semibold md:text-5xl">{property.nickname}</h1>
              {property.isSampleData ? <Badge tone="info">Sample data</Badge> : null}
            </div>
            <p className="mt-2 text-xl">
              {property.streetAddress}, {property.city}, {property.state} {property.zipCode}
            </p>
            <p className="mt-2 text-lg text-[var(--muted-foreground)]">
              {propertyTypeLabel(property.propertyType)} · Owned by{" "}
              {property.ownershipEntity?.name || "Not set"}
              {ownerNames.length ? ` · ${ownerNames.join(", ")}` : ""}
            </p>
            <p className="mt-3 text-lg">
              Est. value {formatCurrency(valuation?.estimatedValue?.toString())}
              {valuation?.isEstimated ? "*" : ""} · Monthly rent{" "}
              {formatCurrency(property.monthlyRent?.toString())} · Assessed{" "}
              {formatCurrency(tax?.assessedValue?.toString())} · Taxes{" "}
              {formatCurrency(tax?.annualTax?.toString())}/yr
            </p>
            <p className="mt-1 text-lg">
              Lease:{" "}
              {property.leaseLengthMonths
                ? `${property.leaseLengthMonths} months`
                : "Length not set"}{" "}
              · Expires {formatDate(property.leaseExpiresAt)} · Manager:{" "}
              {manager?.name || "Not assigned"} · Last updated {formatDate(property.updatedAt)}
            </p>
            <p className="mt-1 text-base text-[var(--muted-foreground)]">
              Last data refresh: {formatDate(property.lastDataRefreshAt)}
              {property.lastDataRefreshSource ? ` · ${property.lastDataRefreshSource}` : ""}
              {" · "}
              Last photo update: {formatDate(property.lastPhotoRefreshAt)}
            </p>
            {property.reminders[0] ? (
              <p className="mt-3">
                <Badge tone={property.reminders[0].status === "OVERDUE" ? "danger" : "warning"}>
                  Upcoming: {property.reminders[0].title}
                </Badge>
              </p>
            ) : null}
            {valuation?.isEstimated ? (
              <p className="mt-2 text-base text-[var(--muted-foreground)]">
                * Estimated value — not a guaranteed appraisal.
              </p>
            ) : null}
          </div>
          <div className="w-full max-w-xs md:w-64">
            {currentPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentPhotoUrl}
                alt={`Exterior photo of ${property.nickname}`}
                className="h-40 w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-[var(--muted)] text-center text-base font-semibold text-[var(--muted-foreground)]">
                Property photo not added yet
              </div>
            )}
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {property.photoSource
                ? `Photo source: ${property.photoSource}`
                : "No public photo source on file"}
            </p>
          </div>
        </div>

        {canEdit ? (
          <div className="mt-6">
            <RefreshPropertyDataButton propertyId={property.id} />
          </div>
        ) : null}

        {pendingProposal && proposedPhotoUrl ? (
          <div className="mt-6">
            <PhotoProposalPanel
              proposal={{
                id: pendingProposal.id,
                proposedSource: pendingProposal.proposedSource,
                proposedRetrievedAt: pendingProposal.proposedRetrievedAt.toISOString(),
                proposedImageUrl: proposedPhotoUrl,
              }}
              currentImageUrl={currentPhotoUrl}
            />
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {canEdit ? (
            <Button asChild variant="secondary">
              <Link href={`/properties/${property.id}/edit`}>Edit Property</Link>
            </Button>
          ) : null}
          {canMaintain ? (
            <Button asChild>
              <Link href={`/properties/${property.id}/maintenance/new`}>Add Maintenance Record</Link>
            </Button>
          ) : null}
          {canDocs ? (
            <Button asChild variant="secondary">
              <Link href={`/documents/upload?propertyId=${property.id}`}>Upload Document</Link>
            </Button>
          ) : null}
          {canReminders ? (
            <Button asChild variant="secondary">
              <Link href={`/reminders/new?propertyId=${property.id}`}>Add Reminder</Link>
            </Button>
          ) : null}
          <Button asChild>
            <Link href={`/properties/${property.id}/contact-manager`}>Contact Property Manager</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/properties/${property.id}?tab=emails`}>View Emails</Link>
          </Button>
          {canNotes ? (
            <Button asChild variant="outline">
              <Link href={`/properties/${property.id}?tab=notes`}>Add Note</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Property sections">
        {TABS.map((item) => {
          const active = tab === item;
          return (
            <Link
              key={item}
              href={`/properties/${property.id}?tab=${item}`}
              className={`min-h-12 rounded-xl px-4 py-3 text-lg font-semibold capitalize transition-colors duration-150 ${
                active
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item === "notes" ? "Notes and History" : item}
            </Link>
          );
        })}
      </div>

      {tab === "overview" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <InfoPanel title="Summary">
            <ul className="space-y-2 text-lg">
              <li>Purchase price: {formatCurrency(property.purchasePrice?.toString())}</li>
              <li>Date acquired: {formatDate(property.dateAcquired)}</li>
              <li>Current monthly rent: {formatCurrency(property.monthlyRent?.toString())}</li>
              <li>
                Lease length:{" "}
                {property.leaseLengthMonths
                  ? `${property.leaseLengthMonths} months`
                  : "Not set"}
              </li>
              <li>Lease expiration: {formatDate(property.leaseExpiresAt)}</li>
              <li>
                Ownership entity: {property.ownershipEntity?.name || "Not set"}
                {property.ownershipEntity?.entityType
                  ? ` (${property.ownershipEntity.entityType})`
                  : ""}
              </li>
              <li>
                Owner(s):{" "}
                {ownerNames.length
                  ? property.owners
                      .map((owner) =>
                        owner.ownershipPercent
                          ? `${owner.name} (${owner.ownershipPercent.toString()}%)`
                          : owner.name,
                      )
                      .join(", ")
                  : "Not set"}
              </li>
              <li>
                Beds / baths: {property.bedrooms ?? "Not set"} /{" "}
                {property.bathrooms?.toString() ?? "Not set"}
              </li>
              <li>
                Living area:{" "}
                {property.squareFootage
                  ? `${property.squareFootage.toLocaleString()} sq ft`
                  : "Not set"}
              </li>
              <li>
                Lot size:{" "}
                {property.lotSizeSqFt
                  ? `${property.lotSizeSqFt.toLocaleString()} sq ft`
                  : "Not set"}
              </li>
              <li>Year built: {property.yearBuilt ?? "Not set"}</li>
              <li>
                Insurance status:{" "}
                {property.insurancePolicies[0]?.status.replaceAll("_", " ") ||
                  "Missing information"}
              </li>
              <li>Mortgage status: {property.mortgages[0]?.status || "Not set"}</li>
              <li>Last photo update: {formatDate(property.lastPhotoRefreshAt)}</li>
            </ul>
          </InfoPanel>
          <InfoPanel title="Upcoming deadlines">
            {property.reminders.length === 0 ? (
              <p className="text-lg">No upcoming deadlines.</p>
            ) : (
              <ul className="space-y-2 text-lg">
                {property.reminders.map((r) => (
                  <li key={r.id}>
                    {r.title} · {formatDate(r.dueDate)}
                  </li>
                ))}
              </ul>
            )}
          </InfoPanel>
          <InfoPanel title="Recent maintenance">
            {property.maintenanceRecords.slice(0, 3).map((m) => (
              <p key={m.id} className="text-lg">
                {m.description} · {formatDate(m.completedAt)}
              </p>
            ))}
          </InfoPanel>
          <InfoPanel title="Recent documents">
            {property.documents.slice(0, 3).map((d) => (
              <p key={d.id} className="text-lg">
                {d.name}
              </p>
            ))}
          </InfoPanel>
          <InfoPanel title="Public sale history">
            {property.saleHistory.length === 0 ? (
              <p className="text-lg">No public sale history on file yet.</p>
            ) : (
              <ul className="space-y-2 text-lg">
                {property.saleHistory.map((sale) => (
                  <li key={sale.id}>
                    {formatDate(sale.saleDate)} · {formatCurrency(sale.salePrice?.toString())}
                    {sale.buyerSeller ? ` · ${sale.buyerSeller}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </InfoPanel>
        </section>
      ) : null}

      {tab === "financials" ? (
        <section className="space-y-4">
          <InfoPanel title="Rent and lease">
            <ul className="space-y-2 text-lg">
              <li>Current monthly rent: {formatCurrency(property.monthlyRent?.toString())}</li>
              <li>
                Lease length:{" "}
                {property.leaseLengthMonths
                  ? `${property.leaseLengthMonths} months`
                  : "Not set"}
              </li>
              <li>Lease expiration: {formatDate(property.leaseExpiresAt)}</li>
            </ul>
          </InfoPanel>
          <InfoPanel title="Valuation">
            <p className="text-lg">
              Current estimate: {formatCurrency(valuation?.estimatedValue?.toString())}
            </p>
            <p className="text-base text-[var(--muted-foreground)]">
              Source: {valuation?.source || "Not set"} · Updated{" "}
              {formatDate(valuation?.sourceUpdatedAt || valuation?.createdAt)} ·{" "}
              {valuation?.isEstimated ? "Estimated" : "Exact"} ·{" "}
              {valuation?.isManualOverride ? "Manual override (kept on refresh)" : "From source"}
            </p>
            <p className="mt-2 text-base text-[var(--muted-foreground)]">
              Last portfolio data refresh: {formatDate(property.lastDataRefreshAt)}
              {property.lastDataRefreshSource ? ` · ${property.lastDataRefreshSource}` : ""}
            </p>
            {canEdit ? <ValuationOverrideForm propertyId={property.id} /> : null}
          </InfoPanel>
          <InfoPanel title="Taxes">
            <ul className="space-y-2 text-lg">
              <li>Assessed value: {formatCurrency(tax?.assessedValue?.toString())}</li>
              <li>Annual tax: {formatCurrency(tax?.annualTax?.toString())}</li>
              <li>Authority: {tax?.authority || "Not set"}</li>
              <li>Parcel number: {tax?.parcelNumber || "Not set"}</li>
              <li>
                Source: {tax?.source || "manual"} · Updated {formatDate(tax?.sourceUpdatedAt)}
              </li>
            </ul>
          </InfoPanel>
          <InfoPanel title="QuickBooks summary (read-only)">
            {property.accountingMappings.length === 0 ? (
              <p className="text-lg">
                No QuickBooks mapping yet. An administrator can connect and map this property in
                Settings.
              </p>
            ) : (
              <ul className="space-y-2 text-lg">
                {property.financialTransactions.map((txn) => (
                  <li key={txn.id}>
                    {formatDate(txn.txnDate)} · {txn.memo || txn.category} ·{" "}
                    {formatCurrency(txn.amount.toString())}
                    {!txn.matched ? " · Unmatched" : ""}
                  </li>
                ))}
              </ul>
            )}
          </InfoPanel>
        </section>
      ) : null}

      {tab === "maintenance" ? (
        <section className="space-y-4">
          {canMaintain ? (
            <Button asChild>
              <Link href={`/properties/${property.id}/maintenance/new`}>Add Maintenance Record</Link>
            </Button>
          ) : null}
          <div className="space-y-3">
            {property.maintenanceRecords.map((record) => (
              <article key={record.id} className="rounded-2xl border border-[var(--border)] bg-white p-5">
                <p className="text-xl font-semibold">{record.description}</p>
                <p className="mt-1 text-lg text-[var(--muted-foreground)]">
                  {record.category.replaceAll("_", " ")} · {record.workType.toLowerCase()} ·{" "}
                  {formatDate(record.completedAt)}
                </p>
                <p className="mt-1 text-lg">
                  Cost: {formatCurrency(record.cost?.toString())} · Contractor:{" "}
                  {record.contractor?.name || "Not set"}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "insurance" ? (
        <section className="space-y-3">
          {property.insurancePolicies.length === 0 ? (
            <Alert tone="warning" title="Missing insurance information">
              Add a policy so renewal reminders can help your family stay covered.
            </Alert>
          ) : (
            property.insurancePolicies.map((policy) => (
              <article key={policy.id} className="rounded-2xl border border-[var(--border)] bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold">{policy.carrier || "Insurance policy"}</h2>
                  <Badge
                    tone={
                      policy.status === "ACTIVE"
                        ? "success"
                        : policy.status === "EXPIRED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {policy.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <p className="mt-2 text-lg">Policy #{policy.policyNumber || "Not set"}</p>
                <p className="text-lg">
                  Coverage {formatCurrency(policy.coverageAmount?.toString())} · Premium{" "}
                  {formatCurrency(policy.premium?.toString())}
                </p>
                <p className="text-lg">
                  Effective {formatDate(policy.effectiveDate)} · Renews{" "}
                  {formatDate(policy.renewalDate)}
                </p>
                <p className="text-lg">Agent: {policy.agentContact?.name || "Not set"}</p>
              </article>
            ))
          )}
        </section>
      ) : null}

      {tab === "documents" ? (
        <section className="space-y-3">
          {property.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white p-4"
            >
              <div>
                <p className="text-xl font-semibold">{doc.name}</p>
                <p className="text-base text-[var(--muted-foreground)]">
                  {doc.category.replaceAll("_", " ")} · Uploaded {formatDate(doc.createdAt)}
                </p>
              </div>
              <Button asChild variant="secondary" size="small">
                <Link href={`/documents`}>Open in Documents</Link>
              </Button>
            </div>
          ))}
        </section>
      ) : null}

      {tab === "emails" ? (
        <section className="space-y-3">
          <Alert tone="info" title="Email integration">
            Connect Gmail or Microsoft in Settings to match live emails. Sample threads may appear
            during development.
          </Alert>
          {property.emailThreads.map((thread) => (
            <article key={thread.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-xl font-semibold">{thread.subject}</p>
              <p className="text-lg text-[var(--muted-foreground)]">
                {thread.sender} · {formatDate(thread.receivedAt)} · {thread.category.replaceAll("_", " ")}
              </p>
              <p className="mt-2 text-lg">{thread.snippet}</p>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "contacts" ? (
        <section className="space-y-3">
          {property.owners.length ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <h2 className="text-2xl font-semibold">Owners</h2>
              <ul className="mt-3 space-y-3">
                {property.owners.map((owner) => (
                  <li key={owner.id} className="rounded-xl bg-white p-4 text-lg">
                    <p className="font-semibold">{owner.name}</p>
                    <p>
                      {owner.email || "No email"} · {owner.phone || "No phone"}
                      {owner.ownershipPercent
                        ? ` · ${owner.ownershipPercent.toString()}% ownership`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {property.contacts.map((item) => (
            <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-xl font-semibold">{item.contact.name}</p>
              <p className="text-lg">
                {item.role.replaceAll("_", " ")}
                {item.isEmergency ? " · Emergency contact" : ""}
              </p>
              <p className="text-lg">{item.contact.company}</p>
              <p className="text-lg">
                {item.contact.phone || "No phone"} · {item.contact.email || "No email"}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      {tab === "notes" ? (
        <section className="space-y-4">
          {canNotes ? <PropertyNotesForm propertyId={property.id} /> : null}
          {property.notes.map((note) => (
            <article key={note.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-base text-[var(--muted-foreground)]">
                {note.author.name} · {formatDate(note.createdAt)}
                {note.category ? ` · ${note.category}` : ""}
              </p>
              <p className="mt-2 text-lg whitespace-pre-wrap">{note.body}</p>
            </article>
          ))}
          {canDelete ? (
            <div className="pt-6">
              <ArchivePropertyButton propertyId={property.id} nickname={property.nickname} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
