import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import { ReminderActions } from "@/components/reminders/reminder-actions";

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const reminders = await prisma.reminder.findMany({
    where: {
      organizationId: session.user.organizationId,
      deletedAt: null,
    },
    include: { property: true, assignedTo: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const canWrite = hasPermission(session.user.permissions, PERMISSIONS.REMINDERS_WRITE);
  const attention = reminders.filter((r) => ["OVERDUE", "DUE_SOON"].includes(r.status));
  const upcoming = reminders.filter((r) => r.status === "UPCOMING");
  const done = reminders.filter((r) => ["COMPLETED", "DISMISSED"].includes(r.status));

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/home" label="Back to Home" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold md:text-5xl">Reminders</h1>
          <p className="mt-2 text-xl text-[var(--muted-foreground)]">
            Deadlines and follow-ups for your properties.
          </p>
        </div>
        {canWrite ? (
          <Button asChild size="large">
            <Link href="/reminders/new">Add Reminder</Link>
          </Button>
        ) : null}
      </div>

      {params.created ? (
        <Alert tone="success" title="Reminder added">
          It will appear in Needs Attention when the due date is close.
        </Alert>
      ) : null}

      <ReminderGroup title="Needs attention" items={attention} canWrite={canWrite} />
      <ReminderGroup title="Upcoming" items={upcoming} canWrite={canWrite} />
      <ReminderGroup title="Completed or dismissed" items={done} canWrite={false} />
    </div>
  );
}

function ReminderGroup({
  title,
  items,
  canWrite,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: Date;
    status: string;
    property: { nickname: string } | null;
  }>;
  canWrite: boolean;
}) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-3xl font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.length === 0 ? (
          <li className="text-lg text-[var(--muted-foreground)]">None right now.</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4"
            >
              <div>
                <p className="text-xl font-semibold">{item.title}</p>
                <p className="text-lg text-[var(--muted-foreground)]">
                  {item.property?.nickname || "General"} · Due {formatDate(item.dueDate)}
                </p>
                {item.description ? <p className="mt-1 text-lg">{item.description}</p> : null}
                <Badge
                  className="mt-2"
                  tone={
                    item.status === "OVERDUE"
                      ? "danger"
                      : item.status === "DUE_SOON"
                        ? "warning"
                        : item.status === "COMPLETED"
                          ? "success"
                          : "neutral"
                  }
                >
                  {item.status.replaceAll("_", " ")}
                </Badge>
              </div>
              {canWrite ? <ReminderActions reminderId={item.id} /> : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
