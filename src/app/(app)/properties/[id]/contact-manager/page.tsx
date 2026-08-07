import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession, assertPropertyAccess } from "@/lib/session";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CopyEmailButton } from "@/components/properties/copy-email-button";

export default async function ContactManagerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
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
    include: {
      contacts: {
        where: { role: "PROPERTY_MANAGER" },
        include: { contact: true },
        take: 1,
      },
    },
  });
  if (!property) notFound();

  const manager = property.contacts[0]?.contact;
  if (!manager) {
    return (
      <div className="space-y-4">
        <BackLink href={`/properties/${id}`} label="Back to Property" />
        <Alert tone="warning" title="No property manager on file">
          Open the property Contacts tab to add or edit a property manager.
        </Alert>
        <Button asChild variant="secondary">
          <Link href={`/properties/${id}?tab=contacts`}>Go to Contacts</Link>
        </Button>
      </div>
    );
  }

  const subject = encodeURIComponent(`${property.nickname} — ${property.streetAddress}`);
  const mailto = manager.email
    ? `mailto:${manager.email}?subject=${subject}`
    : undefined;
  const tel = manager.phone ? `tel:${manager.phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <BackLink href={`/properties/${id}`} label="Back to Property" />
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <h1 className="text-4xl font-semibold">Contact Property Manager</h1>
        <p className="mt-4 text-2xl font-semibold">{manager.name}</p>
        <p className="text-xl">{manager.company || "Independent manager"}</p>
        <p className="mt-4 text-xl">{manager.phone || "No phone number on file"}</p>
        <p className="text-xl">{manager.email || "No email on file"}</p>
        <p className="mt-4 rounded-2xl bg-[var(--muted)] p-4 text-lg">
          Emergency contact instructions: {manager.notes || "Call the phone number above."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {tel ? (
            <Button asChild size="large">
              <a href={tel}>Call</a>
            </Button>
          ) : null}
          {mailto ? (
            <Button asChild size="large" variant="secondary">
              <a href={mailto}>Send Email</a>
            </Button>
          ) : null}
          {manager.email ? <CopyEmailButton email={manager.email} /> : null}
          <Button asChild variant="outline" size="large">
            <Link href={`/properties/${id}?tab=emails`}>View Related Emails</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
