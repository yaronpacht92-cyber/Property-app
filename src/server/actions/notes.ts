"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  propertyId: z.string().uuid(),
  body: z.string().min(2).max(5000),
  category: z.string().optional(),
});

export async function createNoteAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.NOTES_WRITE);
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please enter a note before saving." };

  const property = await assertPropertyAccess(
    parsed.data.propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) return { error: "We could not find that property." };

  const note = await prisma.note.create({
    data: {
      propertyId: parsed.data.propertyId,
      authorId: session.user.id,
      body: parsed.data.body,
      category: parsed.data.category || null,
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "note.created",
    entityType: "Note",
    entityId: note.id,
    summary: `Added note on ${property.nickname}`,
  });

  revalidatePath(`/properties/${parsed.data.propertyId}`);
  return { success: "Note saved." };
}
