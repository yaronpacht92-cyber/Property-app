"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HelpTip } from "@/components/ui/help-tip";
import { createPropertyAction } from "@/server/actions/properties";

const STEPS = [
  "Basic Information",
  "Property Contacts",
  "Financial and Tax",
  "Insurance",
  "Review",
];

const TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "VACANT_LAND", label: "Vacant Land" },
  { value: "OTHER", label: "Other" },
];

type Props = {
  ownershipEntities: { id: string; name: string }[];
};

export function AddPropertyWizard({ ownershipEntities }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    nickname: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "RESIDENTIAL",
    ownershipEntityId: "",
    dateAcquired: "",
    purchasePrice: "",
    managerName: "",
    managerCompany: "",
    managerPhone: "",
    managerEmail: "",
    estimatedValue: "",
    assessedValue: "",
    annualTaxes: "",
    taxJurisdiction: "",
    insuranceCarrier: "",
    insurancePolicyNumber: "",
    insuranceRenewalDate: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (step === 0) {
      if (!form.nickname || !form.streetAddress || !form.city || !form.state || !form.zipCode) {
        setError("Please fill in the property nickname and full address to continue.");
        return;
      }
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, value));
    startTransition(async () => {
      const result = await createPropertyAction(data);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
      <p className="text-lg font-semibold text-[var(--primary)]">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>
      <div className="mt-4 flex flex-wrap gap-2" aria-hidden="true">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`h-2 w-16 rounded-full ${index <= step ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border-2 border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-lg" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 space-y-5">
        {step === 0 ? (
          <>
            <Field label="Property nickname" tip="A short name your family uses, like Oak Street Rental.">
              <Input value={form.nickname} onChange={(e) => update("nickname", e.target.value)} />
            </Field>
            <Field label="Street address">
              <Input value={form.streetAddress} onChange={(e) => update("streetAddress", e.target.value)} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="City">
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
              </Field>
              <Field label="State">
                <Input
                  value={form.state}
                  maxLength={2}
                  onChange={(e) => update("state", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="ZIP code">
                <Input value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-lg font-semibold">Property type</legend>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => update("propertyType", type.value)}
                    className={`min-h-14 rounded-xl px-4 text-lg font-semibold ${
                      form.propertyType === type.value
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--muted)]"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Ownership entity" tip="The trust, LLC, or person that owns the property.">
              <select
                className="min-h-14 w-full rounded-xl border-2 border-[var(--border-strong)] bg-white px-4 text-lg"
                value={form.ownershipEntityId}
                onChange={(e) => update("ownershipEntityId", e.target.value)}
              >
                <option value="">Choose later</option>
                {ownershipEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Date acquired">
                <Input
                  type="date"
                  value={form.dateAcquired}
                  onChange={(e) => update("dateAcquired", e.target.value)}
                />
              </Field>
              <Field label="Purchase price">
                <Input
                  value={form.purchasePrice}
                  onChange={(e) => update("purchasePrice", e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field label="Property manager name">
              <Input value={form.managerName} onChange={(e) => update("managerName", e.target.value)} />
            </Field>
            <Field label="Property manager company">
              <Input
                value={form.managerCompany}
                onChange={(e) => update("managerCompany", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone">
                <Input value={form.managerPhone} onChange={(e) => update("managerPhone", e.target.value)} />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={form.managerEmail}
                  onChange={(e) => update("managerEmail", e.target.value)}
                />
              </Field>
            </div>
            <p className="text-lg text-[var(--muted-foreground)]">
              You can add insurance agents, attorneys, and other contacts after the property is saved.
            </p>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field
              label="Current estimated market value"
              tip="This is an estimate only. It is not a guaranteed appraisal."
            >
              <Input
                value={form.estimatedValue}
                onChange={(e) => update("estimatedValue", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Assessed value">
                <Input
                  value={form.assessedValue}
                  onChange={(e) => update("assessedValue", e.target.value)}
                />
              </Field>
              <Field label="Annual property taxes">
                <Input value={form.annualTaxes} onChange={(e) => update("annualTaxes", e.target.value)} />
              </Field>
            </div>
            <Field label="Tax jurisdiction">
              <Input
                value={form.taxJurisdiction}
                onChange={(e) => update("taxJurisdiction", e.target.value)}
              />
            </Field>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field label="Insurance carrier">
              <Input
                value={form.insuranceCarrier}
                onChange={(e) => update("insuranceCarrier", e.target.value)}
              />
            </Field>
            <Field label="Policy number">
              <Input
                value={form.insurancePolicyNumber}
                onChange={(e) => update("insurancePolicyNumber", e.target.value)}
              />
            </Field>
            <Field label="Renewal date">
              <Input
                type="date"
                value={form.insuranceRenewalDate}
                onChange={(e) => update("insuranceRenewalDate", e.target.value)}
              />
            </Field>
            <p className="text-lg text-[var(--muted-foreground)]">
              If you enter a renewal date, Homefolio can create helpful reminders before it is due.
            </p>
          </>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3 rounded-2xl bg-white p-5 text-lg">
            <h2 className="text-2xl font-semibold">Review before saving</h2>
            <p>
              <strong>{form.nickname || "Untitled property"}</strong>
            </p>
            <p>
              {form.streetAddress}, {form.city}, {form.state} {form.zipCode}
            </p>
            <p>Type: {TYPES.find((t) => t.value === form.propertyType)?.label}</p>
            <p>Manager: {form.managerName || "Not added yet"}</p>
            <p>Estimated value: {form.estimatedValue || "Not added yet"}</p>
            <p>Insurance: {form.insuranceCarrier || "Not added yet"}</p>
            <Textarea
              readOnly
              value="Optional sections can be completed later from the property page."
              className="bg-[var(--muted)]"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={back} disabled={step === 0 || pending}>
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <>
            <Button type="button" variant="secondary" onClick={next} disabled={pending}>
              Skip for now
            </Button>
            <Button type="button" onClick={next} disabled={pending}>
              Continue
            </Button>
          </>
        ) : (
          <Button type="button" onClick={submit} disabled={pending} size="large">
            {pending ? "Saving..." : "Save Property"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  tip,
  children,
}: {
  label: string;
  tip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <Label>{label}</Label>
        {tip ? <HelpTip text={tip} /> : null}
      </div>
      {children}
    </div>
  );
}
