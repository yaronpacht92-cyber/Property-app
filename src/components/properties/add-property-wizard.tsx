"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HelpTip } from "@/components/ui/help-tip";
import { createPropertyAction } from "@/server/actions/properties";
import { PropertyDocumentImport } from "@/components/properties/property-document-import";
import type { ExtractedPropertyFields } from "@/lib/document-property-extract";

const STEPS = [
  "Basic Information",
  "Ownership",
  "Property Contacts",
  "Rent, Financial, and Tax",
  "Insurance",
  "Review",
];

const TYPES = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "VACANT_LAND", label: "Vacant Land" },
  { value: "OTHER", label: "Other" },
];

const ENTITY_TYPES = ["Trust", "LLC", "Corporation", "Partnership", "Individual", "Other"];

type OwnerDraft = {
  name: string;
  email: string;
  phone: string;
  ownershipPercent: string;
};

type Props = {
  ownershipEntities: { id: string; name: string; entityType: string | null }[];
};

export function AddPropertyWizard({ ownershipEntities }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [ownershipMode, setOwnershipMode] = useState<"existing" | "new" | "none">("existing");
  const [owners, setOwners] = useState<OwnerDraft[]>([
    { name: "", email: "", phone: "", ownershipPercent: "" },
  ]);
  const [form, setForm] = useState({
    nickname: "",
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "RESIDENTIAL",
    ownershipEntityId: ownershipEntities[0]?.id || "",
    newEntityName: "",
    newEntityType: "LLC",
    dateAcquired: "",
    purchasePrice: "",
    monthlyRent: "",
    leaseLengthMonths: "",
    leaseExpiresAt: "",
    monthlyManagementFee: "",
    otherMonthlyExpenses: "",
    managerName: "",
    managerCompany: "",
    managerPhone: "",
    managerEmail: "",
    estimatedValue: "",
    assessedValue: "",
    annualTaxes: "",
    taxJurisdiction: "",
    bedrooms: "",
    bathrooms: "",
    squareFootage: "",
    lotSizeSqFt: "",
    yearBuilt: "",
    insuranceCarrier: "",
    insurancePolicyNumber: "",
    insuranceRenewalDate: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyExtractedFields(fields: ExtractedPropertyFields) {
    setForm((prev) => {
      const next = { ...prev };
      (Object.keys(fields) as (keyof ExtractedPropertyFields)[]).forEach((key) => {
        const value = fields[key];
        if (value && key in next) {
          // Prefer document values for empty fields; overwrite only when still blank
          // except nickname/address/core financial fields which users expect to fill from the doc.
          const current = next[key as keyof typeof next];
          const preferOverwrite = [
            "streetAddress",
            "city",
            "state",
            "zipCode",
            "nickname",
            "purchasePrice",
            "estimatedValue",
            "assessedValue",
            "annualTaxes",
            "monthlyRent",
            "bedrooms",
            "bathrooms",
            "squareFootage",
            "lotSizeSqFt",
            "yearBuilt",
            "dateAcquired",
            "propertyType",
            "insuranceCarrier",
            "insurancePolicyNumber",
            "insuranceRenewalDate",
            "managerName",
            "leaseExpiresAt",
            "leaseLengthMonths",
            "monthlyManagementFee",
            "taxJurisdiction",
          ].includes(key);
          if (preferOverwrite || !current) {
            (next as Record<string, string>)[key] = value;
          }
        }
      });
      return next;
    });
    setError(null);
  }

  function updateOwner(index: number, key: keyof OwnerDraft, value: string) {
    setOwners((prev) => prev.map((owner, i) => (i === index ? { ...owner, [key]: value } : owner)));
  }

  function next() {
    if (step === 0) {
      if (!form.nickname || !form.streetAddress || !form.city || !form.state || !form.zipCode) {
        setError("Please fill in the property nickname and full address to continue.");
        return;
      }
    }
    if (step === 1) {
      if (ownershipMode === "new" && !form.newEntityName.trim()) {
        setError("Please enter a name for the new ownership entity, or choose an existing one.");
        return;
      }
      if (ownershipMode === "existing" && !form.ownershipEntityId) {
        setError("Please choose an ownership entity, add a new one, or select no entity.");
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
    data.set("ownershipMode", ownershipMode);
    data.set(
      "ownersJson",
      JSON.stringify(owners.filter((owner) => owner.name.trim().length > 0)),
    );
    startTransition(async () => {
      const result = await createPropertyAction(data);
      if (result?.error) setError(result.error);
    });
  }

  const selectedEntityName =
    ownershipMode === "none"
      ? "No ownership entity"
      : ownershipMode === "new"
        ? form.newEntityName || "New entity"
        : ownershipEntities.find((e) => e.id === form.ownershipEntityId)?.name || "Not chosen";

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
      <p className="text-lg font-semibold text-[var(--primary)]">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>
      <div className="mt-4 flex flex-wrap gap-2" aria-hidden="true">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={`h-2 w-12 rounded-full ${index <= step ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
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
            <PropertyDocumentImport onApply={applyExtractedFields} />
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
            <fieldset>
              <legend className="mb-2 flex items-center text-lg font-semibold">
                Ownership entity
                <HelpTip text="Choose the trust, LLC, or other legal entity that holds the property. You can also add a new entity." />
              </legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOwnershipMode("none");
                    update("ownershipEntityId", "");
                  }}
                  className={`min-h-14 rounded-xl px-4 text-lg font-semibold ${
                    ownershipMode === "none" ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"
                  }`}
                >
                  No entity
                </button>
                {ownershipEntities.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => {
                      setOwnershipMode("existing");
                      update("ownershipEntityId", entity.id);
                    }}
                    className={`min-h-14 rounded-xl px-4 text-lg font-semibold ${
                      ownershipMode === "existing" && form.ownershipEntityId === entity.id
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--muted)]"
                    }`}
                  >
                    {entity.name}
                    {entity.entityType ? ` (${entity.entityType})` : ""}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOwnershipMode("new");
                    update("ownershipEntityId", "");
                  }}
                  className={`min-h-14 rounded-xl px-4 text-lg font-semibold ${
                    ownershipMode === "new" ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"
                  }`}
                >
                  Add new entity
                </button>
              </div>
            </fieldset>

            {ownershipMode === "new" ? (
              <div className="grid gap-4 rounded-2xl bg-white p-4 md:grid-cols-2">
                <Field label="New entity name">
                  <Input
                    value={form.newEntityName}
                    onChange={(e) => update("newEntityName", e.target.value)}
                    placeholder="Example: Oak Holdings LLC"
                  />
                </Field>
                <Field label="Entity type">
                  <select
                    className="min-h-14 w-full rounded-xl border-2 border-[var(--border-strong)] bg-white px-4 text-lg"
                    value={form.newEntityType}
                    onChange={(e) => update("newEntityType", e.target.value)}
                  >
                    {ENTITY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Person(s) who own</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() =>
                    setOwners((prev) => [
                      ...prev,
                      { name: "", email: "", phone: "", ownershipPercent: "" },
                    ])
                  }
                >
                  Add another owner
                </Button>
              </div>
              <p className="text-lg text-[var(--muted-foreground)]">
                Add one or more people who own this property. Ownership percent is optional.
              </p>
              {owners.map((owner, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-[var(--border)] bg-white p-4">
                  <p className="text-lg font-semibold">Owner {index + 1}</p>
                  <Field label="Full name">
                    <Input
                      value={owner.name}
                      onChange={(e) => updateOwner(index, "name", e.target.value)}
                      placeholder="Example: Pat Pacht"
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Email">
                      <Input
                        type="email"
                        value={owner.email}
                        onChange={(e) => updateOwner(index, "email", e.target.value)}
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={owner.phone}
                        onChange={(e) => updateOwner(index, "phone", e.target.value)}
                      />
                    </Field>
                    <Field label="Ownership %">
                      <Input
                        value={owner.ownershipPercent}
                        onChange={(e) => updateOwner(index, "ownershipPercent", e.target.value)}
                        placeholder="Optional"
                      />
                    </Field>
                  </div>
                  {owners.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => setOwners((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove this owner
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {step === 2 ? (
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
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Current monthly rent" tip="What the tenant pays each month today.">
                <Input
                  value={form.monthlyRent}
                  onChange={(e) => update("monthlyRent", e.target.value)}
                  placeholder="Example: 2400"
                />
              </Field>
              <Field label="Lease length (months)" tip="How long the current lease runs, in months.">
                <Input
                  value={form.leaseLengthMonths}
                  onChange={(e) => update("leaseLengthMonths", e.target.value)}
                  placeholder="Example: 12"
                  inputMode="numeric"
                />
              </Field>
              <Field label="Lease expiration date">
                <Input
                  type="date"
                  value={form.leaseExpiresAt}
                  onChange={(e) => update("leaseExpiresAt", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Property management fee / month"
                tip="Optional. Included in the portfolio P&L."
              >
                <Input
                  value={form.monthlyManagementFee}
                  onChange={(e) => update("monthlyManagementFee", e.target.value)}
                />
              </Field>
              <Field
                label="Other fixed expenses / month"
                tip="HOA dues, owner-paid utilities, or similar recurring costs."
              >
                <Input
                  value={form.otherMonthlyExpenses}
                  onChange={(e) => update("otherMonthlyExpenses", e.target.value)}
                />
              </Field>
            </div>
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
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Bedrooms">
                <Input
                  value={form.bedrooms}
                  onChange={(e) => update("bedrooms", e.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Bathrooms">
                <Input
                  value={form.bathrooms}
                  onChange={(e) => update("bathrooms", e.target.value)}
                  inputMode="decimal"
                />
              </Field>
              <Field label="Year built">
                <Input
                  value={form.yearBuilt}
                  onChange={(e) => update("yearBuilt", e.target.value)}
                  inputMode="numeric"
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Living area (sq ft)">
                <Input
                  value={form.squareFootage}
                  onChange={(e) => update("squareFootage", e.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <Field label="Lot size (sq ft)">
                <Input
                  value={form.lotSizeSqFt}
                  onChange={(e) => update("lotSizeSqFt", e.target.value)}
                  inputMode="numeric"
                />
              </Field>
            </div>
          </>
        ) : null}

        {step === 4 ? (
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
              If you enter a renewal date, Pachtfolio can create helpful reminders before it is due.
            </p>
          </>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3 rounded-2xl bg-white p-5 text-lg">
            <h2 className="text-2xl font-semibold">Review before saving</h2>
            <p>
              <strong>{form.nickname || "Untitled property"}</strong>
            </p>
            <p>
              {form.streetAddress}, {form.city}, {form.state} {form.zipCode}
            </p>
            <p>Type: {TYPES.find((t) => t.value === form.propertyType)?.label}</p>
            <p>Ownership entity: {selectedEntityName}</p>
            <p>
              Owners:{" "}
              {owners.filter((o) => o.name.trim()).map((o) => o.name).join(", ") || "Not added yet"}
            </p>
            <p>Monthly rent: {form.monthlyRent || "Not added yet"}</p>
            <p>
              Lease: {form.leaseLengthMonths ? `${form.leaseLengthMonths} months` : "Length not set"}
              {form.leaseExpiresAt ? ` · Expires ${form.leaseExpiresAt}` : ""}
            </p>
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
