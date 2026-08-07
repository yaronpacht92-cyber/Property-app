"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { resolvePhotoProposalAction } from "@/server/actions/property-refresh";
import { formatDate } from "@/lib/utils";

type Props = {
  proposal: {
    id: string;
    proposedSource: string;
    proposedRetrievedAt: string;
    proposedImageUrl: string;
  };
  currentImageUrl: string | null;
};

export function PhotoProposalPanel({ proposal, currentImageUrl }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  if (resolved) {
    return message ? (
      <p className="rounded-2xl bg-[var(--success-soft)] px-4 py-3 text-lg text-[var(--success)]">
        {message}
      </p>
    ) : null;
  }

  function choose(decision: "keep" | "replace" | "save_both") {
    setError(null);
    startTransition(async () => {
      const result = await resolvePhotoProposalAction(proposal.id, decision);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.success || "Photo choice saved.");
      setResolved(true);
    });
  }

  return (
    <div className="rounded-3xl border-2 border-[var(--info)] bg-[var(--info-soft)] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-semibold">New exterior photo available</h2>
        <Badge tone="info">Proposed update</Badge>
      </div>
      <p className="mt-2 text-lg">
        A newer public photo was found. Your current photo was not changed. Choose what to do.
      </p>
      <p className="mt-1 text-base text-[var(--muted-foreground)]">
        Source: {proposal.proposedSource} · Retrieved {formatDate(proposal.proposedRetrievedAt)}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <figure className="rounded-2xl bg-white p-3">
          <figcaption className="mb-2 text-lg font-semibold">Current photo</figcaption>
          {currentImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImageUrl}
              alt="Current property exterior"
              className="h-48 w-full rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl bg-[var(--muted)] text-base">
              No current photo
            </div>
          )}
        </figure>
        <figure className="rounded-2xl bg-white p-3">
          <figcaption className="mb-2 text-lg font-semibold">Proposed new photo</figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proposal.proposedImageUrl}
            alt="Proposed property exterior from public data provider"
            className="h-48 w-full rounded-xl object-cover"
          />
        </figure>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={pending} onClick={() => choose("keep")}>
          Keep Current Photo
        </Button>
        <Button type="button" disabled={pending} onClick={() => choose("replace")}>
          Replace with New Photo
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => choose("save_both")}>
          Save Both
        </Button>
      </div>
      {pending ? (
        <p className="mt-3 text-lg" role="status">
          Saving your photo choice...
        </p>
      ) : null}
      {error ? <p className="mt-3 text-lg text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
