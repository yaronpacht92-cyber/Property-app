import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { getAccountingAdapter } from "@/adapters/accounting";
import { getEmailAdapter } from "@/adapters/email";
import { formatDate } from "@/lib/utils";

export default async function IntegrationsPage() {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const [accounting, email, syncLogs] = await Promise.all([
    prisma.accountingConnection.findFirst({
      where: { organizationId: session.user.organizationId },
    }),
    prisma.emailConnection.findFirst({
      where: { organizationId: session.user.organizationId },
    }),
    prisma.integrationSyncLog.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  const qb = getAccountingAdapter();
  const mail = getEmailAdapter();

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/settings" label="Back to Settings" />
      <h1 className="text-4xl font-semibold">Integrations</h1>
      <Alert tone="info" title="Core Pachtfolio works without connections">
        Property values, taxes, and details are entered by hand. Live QuickBooks and email
        connections are not wired yet; sample stubs may appear until OAuth apps are built.
      </Alert>

      <IntegrationCard
        title="QuickBooks Online"
        status={accounting?.status || "NOT_CONFIGURED"}
        detail={`Adapter: ${qb.name}. Last sync: ${formatDate(accounting?.lastSyncAt)}. Mapping and read-only summaries are available after OAuth credentials are configured.`}
      />
      <IntegrationCard
        title="Email (Gmail / Microsoft)"
        status={email?.status || "NOT_CONFIGURED"}
        detail={`Adapter: ${mail.name}. Property matching uses addresses, nicknames, and keywords. Sending email from Pachtfolio is not enabled in version 1.`}
      />
      <IntegrationCard
        title="Property details"
        status="CONNECTED"
        detail="Manual entry only. Enter estimated value, assessed value, taxes, beds, baths, square footage, lot size, and year built on each property. Pachtfolio does not scrape websites or pull third-party property feeds."
      />

      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-2xl font-semibold">Sync history</h2>
        {syncLogs.length === 0 ? (
          <p className="mt-3 text-lg text-[var(--muted-foreground)]">No syncs yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-lg">
            {syncLogs.map((log) => (
              <li key={log.id}>
                {log.connectionType} · {log.status} · {formatDate(log.startedAt)} ·{" "}
                {log.message || "No message"}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function IntegrationCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: string;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Badge tone={status === "CONNECTED" ? "success" : status === "ERROR" ? "danger" : "neutral"}>
          {status.replaceAll("_", " ")}
        </Badge>
      </div>
      <p className="mt-3 text-lg leading-relaxed">{detail}</p>
      <p className="mt-4 text-base text-[var(--muted-foreground)]">
        Reconnect and manual sync buttons appear here once OAuth apps are configured in the
        environment.
      </p>
    </article>
  );
}
