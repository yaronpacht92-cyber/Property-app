"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpTip } from "@/components/ui/help-tip";
import { saveInsurancePolicyAction } from "@/server/actions/properties";

type PolicyDraft = {
  id?: string;
  carrier: string;
  policyNumber: string;
  premium: string;
  coverageAmount: string;
  effectiveDate: string;
  renewalDate: string;
};

export function InsurancePolicyForm({
  propertyId,
  policy,
}: {
  propertyId: string;
  policy?: PolicyDraft | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(policy?.id);

  return (
    <form
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5"
      action={(formData) => {
        startTransition(async () => {
          const result = await saveInsurancePolicyAction(propertyId, formData);
          if (result?.error) {
            setError(result.error);
            setMessage(null);
          } else {
            setMessage(result?.success || "Saved.");
            setError(null);
          }
        });
      }}
    >
      <div>
        <h3 className="text-xl font-semibold">
          {isEdit ? "Update insurance policy" : "Add insurance policy"}
        </h3>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Annual premium feeds the Financials planning summary.
        </p>
      </div>
      {policy?.id ? <input type="hidden" name="policyId" value={policy.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`carrier-${policy?.id || "new"}`}>Carrier</Label>
          <Input
            id={`carrier-${policy?.id || "new"}`}
            name="carrier"
            defaultValue={policy?.carrier || ""}
            placeholder="State Farm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`policyNumber-${policy?.id || "new"}`}>Policy number</Label>
          <Input
            id={`policyNumber-${policy?.id || "new"}`}
            name="policyNumber"
            defaultValue={policy?.policyNumber || ""}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor={`premium-${policy?.id || "new"}`}>Annual premium</Label>
            <HelpTip text="Total yearly premium cost for this property." />
          </div>
          <Input
            id={`premium-${policy?.id || "new"}`}
            name="premium"
            defaultValue={policy?.premium || ""}
            inputMode="decimal"
            placeholder="2400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`coverage-${policy?.id || "new"}`}>Coverage amount (optional)</Label>
          <Input
            id={`coverage-${policy?.id || "new"}`}
            name="coverageAmount"
            defaultValue={policy?.coverageAmount || ""}
            inputMode="decimal"
            placeholder="500000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`effective-${policy?.id || "new"}`}>Effective date</Label>
          <Input
            id={`effective-${policy?.id || "new"}`}
            name="effectiveDate"
            type="date"
            defaultValue={policy?.effectiveDate || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`renewal-${policy?.id || "new"}`}>Renewal date</Label>
          <Input
            id={`renewal-${policy?.id || "new"}`}
            name="renewalDate"
            type="date"
            defaultValue={policy?.renewalDate || ""}
          />
        </div>
      </div>
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-[var(--success)]">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : isEdit ? "Save insurance changes" : "Save insurance policy"}
      </Button>
    </form>
  );
}
