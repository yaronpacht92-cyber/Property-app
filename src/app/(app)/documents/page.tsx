import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import { getFileStorage } from "@/adapters/storage";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; q?: string; category?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const canWrite = hasPermission(session.user.permissions, PERMISSIONS.DOCUMENTS_WRITE);

  const documents = await prisma.document.findMany({
    where: {
      organizationId: session.user.organizationId,
      deletedAt: null,
      ...(params.category ? { category: params.category as never } : {}),
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: "insensitive" } },
              { notes: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { property: true, uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });

  let storage: ReturnType<typeof getFileStorage> | null = null;
  try {
    storage = getFileStorage();
  } catch {
    storage = null;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/home" label="Back to Home" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold md:text-5xl">Documents</h1>
          <p className="mt-2 text-xl text-[var(--muted-foreground)]">
            Find deeds, insurance policies, tax bills, and more.
          </p>
        </div>
        {canWrite ? (
          <Button asChild size="large">
            <Link href="/documents/upload">Upload Document</Link>
          </Button>
        ) : null}
      </div>

      {params.uploaded ? (
        <Alert tone="success" title="Document uploaded">
          It is being checked for safety and will appear below.
        </Alert>
      ) : null}

      <form className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 md:flex-row">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search by file name or notes"
          className="min-h-14 flex-1 rounded-xl border-2 border-[var(--border-strong)] px-4 text-lg"
        />
        <Button type="submit">Search Documents</Button>
      </form>

      <div className="space-y-3">
        {documents.length === 0 ? (
          <Alert tone="info" title="No documents found">
            Upload a document or adjust your search.
          </Alert>
        ) : !storage ? (
          <Alert tone="warning" title="Downloads unavailable">
            Cloud file storage is not configured yet. Document names still appear below.
          </Alert>
        ) : null}
        {documents.length > 0
          ? await Promise.all(
              documents.map(async (doc) => {
                const signed = storage
                  ? await storage.getSignedDownloadUrl(doc.storageKey, 300)
                  : null;
                return (
                  <article
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
                  >
                    <div>
                      <p className="text-xl font-semibold">{doc.name}</p>
                      <p className="text-lg text-[var(--muted-foreground)]">
                        {doc.property?.nickname || "Whole portfolio"} ·{" "}
                        {doc.category.replaceAll("_", " ")} · {formatDate(doc.createdAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="neutral">Uploaded by {doc.uploadedBy?.name || "Unknown"}</Badge>
                        <Badge
                          tone={
                            doc.scanStatus === "INFECTED"
                              ? "danger"
                              : doc.scanStatus === "CLEAN" || doc.scanStatus === "SKIPPED"
                                ? "success"
                                : "warning"
                          }
                        >
                          Security check: {doc.scanStatus.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                    {signed ? (
                      <Button asChild variant="secondary">
                        <a href={signed.url}>Secure Download</a>
                      </Button>
                    ) : null}
                  </article>
                );
              }),
            )
          : null}
      </div>
    </div>
  );
}
