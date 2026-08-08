import type { EmailCategory, EmailProvider } from "@prisma/client";
import { getDemoEmailAdapter, getEmailAdapter } from "@/adapters/email";
import { prisma } from "@/lib/db";
import { openTokens, sealTokens, tokensNeedRefresh } from "@/lib/token-vault";
import { matchEmailToProperty, type PropertyMatchInput } from "@/services/email-match";

const EMAIL_CATEGORIES = new Set<string>([
  "PROPERTY_MANAGER",
  "INSURANCE",
  "TAXES",
  "MAINTENANCE",
  "TENANT",
  "LEGAL",
  "ACCOUNTING",
  "VENDOR",
  "OTHER",
]);

function asCategory(value: string): EmailCategory {
  return (EMAIL_CATEGORIES.has(value) ? value : "OTHER") as EmailCategory;
}

async function loadMatchProperties(organizationId: string): Promise<PropertyMatchInput[]> {
  const properties = await prisma.property.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      nickname: true,
      streetAddress: true,
      city: true,
      zipCode: true,
      taxRecords: { select: { parcelNumber: true }, take: 5, orderBy: { createdAt: "desc" } },
      contacts: {
        where: { role: "PROPERTY_MANAGER" },
        select: { contact: { select: { email: true } } },
      },
    },
  });

  return properties.map((property) => ({
    id: property.id,
    nickname: property.nickname,
    streetAddress: property.streetAddress,
    city: property.city,
    zipCode: property.zipCode,
    parcelNumbers: property.taxRecords
      .map((record) => record.parcelNumber)
      .filter((value): value is string => Boolean(value)),
    managerEmails: property.contacts
      .map((link) => link.contact.email)
      .filter((value): value is string => Boolean(value)),
  }));
}

async function ensureAccessToken(connectionId: string, provider: EmailProvider) {
  const connection = await prisma.emailConnection.findUniqueOrThrow({ where: { id: connectionId } });
  if (!connection.tokenVaultRef) {
    throw new Error("Email connection has no stored tokens. Please reconnect.");
  }

  const stored = openTokens(connection.tokenVaultRef);
  if (stored.demo) {
    return { accessToken: stored.accessToken, demo: true as const };
  }

  if (!tokensNeedRefresh(stored)) {
    return { accessToken: stored.accessToken, demo: false as const };
  }

  const adapter = getEmailAdapter(provider);
  const refreshed = await adapter.refreshAccessToken(stored.refreshToken);
  const next = sealTokens({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope,
  });
  await prisma.emailConnection.update({
    where: { id: connectionId },
    data: { tokenVaultRef: next, lastError: null },
  });
  return { accessToken: refreshed.accessToken, demo: false as const };
}

export type EmailSyncResult = {
  processed: number;
  matched: number;
  unmatched: number;
  connectionId: string;
};

export async function syncEmailConnection(options: {
  organizationId: string;
  connectionId: string;
  actorUserId?: string;
}): Promise<EmailSyncResult> {
  const connection = await prisma.emailConnection.findFirst({
    where: {
      id: options.connectionId,
      organizationId: options.organizationId,
    },
  });
  if (!connection) {
    throw new Error("Email connection not found.");
  }
  if (connection.status !== "CONNECTED") {
    throw new Error("Connect an email account before syncing.");
  }

  const startedAt = new Date();
  const log = await prisma.integrationSyncLog.create({
    data: {
      organizationId: options.organizationId,
      connectionType: `EMAIL_${connection.provider}`,
      connectionId: connection.id,
      status: "RUNNING",
      startedAt,
    },
  });

  try {
    const token = await ensureAccessToken(connection.id, connection.provider);
    const adapter = token.demo ? getDemoEmailAdapter() : getEmailAdapter(connection.provider);
    const emails = await adapter.listRecentEmails(token.accessToken, { maxResults: 40 });
    const properties = await loadMatchProperties(options.organizationId);

    let matched = 0;
    let unmatched = 0;

    for (const email of emails) {
      const existing = await prisma.emailThreadReference.findUnique({
        where: {
          connectionId_externalThreadId: {
            connectionId: connection.id,
            externalThreadId: email.externalThreadId,
          },
        },
      });

      const match = matchEmailToProperty(email, properties);
      if (match.propertyId) matched += 1;
      else unmatched += 1;

      // Preserve manual assignment if the user already assigned a property.
      const propertyId =
        existing?.matchMethod === "manual" && existing.propertyId
          ? existing.propertyId
          : match.propertyId;
      const matchMethod =
        existing?.matchMethod === "manual" && existing.propertyId
          ? "manual"
          : match.matchMethod || (match.ambiguous ? "ambiguous" : null);

      await prisma.emailThreadReference.upsert({
        where: {
          connectionId_externalThreadId: {
            connectionId: connection.id,
            externalThreadId: email.externalThreadId,
          },
        },
        create: {
          organizationId: options.organizationId,
          connectionId: connection.id,
          externalThreadId: email.externalThreadId,
          subject: email.subject,
          snippet: email.snippet,
          sender: email.sender,
          receivedAt: email.receivedAt,
          category: asCategory(email.category),
          propertyId,
          matchMethod,
          providerUrl: email.providerUrl,
          hasAttachment: email.hasAttachment,
          isImportant: Boolean(match.propertyId),
        },
        update: {
          subject: email.subject,
          snippet: email.snippet,
          sender: email.sender,
          receivedAt: email.receivedAt,
          category: asCategory(email.category),
          propertyId,
          matchMethod,
          providerUrl: email.providerUrl,
          hasAttachment: email.hasAttachment,
        },
      });
    }

    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastError: null,
        status: "CONNECTED",
      },
    });

    await prisma.integrationSyncLog.update({
      where: { id: log.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        recordsProcessed: emails.length,
        message: `Synced ${emails.length} threads (${matched} matched, ${unmatched} unmatched).`,
      },
    });

    return {
      processed: emails.length,
      matched,
      unmatched,
      connectionId: connection.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email sync failed.";
    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastError: message.slice(0, 500) },
    });
    await prisma.integrationSyncLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        message: message.slice(0, 500),
      },
    });
    throw error;
  }
}
