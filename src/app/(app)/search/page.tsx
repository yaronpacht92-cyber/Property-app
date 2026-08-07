import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession, getPropertyAccessFilter } from "@/lib/session";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q = "" } = await searchParams;
  const term = q.trim();
  const propertyFilter = await getPropertyAccessFilter(
    session.user.id,
    session.user.organizationId,
    session.user.roleKey,
  );

  if (!term) {
    return (
      <div className="space-y-4">
        <BackLink href="/home" label="Back to Home" />
        <h1 className="text-4xl font-semibold">Search</h1>
        <p className="text-xl">Type something to search for on the Home page.</p>
      </div>
    );
  }

  const [properties, documents, notes, reminders, contacts] = await Promise.all([
    prisma.property.findMany({
      where: {
        ...propertyFilter,
        OR: [
          { nickname: { contains: term, mode: "insensitive" } },
          { streetAddress: { contains: term, mode: "insensitive" } },
          { city: { contains: term, mode: "insensitive" } },
          { zipCode: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
    prisma.document.findMany({
      where: {
        organizationId: session.user.organizationId,
        deletedAt: null,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { notes: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
    prisma.note.findMany({
      where: {
        deletedAt: null,
        body: { contains: term, mode: "insensitive" },
        property: propertyFilter,
      },
      include: { property: true },
      take: 10,
    }),
    prisma.reminder.findMany({
      where: {
        organizationId: session.user.organizationId,
        deletedAt: null,
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
    prisma.contact.findMany({
      where: {
        organizationId: session.user.organizationId,
        deletedAt: null,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { company: { contains: term, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/home" label="Back to Home" />
      <h1 className="text-4xl font-semibold">Search results</h1>
      <p className="text-xl text-[var(--muted-foreground)]">Showing matches for “{term}”</p>

      <ResultGroup title="Properties">
        {properties.map((p) => (
          <ResultLink key={p.id} href={`/properties/${p.id}`} label={p.nickname} detail={p.streetAddress} />
        ))}
      </ResultGroup>
      <ResultGroup title="Documents">
        {documents.map((d) => (
          <ResultLink key={d.id} href="/documents" label={d.name} detail={d.category} />
        ))}
      </ResultGroup>
      <ResultGroup title="Notes">
        {notes.map((n) => (
          <ResultLink
            key={n.id}
            href={`/properties/${n.propertyId}?tab=notes`}
            label={n.property.nickname}
            detail={n.body.slice(0, 80)}
          />
        ))}
      </ResultGroup>
      <ResultGroup title="Reminders">
        {reminders.map((r) => (
          <ResultLink key={r.id} href="/reminders" label={r.title} detail={r.description || ""} />
        ))}
      </ResultGroup>
      <ResultGroup title="Contacts">
        {contacts.map((c) => (
          <ResultLink key={c.id} href="/properties" label={c.name} detail={c.company || c.email || ""} />
        ))}
      </ResultGroup>

      <Button asChild variant="outline">
        <Link href="/home">Back to Home</Link>
      </Button>
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-2">
        {Array.isArray(children) && children.length === 0 ? (
          <p className="text-lg text-[var(--muted-foreground)]">No matches</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function ResultLink({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <Link href={href} className="block rounded-xl bg-white px-4 py-3 hover:bg-[var(--muted)]">
      <p className="text-lg font-semibold">{label}</p>
      <p className="text-base text-[var(--muted-foreground)]">{detail}</p>
    </Link>
  );
}
