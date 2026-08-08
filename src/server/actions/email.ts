"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getEmailAdapter } from "@/adapters/email";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createOAuthState } from "@/lib/oauth-state";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { sealTokens } from "@/lib/token-vault";
import { syncEmailConnection } from "@/services/email-sync";

function revalidateEmailPaths(propertyId?: string | null) {
  revalidatePath("/settings/integrations");
  revalidatePath("/home");
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
}

export async function startEmailConnectAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const provider = String(formData.get("provider") || "");
  if (provider !== "GMAIL" && provider !== "MICROSOFT") {
    return { error: "Choose Gmail or Microsoft." };
  }

  const adapter = getEmailAdapter(provider);
  if (!adapter.isConfigured()) {
    return {
      error:
        provider === "GMAIL"
          ? "Gmail is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
          : "Microsoft is not configured. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.",
    };
  }

  const state = createOAuthState({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    provider,
  });
  redirect(adapter.getAuthorizeUrl(state));
}

export async function connectDemoEmailAction() {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  if (process.env.APP_ENV === "production") {
    return { error: "Demo mailbox is only available outside production." };
  }

  const vaultRef = sealTokens({
    accessToken: "demo-access",
    refreshToken: "demo-refresh",
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
    scope: "demo",
    demo: true,
  });

  const existing = await prisma.emailConnection.findFirst({
    where: { organizationId: session.user.organizationId, provider: "GMAIL" },
  });

  const connection = existing
    ? await prisma.emailConnection.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          accountEmail: "demo@pachtfolio.local",
          tokenVaultRef: vaultRef,
          lastError: null,
        },
      })
    : await prisma.emailConnection.create({
        data: {
          organizationId: session.user.organizationId,
          provider: "GMAIL",
          status: "CONNECTED",
          accountEmail: "demo@pachtfolio.local",
          tokenVaultRef: vaultRef,
          lastError: null,
        },
      });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "email.demo_connected",
    entityType: "EmailConnection",
    entityId: connection.id,
    summary: "Connected demo mailbox for local testing",
  });

  await syncEmailConnection({
    organizationId: session.user.organizationId,
    connectionId: connection.id,
    actorUserId: session.user.id,
  });

  // Attach demo threads to real properties so the Emails tab is useful immediately.
  const properties = await prisma.property.findMany({
    where: { organizationId: session.user.organizationId, deletedAt: null },
    select: { id: true, nickname: true, streetAddress: true },
    take: 3,
  });
  const threads = await prisma.emailThreadReference.findMany({
    where: { connectionId: connection.id },
    orderBy: { receivedAt: "desc" },
    take: properties.length,
  });
  for (let i = 0; i < Math.min(properties.length, threads.length); i += 1) {
    const property = properties[i];
    const thread = threads[i];
    await prisma.emailThreadReference.update({
      where: { id: thread.id },
      data: {
        propertyId: property.id,
        matchMethod: "nickname",
        subject: `${thread.subject} — ${property.nickname}`,
        snippet: `${thread.snippet || ""} (${property.streetAddress})`,
        isImportant: true,
      },
    });
  }

  revalidateEmailPaths();
  return { success: "Demo mailbox connected and synced." };
}

export async function disconnectEmailAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const connectionId = String(formData.get("connectionId") || "");
  if (!z.string().uuid().safeParse(connectionId).success) {
    return { error: "Missing email connection." };
  }

  const connection = await prisma.emailConnection.findFirst({
    where: { id: connectionId, organizationId: session.user.organizationId },
  });
  if (!connection) return { error: "Email connection not found." };

  await prisma.emailConnection.update({
    where: { id: connection.id },
    data: {
      status: "DISCONNECTED",
      tokenVaultRef: null,
      lastError: null,
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "email.disconnected",
    entityType: "EmailConnection",
    entityId: connection.id,
    summary: `Disconnected ${connection.provider} mailbox`,
  });

  revalidateEmailPaths();
  return { success: "Email disconnected." };
}

export async function syncEmailAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const connectionId = String(formData.get("connectionId") || "");
  if (!z.string().uuid().safeParse(connectionId).success) {
    return { error: "Missing email connection." };
  }

  try {
    const result = await syncEmailConnection({
      organizationId: session.user.organizationId,
      connectionId,
      actorUserId: session.user.id,
    });
    await writeAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      action: "email.synced",
      entityType: "EmailConnection",
      entityId: connectionId,
      summary: `Synced ${result.processed} email threads`,
      metadata: { matched: result.matched, unmatched: result.unmatched },
    });
    revalidateEmailPaths();
    return {
      success: `Synced ${result.processed} threads (${result.matched} matched, ${result.unmatched} unmatched).`,
    };
  } catch (error) {
    revalidateEmailPaths();
    return {
      error: error instanceof Error ? error.message : "Email sync failed.",
    };
  }
}

export async function assignEmailThreadAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const parsed = z
    .object({
      threadId: z.string().uuid(),
      propertyId: z.string().uuid().or(z.literal("")),
    })
    .safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) return { error: "Choose a property for this email." };

  const thread = await prisma.emailThreadReference.findFirst({
    where: {
      id: parsed.data.threadId,
      organizationId: session.user.organizationId,
    },
  });
  if (!thread) return { error: "Email thread not found." };

  const propertyId = parsed.data.propertyId || null;
  if (propertyId) {
    const access = await assertPropertyAccess(
      propertyId,
      session.user.organizationId,
      session.user.id,
      session.user.roleKey,
    );
    if (!access) return { error: "We could not find that property." };
  }

  await prisma.emailThreadReference.update({
    where: { id: thread.id },
    data: {
      propertyId,
      matchMethod: propertyId ? "manual" : null,
      isImportant: Boolean(propertyId),
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: propertyId ? "email.assigned" : "email.unassigned",
    entityType: "EmailThreadReference",
    entityId: thread.id,
    summary: propertyId
      ? `Manually assigned email “${thread.subject}” to a property`
      : `Cleared property assignment for email “${thread.subject}”`,
  });

  revalidateEmailPaths(propertyId || thread.propertyId);
  return { success: propertyId ? "Email assigned to property." : "Email unassigned." };
}
