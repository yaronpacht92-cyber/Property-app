"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { overrideValuationAction } from "@/server/actions/properties";

export function ValuationOverrideForm({ propertyId }: { propertyId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-4 space-y-3 rounded-xl bg-[var(--muted)] p-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await overrideValuationAction(propertyId, formData);
          if (result?.error) {
            setError(result.error);
            setMessage(null);
          } else {
            setMessage(result?.success || "Updated.");
            setError(null);
          }
        });
      }}
    >
      <p className="text-lg font-semibold">Manually correct estimated value</p>
      <div className="space-y-2">
        <Label htmlFor="estimatedValue">New estimated value</Label>
        <Input id="estimatedValue" name="estimatedValue" required placeholder="485000" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Why are you changing it? (optional)</Label>
        <Input id="notes" name="notes" placeholder="Recent appraisal, market change, etc." />
      </div>
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-[var(--success)]">{message}</p> : null}
      <Button type="submit" disabled={pending} size="small">
        {pending ? "Saving..." : "Save estimated value"}
      </Button>
    </form>
  );
}
