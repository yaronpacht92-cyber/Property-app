"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { refreshPropertyPublicData } from "@/server/services/property-data-refresh";
import { getFileStorage } from "@/adapters/storage";

export async function refreshPropertyDataAction(propertyId: string) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const property = await assertPropertyAccess(
    propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) {
    return { error: "We could not find that property." };
  }

  const result = await refreshPropertyPublicData({
    propertyId,
    organizationId: session.user.organizationId,
    trigger: "manual",
    actorUserId: session.user.id,
    overwriteManualOverrides: false,
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "property.data_refreshed",
    entityType: "Property",
    entityId: propertyId,
    summary: `Refreshed public data for ${property.nickname}`,
    metadata: { status: result.status, fields: result.fieldsUpdated.length },
  });

  revalidatePath(`/properties/${propertyId}`);
  return {
    success: result.message,
    fieldsUpdated: result.fieldsUpdated,
    refreshedAt: result.refreshedAt.toISOString(),
    source: result.source,
    photoProposalId: result.photoProposalId,
    status: result.status,
  };
}

export async function resolvePhotoProposalAction(
  proposalId: string,
  decision: "keep" | "replace" | "save_both",
) {
  const session = await requirePermission(PERMISSIONS.PROPERTIES_WRITE);
  const proposal = await prisma.propertyPhotoProposal.findFirst({
    where: { id: proposalId, status: "PENDING" },
    include: { property: true },
  });
  if (!proposal || proposal.property.organizationId !== session.user.organizationId) {
    return { error: "We could not find that photo update." };
  }

  const access = await assertPropertyAccess(
    proposal.propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!access) return { error: "You do not have permission to update this property." };

  if (decision === "keep") {
    await prisma.propertyPhotoProposal.update({
      where: { id: proposalId },
      data: {
        status: "REJECTED",
        resolvedAt: new Date(),
        resolvedById: session.user.id,
      },
    });
    await writeAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      action: "property.photo_proposal_kept",
      entityType: "PropertyPhotoProposal",
      entityId: proposalId,
      summary: `Kept current photo for ${proposal.property.nickname}`,
    });
    revalidatePath(`/properties/${proposal.propertyId}`);
    return { success: "Current photo kept." };
  }

  const document = await prisma.document.create({
    data: {
      organizationId: session.user.organizationId,
      propertyId: proposal.propertyId,
      category: "PHOTO",
      name:
        decision === "save_both"
          ? `Additional exterior photo — ${proposal.property.nickname}`
          : `Exterior photo — ${proposal.property.nickname}`,
      storageKey: proposal.proposedStorageKey,
      mimeType: proposal.proposedMimeType,
      sizeBytes: 0,
      uploadedById: session.user.id,
      scanStatus: "SKIPPED",
      notes: `Retrieved from ${proposal.proposedSource} on ${proposal.proposedRetrievedAt.toISOString()}`,
    },
  });

  if (decision === "replace") {
    await prisma.property.update({
      where: { id: proposal.propertyId },
      data: {
        photoDocumentId: document.id,
        photoSource: proposal.proposedSource,
        lastPhotoRefreshAt: proposal.proposedRetrievedAt,
      },
    });
  } else {
    // Save both: keep current as primary, store new as document; optionally could swap —
    // requirement says save both, keep displaying current unless replaced.
    await prisma.property.update({
      where: { id: proposal.propertyId },
      data: {
        lastPhotoRefreshAt: proposal.proposedRetrievedAt,
      },
    });
  }

  await prisma.propertyPhotoProposal.update({
    where: { id: proposalId },
    data: {
      status: decision === "replace" ? "ACCEPTED" : "SAVED_BOTH",
      resolvedAt: new Date(),
      resolvedById: session.user.id,
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action:
      decision === "replace"
        ? "property.photo_proposal_replaced"
        : "property.photo_proposal_saved_both",
    entityType: "PropertyPhotoProposal",
    entityId: proposalId,
    summary:
      decision === "replace"
        ? `Replaced photo for ${proposal.property.nickname}`
        : `Saved new photo alongside current for ${proposal.property.nickname}`,
  });

  revalidatePath(`/properties/${proposal.propertyId}`);
  return {
    success:
      decision === "replace"
        ? "Property photo updated."
        : "New photo saved. Your current photo is still the main photo.",
  };
}

export async function getSignedPhotoUrl(storageKey: string) {
  const storage = getFileStorage();
  return storage.getSignedDownloadUrl(storageKey, 600);
}
