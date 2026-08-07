"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, assertPropertyAccess } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  propertyId: z.string().uuid(),
  category: z.enum([
    "PLUMBING",
    "ELECTRICAL",
    "HVAC",
    "ROOF",
    "APPLIANCES",
    "LANDSCAPING",
    "INTERIOR",
    "EXTERIOR",
    "SAFETY",
    "OTHER",
  ]),
  workType: z.enum(["ROUTINE", "REPAIR", "CAPITAL"]),
  description: z.string().min(3).max(2000),
  completedAt: z.string().min(1),
  cost: z.string().optional(),
  contractorName: z.string().optional(),
  warrantyExpiresAt: z.string().optional(),
  nextServiceAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function createMaintenanceAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.MAINTENANCE_WRITE);
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: "Please complete the maintenance details and try again." };
  }

  const data = parsed.data;
  const property = await assertPropertyAccess(
    data.propertyId,
    session.user.organizationId,
    session.user.id,
    session.user.roleKey,
  );
  if (!property) return { error: "We could not find that property." };

  let contractorId: string | undefined;
  if (data.contractorName) {
    const contractor = await prisma.contractor.create({
      data: {
        organizationId: session.user.organizationId,
        name: data.contractorName,
      },
    });
    contractorId = contractor.id;
  }

  const record = await prisma.maintenanceRecord.create({
    data: {
      propertyId: data.propertyId,
      category: data.category,
      workType: data.workType,
      description: data.description,
      completedAt: new Date(data.completedAt),
      cost: data.cost ? Number(data.cost.replace(/[$,]/g, "")) : null,
      warrantyExpiresAt: data.warrantyExpiresAt ? new Date(data.warrantyExpiresAt) : null,
      nextServiceAt: data.nextServiceAt ? new Date(data.nextServiceAt) : null,
      notes: data.notes || null,
      contractorId,
      createdById: session.user.id,
    },
  });

  if (data.nextServiceAt) {
    await prisma.reminder.create({
      data: {
        organizationId: session.user.organizationId,
        propertyId: data.propertyId,
        type: "ROUTINE_MAINTENANCE",
        title: `Maintenance follow-up — ${property.nickname}`,
        description: data.description,
        dueDate: new Date(data.nextServiceAt),
        status: "UPCOMING",
        assignedToId: session.user.id,
      },
    });
  }

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "maintenance.created",
    entityType: "MaintenanceRecord",
    entityId: record.id,
    summary: `Recorded maintenance for ${property.nickname}`,
  });

  revalidatePath(`/properties/${data.propertyId}`);
  revalidatePath("/reminders");
  redirect(`/properties/${data.propertyId}?tab=maintenance&saved=1`);
}
