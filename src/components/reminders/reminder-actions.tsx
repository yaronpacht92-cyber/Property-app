"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  completeReminderAction,
  dismissReminderAction,
} from "@/server/actions/reminders";

export function ReminderActions({ reminderId }: { reminderId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="small"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await completeReminderAction(reminderId);
          })
        }
      >
        Mark Complete
      </Button>
      <Button
        type="button"
        size="small"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await dismissReminderAction(reminderId);
          })
        }
      >
        Dismiss
      </Button>
    </div>
  );
}
