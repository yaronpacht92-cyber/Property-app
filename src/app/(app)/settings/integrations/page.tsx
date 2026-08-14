import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { getAccountingAdapter } from "@/adapters/accounting";
import { getEmailAdapter } from "@/adapters/email";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AssignEmailThreadForm,
  ConnectDemoEmailButton,
  ConnectEmailButton,
  DisconnectEmailButton,
  SyncEmailButton,
} from "@/components/integrations/email-actions";
import {
  AssignQuickenTransactionForm,
  DisconnectQuickenButton,
  EnableQuickenButton,
  ImportQuickenFileForm,
  ImportSampleQuickenButton,
  QuickenMappingForm,
} from "@/components/integrations/quicken-actions";

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
  const orgId = session.user.organizationId;

  const [accounting, emailConnections, syncLogs, unmatchedThreads, unmatchedTxns, mappings, properties] =
    await Promise.all([
      prisma.accountingConnection.findFirst({
        where: { organizationId: orgId, provider: "QUICKEN" },
      }),
      prisma.emailConnection.findMany({
        where: { organizationId: orgId },
        orderBy: { provider: "asc" },
      }),
      prisma.integrationSyncLog.findMany({
        where: { organizationId: orgId },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
      prisma.emailThreadReference.findMany({
        where: { organizationId: orgId, propertyId: null },
        orderBy: { receivedAt: "desc" },
        take: 20,
      }),
      prisma.financialTransactionReference.findMany({
        where: { organizationId: orgId, matched: false },
        orderBy: { txnDate: "desc" },
        take: 20,
      }),
      prisma.accountingPropertyMapping.findMany({
        where: { connection: { organizationId: orgId } },
        include: { property: { select: { nickname: true } } },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.property.findMany({
        where: { organizationId: orgId, deletedAt: null },
        select: { id: true, nickname: true },
        orderBy: { nickname: "asc" },
      }),
    ]);

  const quicken = getAccountingAdapter();
  const gmailReady = getEmailAdapter("GMAIL").isConfigured();
  const microsoftReady = getEmailAdapter("MICROSOFT").isConfigured();
  const gmail = emailConnections.find((item) => item.provider === "GMAIL");
  const microsoft = emailConnections.find((item) => item.provider === "MICROSOFT");
  const showDemo = process.env.APP_ENV !== "production";
  const quickenConnected = accounting?.status === "CONNECTED";

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
        Property values, taxes, and details stay manual. Quicken and email are read-only — Pachtfolio
        never changes your Quicken file or sends mail.
      </Alert>

      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Quicken</h2>
          <Badge
            tone={
              quickenConnected ? "success" : accounting?.status === "ERROR" ? "danger" : "neutral"
            }
          >
            {(accounting?.status || "NOT_CONFIGURED").replaceAll("_", " ")}
          </Badge>
        </div>
        <p className="mt-3 text-lg leading-relaxed">
          Quicken does not offer a public cloud API, so Pachtfolio imports exported files instead
          (.ofx, .qfx, .qif, or .csv). Adapter: {quicken.name}. Last import:{" "}
          {formatDate(accounting?.lastSyncAt)}
          {accounting?.realmId ? ` · Source account: ${accounting.realmId}` : ""}.
        </p>
        {accounting?.lastError ? (
          <p className="mt-2 text-base text-[var(--danger)]">{accounting.lastError}</p>
        ) : null}

        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-4">
          <h3 className="text-xl font-semibold">How to export from Quicken</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-6 text-lg text-[var(--muted-foreground)]">
            <li>Open Quicken and choose the rental account (or all accounts).</li>
            <li>Export or save as OFX / QFX / QIF, or export a CSV register.</li>
            <li>Import the file here, then map accounts or categories to properties.</li>
          </ol>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {!quickenConnected ? <EnableQuickenButton /> : null}
          {quickenConnected && accounting ? (
            <>
              <DisconnectQuickenButton connectionId={accounting.id} />
            </>
          ) : null}
        </div>

        {quickenConnected && accounting ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <h3 className="text-xl font-semibold">Import Quicken file</h3>
              <p className="mt-1 text-base text-[var(--muted-foreground)]">
                Re-importing the same transactions is safe — duplicates are skipped by ID.
              </p>
              <div className="mt-3">
                <ImportQuickenFileForm connectionId={accounting.id} />
              </div>
              {showDemo ? (
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <ImportSampleQuickenButton connectionId={accounting.id} />
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <h3 className="text-xl font-semibold">Map to properties</h3>
              <p className="mt-1 text-base text-[var(--muted-foreground)]">
                Match a Quicken account name or category/tag to each property.
              </p>
              <QuickenMappingForm connectionId={accounting.id} properties={properties} />
              {mappings.length > 0 ? (
                <ul className="mt-4 space-y-2 text-base">
                  {mappings.map((mapping) => (
                    <li key={mapping.id}>
                      {mapping.property.nickname} ← {mapping.mappingType.toLowerCase()} “
                      {mapping.externalName || mapping.externalId}”
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-base text-[var(--muted-foreground)]">No mappings yet.</p>
              )}
            </div>
          </div>
        ) : showDemo ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-white p-4">
            <p className="text-lg font-semibold">Try a sample import</p>
            <p className="mt-1 text-base text-[var(--muted-foreground)]">
              Enables Quicken and loads a sample OFX file so you can see matching without exporting
              from Quicken yet.
            </p>
            <div className="mt-3">
              <ImportSampleQuickenButton />
            </div>
          </div>
        ) : null}
      </article>

      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-2xl font-semibold">Unmatched Quicken transactions</h2>
        <p className="mt-2 text-lg text-[var(--muted-foreground)]">
          Transactions that did not match a mapped account, category, nickname, or address.
        </p>
        {unmatchedTxns.length === 0 ? (
          <p className="mt-4 text-lg text-[var(--muted-foreground)]">
            No unmatched Quicken transactions right now.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {unmatchedTxns.map((txn) => (
              <li key={txn.id} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                <p className="text-xl font-semibold">
                  {formatCurrency(txn.amount.toString())} · {txn.memo || txn.category || "Transaction"}
                </p>
                <p className="text-lg text-[var(--muted-foreground)]">
                  {formatDate(txn.txnDate)}
                  {txn.category ? ` · ${txn.category}` : ""}
                </p>
                <AssignQuickenTransactionForm
                  transactionId={txn.id}
                  properties={properties}
                  currentPropertyId={txn.propertyId}
                />
              </li>
            ))}
          </ul>
        )}
      </article>

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
          tone={connected ? "success" : connection?.status === "ERROR" ? "danger" : "neutral"}
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
