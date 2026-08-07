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
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--danger)] underline-offset-2 transition-colors hover:bg-[var(--danger-soft)] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]"
      >
        Remove property
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4">
      <p className="text-lg font-semibold">Remove {nickname}?</p>
      <p className="mt-1 text-base text-[var(--muted-foreground)]">
        This archives it so it leaves your active list. An administrator can restore it later if
        needed.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="small"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          Keep
        </Button>
        <Button
          type="button"
          variant="danger"
          size="small"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await archivePropertyAction(propertyId);
            });
          }}
        >
          {pending ? "Removing..." : "Yes, remove"}
        </Button>
      </div>
    </div>
  );
}
