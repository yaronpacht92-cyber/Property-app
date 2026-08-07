"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createNoteAction } from "@/server/actions/notes";

export function PropertyNotesForm({ propertyId }: { propertyId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 rounded-2xl border border-[var(--border)] bg-white p-5"
      action={(formData) => {
        startTransition(async () => {
          formData.set("propertyId", propertyId);
          const result = await createNoteAction(formData);
          if (result?.error) {
            setError(result.error);
            setMessage(null);
          } else {
            setMessage(result?.success || "Note saved.");
            setError(null);
          }
        });
      }}
    >
      <h2 className="text-2xl font-semibold">Add a note</h2>
      <div className="space-y-2">
        <Label htmlFor="category">Category (optional)</Label>
        <Input id="category" name="category" placeholder="General" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Note</Label>
        <Textarea id="body" name="body" required placeholder="Write a short note for the family..." />
      </div>
      {error ? <p className="text-lg text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-lg text-[var(--success)]">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Note"}
      </Button>
    </form>
  );
}
