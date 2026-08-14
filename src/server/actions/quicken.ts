"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import {
  ensureQuickenConnection,
  importQuickenFile,
  sampleQuickenOfx,
} from "@/services/quicken-import";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = [".ofx", ".qfx", ".qif", ".csv", ".txt"];

function revalidateQuickenPaths(propertyId?: string | null) {
  revalidatePath("/settings/integrations");
  revalidatePath("/home");
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
}

export async function enableQuickenAction(): Promise<{ success?: string; error?: string }> {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const connection = await ensureQuickenConnection(session.user.organizationId);

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "quicken.enabled",
    entityType: "AccountingConnection",
    entityId: connection.id,
    summary: "Enabled Quicken file import",
  });

  revalidateQuickenPaths();
  return { success: "Quicken is ready. Export from Quicken and import the file here." };
}

export async function disconnectQuickenAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const connectionId = String(formData.get("connectionId") || "");
  if (!z.string().uuid().safeParse(connectionId).success) {
    return { error: "Missing Quicken connection." };
  }

  const connection = await prisma.accountingConnection.findFirst({
    where: {
      id: connectionId,
      organizationId: session.user.organizationId,
      provider: "QUICKEN",
    },
  });
  if (!connection) return { error: "Quicken connection not found." };

  await prisma.accountingConnection.update({
    where: { id: connection.id },
    data: {
      status: "DISCONNECTED",
      lastError: null,
      tokenVaultRef: null,
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "quicken.disconnected",
    entityType: "AccountingConnection",
    entityId: connection.id,
    summary: "Disconnected Quicken import",
  });

  revalidateQuickenPaths();
  return { success: "Quicken disconnected." };
}

export async function importQuickenFileAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const connectionId = String(formData.get("connectionId") || "");
  if (!z.string().uuid().safeParse(connectionId).success) {
    return { error: "Enable Quicken before importing a file." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a Quicken export file (.ofx, .qfx, .qif, or .csv)." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is too large. Please keep Quicken exports under 5 MB." };
  }

  const filename = file.name || "quicken-export.ofx";
  const lower = filename.toLowerCase();
  if (!ALLOWED_EXT.some((ext) => lower.endsWith(ext))) {
    return { error: "Use a Quicken export: .ofx, .qfx, .qif, or .csv." };
  }

  try {
    const content = await file.text();
    const result = await importQuickenFile({
      organizationId: session.user.organizationId,
      connectionId,
      filename,
      content,
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      action: "quicken.imported",
      entityType: "AccountingConnection",
      entityId: connectionId,
      summary: `Imported ${result.processed} Quicken transactions from ${filename}`,
      metadata: {
        format: result.format,
        matched: result.matched,
        unmatched: result.unmatched,
      },
    });

    revalidateQuickenPaths();
    return {
      success: `Imported ${result.processed} transactions (${result.matched} matched, ${result.unmatched} unmatched).`,
    };
  } catch (error) {
    revalidateQuickenPaths();
    return {
      error: error instanceof Error ? error.message : "Quicken import failed.",
    };
  }
}

export async function importSampleQuickenAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  if (process.env.APP_ENV === "production") {
    return { error: "Sample Quicken import is only available outside production." };
  }

  let connectionId = String(formData.get("connectionId") || "");
  if (!z.string().uuid().safeParse(connectionId).success) {
    const connection = await ensureQuickenConnection(session.user.organizationId);
    connectionId = connection.id;
  }

  const properties = await prisma.property.findMany({
    where: { organizationId: session.user.organizationId, deletedAt: null },
    select: { nickname: true, streetAddress: true },
    take: 3,
  });

  try {
    const result = await importQuickenFile({
      organizationId: session.user.organizationId,
      connectionId,
      filename: "sample-quicken.ofx",
      content: sampleQuickenOfx(properties),
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      action: "quicken.sample_imported",
      entityType: "AccountingConnection",
      entityId: connectionId,
      summary: "Imported sample Quicken OFX file",
    });

    revalidateQuickenPaths();
    return {
      success: `Sample import complete: ${result.processed} transactions (${result.matched} matched, ${result.unmatched} unmatched).`,
    };
  } catch (error) {
    revalidateQuickenPaths();
    return {
      error: error instanceof Error ? error.message : "Sample Quicken import failed.",
    };
  }
}

export async function upsertQuickenPropertyMappingAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const parsed = z
    .object({
      connectionId: z.string().uuid(),
      propertyId: z.string().uuid(),
      mappingType: z.enum(["ACCOUNT", "CUSTOM"]),
      externalName: z.string().min(1).max(200),
    })
    .safeParse({
      connectionId: formData.get("connectionId"),
      propertyId: formData.get("propertyId"),
      mappingType: formData.get("mappingType") || "ACCOUNT",
      externalName: formData.get("externalName"),
    });

  if (!parsed.success) {
    return { error: "Enter a Quicken account or category name and choose a property." };
  }

  const access = await assertPropertyAccess(
    parsed.data.propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!access) return { error: "We could not find that property." };

  const connection = await prisma.accountingConnection.findFirst({
    where: {
      id: parsed.data.connectionId,
      organizationId: session.user.organizationId,
      provider: "QUICKEN",
    },
  });
  if (!connection) return { error: "Quicken connection not found." };

  const externalId = parsed.data.externalName.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 120);

  await prisma.accountingPropertyMapping.upsert({
    where: {
      propertyId_connectionId_mappingType: {
        propertyId: parsed.data.propertyId,
        connectionId: connection.id,
        mappingType: parsed.data.mappingType,
      },
    },
    create: {
      propertyId: parsed.data.propertyId,
      connectionId: connection.id,
      mappingType: parsed.data.mappingType,
      externalId,
      externalName: parsed.data.externalName.trim(),
    },
    update: {
      externalId,
      externalName: parsed.data.externalName.trim(),
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "quicken.mapping_saved",
    entityType: "AccountingPropertyMapping",
    entityId: parsed.data.propertyId,
    summary: `Mapped Quicken ${parsed.data.mappingType.toLowerCase()} “${parsed.data.externalName.trim()}” to ${access.nickname}`,
  });

  revalidateQuickenPaths(parsed.data.propertyId);
  return { success: "Quicken mapping saved." };
}

export async function assignQuickenTransactionAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.INTEGRATIONS_MANAGE);
  const parsed = z
    .object({
      transactionId: z.string().uuid(),
      propertyId: z.string().uuid().or(z.literal("")),
    })
    .safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) return { error: "Choose a property for this transaction." };

  const txn = await prisma.financialTransactionReference.findFirst({
    where: {
      id: parsed.data.transactionId,
      organizationId: session.user.organizationId,
    },
  });
  if (!txn) return { error: "Transaction not found." };

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

  await prisma.financialTransactionReference.update({
    where: { id: txn.id },
    data: {
      propertyId,
      matched: Boolean(propertyId),
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: propertyId ? "quicken.txn_assigned" : "quicken.txn_unassigned",
    entityType: "FinancialTransactionReference",
    entityId: txn.id,
    summary: propertyId
      ? `Assigned Quicken transaction to a property`
      : `Cleared property assignment for a Quicken transaction`,
  });

  revalidateQuickenPaths(propertyId || txn.propertyId);
  return { success: propertyId ? "Transaction assigned." : "Transaction unassigned." };
}
