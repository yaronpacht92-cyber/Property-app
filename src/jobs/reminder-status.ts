import { prisma } from "@/lib/db";

/** Idempotent job: refresh reminder status buckets based on due dates. */
export async function refreshReminderStatuses(organizationId?: string) {
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const where = {
    deletedAt: null,
    status: { in: ["UPCOMING", "DUE_SOON", "OVERDUE"] as Array<"UPCOMING" | "DUE_SOON" | "OVERDUE"> },
    ...(organizationId ? { organizationId } : {}),
  };

  const reminders = await prisma.reminder.findMany({ where });
  for (const reminder of reminders) {
    let status = reminder.status;
    if (reminder.dueDate < now) status = "OVERDUE";
    else if (reminder.dueDate <= soon) status = "DUE_SOON";
    else status = "UPCOMING";

    if (status !== reminder.status) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status },
      });
    }
  }

  return { processed: reminders.length };
}
