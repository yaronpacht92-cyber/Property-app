import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { getAccountingAdapter } from "@/adapters/accounting";
import { getEmailAdapter } from "@/adapters/email";
import { formatDate } from "@/lib/utils";
import {
  AssignEmailThreadForm,
  ConnectDemoEmailButton,
  ConnectEmailButton,
  DisconnectEmailButton,
  SyncEmailButton,
} from "@/components/integrations/email-actions";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    emailConnected?: string;
    emailError?: string;
    connectionId?: string;
  }>;
}) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const query = await searchParams;

  const [accounting, emailConnections, syncLogs, unmatchedThreads, properties] = await Promise.all([
    prisma.accountingConnection.findFirst({
      where: { organizationId: session.user.organizationId },
    }),
    prisma.emailConnection.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { provider: "asc" },
    }),
    prisma.integrationSyncLog.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
    prisma.emailThreadReference.findMany({
      where: {
        organizationId: session.user.organizationId,
        propertyId: null,
      },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
    prisma.property.findMany({
      where: { organizationId: session.user.organizationId, deletedAt: null },
      select: { id: true, nickname: true },
      orderBy: { nickname: "asc" },
    }),
  ]);

  const qb = getAccountingAdapter();
  const gmailReady = getEmailAdapter("GMAIL").isConfigured();
  const microsoftReady = getEmailAdapter("MICROSOFT").isConfigured();
  const gmail = emailConnections.find((item) => item.provider === "GMAIL");
  const microsoft = emailConnections.find((item) => item.provider === "MICROSOFT");
  const showDemo = process.env.APP_ENV !== "production";

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/settings" label="Back to Settings" />
      <h1 className="text-4xl font-semibold">Integrations</h1>

      {query.emailConnected ? (
        <Alert tone="success" title="Email connected">
          {query.emailConnected === "microsoft" ? "Microsoft" : "Gmail"} is connected. Use Sync now
          to pull recent threads and match them to properties.
        </Alert>
      ) : null}
      {query.emailError ? (
        <Alert tone="danger" title="Email connection failed">
          {query.emailError}
        </Alert>
      ) : null}

      <Alert tone="info" title="Core Pachtfolio works without connections">
        Property values, taxes, and details stay manual. Email is read-only in version 1 — Pachtfolio
        never sends mail from your account.
      </Alert>

      <IntegrationCard
        title="QuickBooks Online"
        status={accounting?.status || "NOT_CONFIGURED"}
        detail={`Adapter: ${qb.name}. Last sync: ${formatDate(accounting?.lastSyncAt)}. Mapping and read-only summaries are available after OAuth credentials are configured.`}
      />

      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Email (Gmail / Microsoft)</h2>
          <Badge
            tone={
              emailConnections.some((c) => c.status === "CONNECTED")
                ? "success"
                : emailConnections.some((c) => c.status === "ERROR")
                  ? "danger"
                  : "neutral"
            }
          >
            {emailConnections.some((c) => c.status === "CONNECTED")
              ? "CONNECTED"
              : "NOT CONFIGURED"}
          </Badge>
        </div>
        <p className="mt-3 text-lg leading-relaxed">
          Connect a mailbox to pull recent threads. Matching uses manager email, parcel number,
          street address, and nickname. Ambiguous or unmatched threads can be assigned by hand
          below.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ProviderPanel
            title="Gmail"
            connection={gmail}
            configured={gmailReady}
            connectLabel="Connect Gmail"
            provider="GMAIL"
          />
          <ProviderPanel
            title="Microsoft Outlook"
            connection={microsoft}
            configured={microsoftReady}
            connectLabel="Connect Microsoft"
            provider="MICROSOFT"
          />
        </div>

        {showDemo ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-white p-4">
            <p className="text-lg font-semibold">Local demo mailbox</p>
            <p className="mt-1 text-base text-[var(--muted-foreground)]">
              No Google/Microsoft app required. Connects a sample inbox and syncs demo threads onto
              your properties.
            </p>
            <div className="mt-3">
              <ConnectDemoEmailButton />
            </div>
          </div>
        ) : null}
      </article>

      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-2xl font-semibold">Unmatched emails</h2>
        <p className="mt-2 text-lg text-[var(--muted-foreground)]">
          Threads that could not be matched automatically. Assign them to a property when you
          recognize them.
        </p>
        {unmatchedThreads.length === 0 ? (
          <p className="mt-4 text-lg text-[var(--muted-foreground)]">No unmatched emails right now.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {unmatchedThreads.map((thread) => (
              <li key={thread.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                <p className="text-xl font-semibold">{thread.subject}</p>
                <p className="text-lg text-[var(--muted-foreground)]">
                  {thread.sender || "Unknown sender"} · {formatDate(thread.receivedAt)} ·{" "}
                  {thread.category.replaceAll("_", " ")}
                  {thread.matchMethod === "ambiguous" ? " · ambiguous match" : ""}
                </p>
                {thread.snippet ? <p className="mt-2 text-lg">{thread.snippet}</p> : null}
                {thread.providerUrl ? (
                  <a
                    href={thread.providerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-lg font-semibold text-[var(--primary)] underline"
                  >
                    Open in mailbox
                  </a>
                ) : null}
                <AssignEmailThreadForm threadId={thread.id} properties={properties} />
              </li>
            ))}
          </ul>
        )}
      </article>

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

function ProviderPanel({
  title,
  connection,
  configured,
  connectLabel,
  provider,
}: {
  title: string;
  connection:
    | {
        id: string;
        status: string;
        accountEmail: string | null;
        lastSyncAt: Date | null;
        lastError: string | null;
      }
    | undefined;
  configured: boolean;
  connectLabel: string;
  provider: "GMAIL" | "MICROSOFT";
}) {
  const connected = connection?.status === "CONNECTED";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <Badge
          tone={
            connected ? "success" : connection?.status === "ERROR" ? "danger" : "neutral"
          }
        >
          {(connection?.status || (configured ? "READY" : "NOT_CONFIGURED")).replaceAll("_", " ")}
        </Badge>
      </div>
      <p className="mt-2 text-base text-[var(--muted-foreground)]">
        {connection?.accountEmail
          ? `Account: ${connection.accountEmail}`
          : configured
            ? "OAuth app credentials are configured."
            : "Add OAuth credentials in the environment to enable Connect."}
      </p>
      <p className="mt-1 text-base text-[var(--muted-foreground)]">
        Last sync: {formatDate(connection?.lastSyncAt)}
      </p>
      {connection?.lastError ? (
        <p className="mt-2 text-base text-[var(--danger)]">{connection.lastError}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {!connected ? (
          <ConnectEmailButton provider={provider} label={connectLabel} disabled={!configured} />
        ) : (
          <>
            <SyncEmailButton connectionId={connection.id} />
            <DisconnectEmailButton connectionId={connection.id} />
          </>
        )}
      </div>
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
    </article>
  );
}
