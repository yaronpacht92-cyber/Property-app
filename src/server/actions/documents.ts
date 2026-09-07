"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { getFileStorage } from "@/adapters/storage";
import { enqueueMalwareScan } from "@/jobs/malware-scan";
import {
  isAllowedPropertyPhoto,
  MAX_PROPERTY_PHOTO_BYTES,
  normalizePropertyPhoto,
} from "@/lib/property-photo";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_BYTES = 15 * 1024 * 1024;

const metaSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.enum([
    "DEED",
    "CLOSING",
    "MORTGAGE",
    "INSURANCE",
    "PROPERTY_TAX",
    "LEASE",
    "INSPECTION",
    "APPRAISAL",
    "INVOICE",
    "RECEIPT",
    "WARRANTY",
    "CONTRACTOR_PROPOSAL",
    "PROPERTY_MANAGEMENT_AGREEMENT",
    "LEGAL",
    "ACCOUNTING",
    "PHOTO",
    "OTHER",
  ]),
  propertyId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function uploadDocumentAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.DOCUMENTS_WRITE);
  const parsed = metaSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    propertyId: formData.get("propertyId") || "",
    notes: formData.get("notes") || "",
    expiresAt: formData.get("expiresAt") || "",
  });
  if (!parsed.success) return { error: "Please complete the document details." };

  if (parsed.data.propertyId) {
    const property = await assertPropertyAccess(
      parsed.data.propertyId,
      session.user.organizationId,
      session.user.id,
      session.user.roleKey,
    );
    if (!property) return { error: "We could not find that property." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is too large. Please upload a file under 15 MB." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      error:
        "That file type is not allowed. Please upload a PDF, photo, or Word document.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getFileStorage();
  const stored = await storage.upload({
    organizationId: session.user.organizationId,
    fileName: file.name,
    mimeType: file.type,
    data: buffer,
  });

  const document = await prisma.document.create({
    data: {
      organizationId: session.user.organizationId,
      propertyId: parsed.data.propertyId || null,
      category: parsed.data.category,
      name: parsed.data.name,
      storageKey: stored.storageKey,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      notes: parsed.data.notes || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      uploadedById: session.user.id,
      scanStatus: "PENDING",
    },
  });

  await enqueueMalwareScan(document.id);

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "document.uploaded",
    entityType: "Document",
    entityId: document.id,
    summary: `Uploaded document ${document.name}`,
    metadata: { category: document.category },
  });

  revalidatePath("/documents");
  if (parsed.data.propertyId) {
    revalidatePath(`/properties/${parsed.data.propertyId}`);
  }
  redirect("/documents?uploaded=1");
}

/** Upload or replace the property profile photo from the photo area. */
export async function uploadPropertyPhotoAction(propertyId: string, formData: FormData) {
  const session = await requirePermission(PERMISSIONS.DOCUMENTS_WRITE);
  const property = await assertPropertyAccess(
    propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) return { error: "We could not find that property." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a photo to upload." };
  }
  if (file.size > MAX_PROPERTY_PHOTO_BYTES) {
    return { error: "That photo is too large. Please use a file under 10 MB." };
  }
  if (!isAllowedPropertyPhoto(file.type, file.name)) {
    return { error: "Please upload a JPG, JPEG, PNG, WebP, or HEIC photo." };
  }

  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const normalized = await normalizePropertyPhoto({
      data: raw,
      mimeType: file.type,
      fileName: file.name,
    });

    const storage = getFileStorage();
    const previous =
      property.photoDocumentId
        ? await prisma.document.findFirst({
            where: {
              id: property.photoDocumentId,
              organizationId: session.user.organizationId,
              deletedAt: null,
            },
          })
        : null;

    const stored = await storage.upload({
      organizationId: session.user.organizationId,
      fileName: normalized.fileName,
      mimeType: normalized.mimeType,
      data: normalized.data,
    });

    const document = await prisma.document.create({
      data: {
        organizationId: session.user.organizationId,
        propertyId,
        category: "PHOTO",
        name: `Property photo — ${property.nickname}`,
        storageKey: stored.storageKey,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        uploadedById: session.user.id,
        scanStatus: "PENDING",
        notes: "Uploaded from property photo area",
      },
    });

    await enqueueMalwareScan(document.id);

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        photoDocumentId: document.id,
        updatedById: session.user.id,
      },
    });

    if (previous) {
      await prisma.document.update({
        where: { id: previous.id },
        data: { deletedAt: new Date() },
      });
      await storage.delete(previous.storageKey).catch(() => undefined);
    }

    await writeAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      action: "property.photo_uploaded",
      entityType: "Property",
      entityId: propertyId,
      summary: `Updated photo for ${property.nickname}`,
      metadata: {
        documentId: document.id,
        storageKey: stored.storageKey,
        storageDriver: storage.name,
      },
    });

    revalidatePath(`/properties/${propertyId}`);
    revalidatePath("/properties");
    revalidatePath("/home");
    revalidatePath("/documents");
    return { success: "Property photo saved." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Photo upload failed. Please try again.",
    };
  }
}

export async function removePropertyPhotoAction(propertyId: string) {
  const session = await requirePermission(PERMISSIONS.DOCUMENTS_WRITE);
  const property = await assertPropertyAccess(
    propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) return { error: "We could not find that property." };
  if (!property.photoDocumentId) {
    return { error: "This property does not have a photo to remove." };
  }

  const document = await prisma.document.findFirst({
    where: {
      id: property.photoDocumentId,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  });

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      photoDocumentId: null,
      updatedById: session.user.id,
    },
  });

  if (document) {
    await prisma.document.update({
      where: { id: document.id },
      data: { deletedAt: new Date() },
    });
    const storage = getFileStorage();
    await storage.delete(document.storageKey).catch(() => undefined);
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "property.photo_removed",
    entityType: "Property",
    entityId: propertyId,
    summary: `Removed photo for ${property.nickname}`,
  });

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/home");
  revalidatePath("/documents");
  return { success: "Property photo removed." };
}

export async function archiveDocumentAction(documentId: string) {
  const session = await requirePermission(PERMISSIONS.DOCUMENTS_DELETE);
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  });
  if (!document) return { error: "We could not find that document." };

  await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "document.archived",
    entityType: "Document",
    entityId: documentId,
    summary: `Archived document ${document.name}`,
  });

  revalidatePath("/documents");
  return { success: "Document archived." };
}
