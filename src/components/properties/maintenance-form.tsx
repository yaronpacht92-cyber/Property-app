"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMaintenanceAction } from "@/server/actions/maintenance";

export function MaintenanceForm({
  propertyId,
  categories,
}: {
  propertyId: string;
  categories: string[];
}) {
  const [category, setCategory] = useState(categories[0] || "OTHER");
  const [workType, setWorkType] = useState("REPAIR");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
      action={(formData) => {
        formData.set("propertyId", propertyId);
        formData.set("category", category);
        formData.set("workType", workType);
        startTransition(async () => {
          const result = await createMaintenanceAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Work category</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`min-h-14 rounded-xl px-4 text-lg font-semibold ${
                category === item ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"
              }`}
            >
              {item.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Type of work</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ["ROUTINE", "Routine maintenance"],
            ["REPAIR", "Repair"],
            ["CAPITAL", "Capital improvement"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setWorkType(value)}
              className={`min-h-14 rounded-xl px-4 text-lg font-semibold ${
                workType === value ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          required
          placeholder="Example: Water heater replaced"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="completedAt">Date completed</Label>
          <Input id="completedAt" name="completedAt" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Cost</Label>
          <Input id="cost" name="cost" placeholder="Optional" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contractorName">Contractor or service provider</Label>
        <Input id="contractorName" name="contractorName" placeholder="Optional" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="warrantyExpiresAt">Warranty expiration date</Label>
          <Input id="warrantyExpiresAt" name="warrantyExpiresAt" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nextServiceAt">Next recommended service date</Label>
          <Input id="nextServiceAt" name="nextServiceAt" type="date" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Optional" />
      </div>
      {error ? <p className="text-lg text-[var(--danger)]">{error}</p> : null}
      <Button type="submit" size="large" disabled={pending}>
        {pending ? "Saving..." : "Save Maintenance Record"}
      </Button>
    </form>
  );
}
