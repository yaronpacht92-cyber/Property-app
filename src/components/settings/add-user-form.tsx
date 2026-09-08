"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addUserAction } from "@/server/actions/users";

export function AddUserForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
      action={(formData) => {
        startTransition(async () => {
          const result = await addUserAction(formData);
          if (result?.error) {
            setError(result.error);
            setMessage(null);
          } else {
            setMessage(result?.success || "User added.");
            setError(null);
          }
        });
      }}
    >
      <h2 className="text-2xl font-semibold">Add a person</h2>
      <p className="text-[var(--muted-foreground)]">
        Everyone you add can view and edit the full portfolio.
      </p>
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Temporary password</Label>
        <Input id="password" name="password" type="password" required minLength={12} />
      </div>
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-[var(--success)]">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Add User"}
      </Button>
    </form>
  );
}
