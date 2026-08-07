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
