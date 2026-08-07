"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, requireSession } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { redirect } from "next/navigation";

export async function completeReminderAction(reminderId: string) {
  const session = await requirePermission(PERMISSIONS.REMINDERS_WRITE);
  const reminder = await prisma.reminder.findFirst({
    where: {
      id: reminderId,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  });
  if (!reminder) return { error: "We could not find that reminder." };

  await prisma.reminder.update({
    where: { id: reminderId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "reminder.completed",
    entityType: "Reminder",
    entityId: reminderId,
    summary: `Completed reminder: ${reminder.title}`,
  });

  revalidatePath("/reminders");
  revalidatePath("/home");
  return { success: "Reminder marked complete." };
}

export async function dismissReminderAction(reminderId: string) {
  const session = await requirePermission(PERMISSIONS.REMINDERS_WRITE);
  const reminder = await prisma.reminder.findFirst({
    where: {
      id: reminderId,
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
  });
  if (!reminder) return { error: "We could not find that reminder." };

  await prisma.reminder.update({
    where: { id: reminderId },
    data: { status: "DISMISSED" },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "reminder.dismissed",
    entityType: "Reminder",
    entityId: reminderId,
    summary: `Dismissed reminder: ${reminder.title}`,
  });

  revalidatePath("/reminders");
  revalidatePath("/home");
  return { success: "Reminder dismissed." };
}

const createSchema = z.object({
  propertyId: z.string().uuid().optional().or(z.literal("")),
  type: z.enum([
    "INSURANCE_RENEWAL",
    "PROPERTY_TAX",
    "LEASE_EXPIRATION",
    "LOAN_MATURITY",
    "INSPECTION",
    "ROUTINE_MAINTENANCE",
    "WARRANTY_EXPIRATION",
    "CONTRACTOR_FOLLOW_UP",
    "LICENSE_RENEWAL",
    "CUSTOM",
  ]),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  dueDate: z.string().min(1),
});

export async function createReminderAction(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.REMINDERS_WRITE);
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please complete the reminder details." };

  const dueDate = new Date(parsed.data.dueDate);
  const days = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const status = days < 0 ? "OVERDUE" : days <= 30 ? "DUE_SOON" : "UPCOMING";

  const reminder = await prisma.reminder.create({
    data: {
      organizationId: session.user.organizationId,
      propertyId: parsed.data.propertyId || null,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueDate,
      status,
      assignedToId: session.user.id,
    },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "reminder.created",
    entityType: "Reminder",
    entityId: reminder.id,
    summary: `Created reminder: ${reminder.title}`,
  });

  revalidatePath("/reminders");
  revalidatePath("/home");
  redirect("/reminders?created=1");
}

export async function ensureSession() {
  return requireSession();
}
