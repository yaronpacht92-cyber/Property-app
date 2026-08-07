"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { archivePropertyAction } from "@/server/actions/properties";

export function ArchivePropertyButton({
  propertyId,
  nickname,
}: {
  propertyId: string;
  nickname: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
        Remove Property
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[var(--danger)] bg-[var(--danger-soft)] p-5">
      <p className="text-xl font-semibold">
        Are you sure you want to remove {nickname}?
      </p>
      <p className="mt-2 text-lg">
        Its information will be archived and can be restored by an administrator.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
          Keep Property
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await archivePropertyAction(propertyId);
            });
          }}
        >
          {pending ? "Removing..." : "Yes, Remove Property"}
        </Button>
      </div>
    </div>
  );
}
