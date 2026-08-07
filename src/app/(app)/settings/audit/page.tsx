import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { formatDate } from "@/lib/utils";

export default async function AuditPage() {
  const session = await requirePermission(PERMISSIONS.AUDIT_READ);
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: session.user.organizationId },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/settings" label="Back to Settings" />
      <h1 className="text-4xl font-semibold">Audit history</h1>
      <p className="text-xl text-[var(--muted-foreground)]">
        Important changes are recorded here. Financial amounts and secrets are never stored in this
        log.
      </p>
      <div className="space-y-3">
        {logs.map((log) => (
          <article
            key={log.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <p className="text-xl font-semibold">{log.summary}</p>
            <p className="text-lg text-[var(--muted-foreground)]">
              {log.actor?.name || "System"} · {formatDate(log.createdAt)} · {log.action}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
