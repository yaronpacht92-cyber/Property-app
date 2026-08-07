"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HelpTip } from "@/components/ui/help-tip";
import { upsertPropertyManagerAction } from "@/server/actions/properties";

type ManagerValues = {
  name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
};

type Props = {
  propertyId: string;
  initial?: ManagerValues | null;
};

export function PropertyManagerForm({ propertyId, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(!initial?.name);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = Boolean(initial?.name);

  if (!open) {
    return (
      <div className="space-y-2">
        {message ? <p className="text-lg text-[var(--success)]">{message}</p> : null}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
        >
          {editing ? "Edit property manager" : "Add property manager"}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5"
      action={(formData) => {
        startTransition(async () => {
          const result = await upsertPropertyManagerAction(propertyId, formData);
          if (result?.error) {
            setError(result.error);
            setMessage(null);
            return;
          }
          setError(null);
          setMessage(result?.success || "Property manager saved.");
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">
          {editing ? "Edit property manager" : "Add property manager"}
        </h2>
        {editing ? (
          <Button type="button" variant="outline" size="small" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        ) : null}
      </div>
      <p className="text-base text-[var(--muted-foreground)]">
        This person becomes the main contact for the property and appears under Contact Property
        Manager.
      </p>

      <div className="space-y-2">
        <Label htmlFor="managerName">Manager name</Label>
        <Input
          id="managerName"
          name="name"
          required
          defaultValue={initial?.name || ""}
          placeholder="Example: Jordan Lee"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="managerCompany">Company (optional)</Label>
        <Input
          id="managerCompany"
          name="company"
          defaultValue={initial?.company || ""}
          placeholder="Example: Harbor Property Management"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="managerPhone">Phone</Label>
          <Input
            id="managerPhone"
            name="phone"
            defaultValue={initial?.phone || ""}
            placeholder="555-0100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="managerEmail">Email</Label>
          <Input
            id="managerEmail"
            name="email"
            type="email"
            defaultValue={initial?.email || ""}
            placeholder="manager@example.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center">
          <Label htmlFor="managerNotes">Notes / emergency instructions</Label>
          <HelpTip text="Short guidance for family members, such as after-hours instructions." />
        </div>
        <Textarea
          id="managerNotes"
          name="notes"
          defaultValue={initial?.notes || ""}
          placeholder="Call after hours for emergencies only."
        />
      </div>

      {error ? <p className="text-lg text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-lg text-[var(--success)]">{message}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : editing ? "Save property manager" : "Add property manager"}
      </Button>
    </form>
  );
}
