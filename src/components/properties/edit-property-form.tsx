"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpTip } from "@/components/ui/help-tip";
import { updatePropertyBasicsAction } from "@/server/actions/properties";

const ENTITY_TYPES = ["Trust", "LLC", "Corporation", "Partnership", "Individual", "Other"];

type OwnerDraft = {
  name: string;
  email: string;
  phone: string;
  ownershipPercent: string;
};

type Props = {
  property: {
    id: string;
    nickname: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    ownershipEntityId: string | null;
    monthlyRent: string;
    leaseLengthMonths: string;
    leaseExpiresAt: string;
    bedrooms: string;
    bathrooms: string;
    squareFootage: string;
    lotSizeSqFt: string;
    yearBuilt: string;
    owners: OwnerDraft[];
  };
  ownershipEntities: { id: string; name: string; entityType: string | null }[];
};

export function EditPropertyForm({ property, ownershipEntities }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ownershipMode, setOwnershipMode] = useState<"existing" | "new" | "none">(
    property.ownershipEntityId ? "existing" : "none",
  );
  const [ownershipEntityId, setOwnershipEntityId] = useState(property.ownershipEntityId || "");
  const [newEntityName, setNewEntityName] = useState("");
  const [newEntityType, setNewEntityType] = useState("LLC");
  const [owners, setOwners] = useState<OwnerDraft[]>(
    property.owners.length
      ? property.owners
      : [{ name: "", email: "", phone: "", ownershipPercent: "" }],
  );

  function updateOwner(index: number, key: keyof OwnerDraft, value: string) {
    setOwners((prev) => prev.map((owner, i) => (i === index ? { ...owner, [key]: value } : owner)));
  }

  return (
    <form
      className="space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6"
      action={(formData) => {
        formData.set("ownershipMode", ownershipMode);
        formData.set("ownershipEntityId", ownershipEntityId);
        formData.set("newEntityName", newEntityName);
        formData.set("newEntityType", newEntityType);
        formData.set(
          "ownersJson",
          JSON.stringify(owners.filter((owner) => owner.name.trim().length > 0)),
        );
        startTransition(async () => {
          const result = await updatePropertyBasicsAction(property.id, formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="nickname">Property nickname</Label>
        <Input id="nickname" name="nickname" defaultValue={property.nickname} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="streetAddress">Street address</Label>
        <Input
          id="streetAddress"
          name="streetAddress"
          defaultValue={property.streetAddress}
          required
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={property.city} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" defaultValue={property.state} required maxLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP code</Label>
          <Input id="zipCode" name="zipCode" defaultValue={property.zipCode} required />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 flex items-center text-lg font-semibold">
          Ownership entity
          <HelpTip text="Choose the trust, LLC, or other legal entity that holds the property." />
        </legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setOwnershipMode("none");
              setOwnershipEntityId("");
            }}
            className={`min-h-12 rounded-xl px-4 text-lg font-semibold ${
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
                setOwnershipEntityId(entity.id);
              }}
              className={`min-h-12 rounded-xl px-4 text-lg font-semibold ${
                ownershipMode === "existing" && ownershipEntityId === entity.id
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)]"
              }`}
            >
              {entity.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOwnershipMode("new");
              setOwnershipEntityId("");
            }}
            className={`min-h-12 rounded-xl px-4 text-lg font-semibold ${
              ownershipMode === "new" ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]"
            }`}
          >
            Add new entity
          </button>
        </div>
      </fieldset>

      {ownershipMode === "new" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="newEntityName">New entity name</Label>
            <Input
              id="newEntityName"
              value={newEntityName}
              onChange={(e) => setNewEntityName(e.target.value)}
              placeholder="Example: Oak Holdings LLC"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newEntityType">Entity type</Label>
            <select
              id="newEntityType"
              value={newEntityType}
              onChange={(e) => setNewEntityType(e.target.value)}
              className="min-h-14 w-full rounded-xl border-2 border-[var(--border-strong)] bg-white px-4 text-lg"
            >
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Person(s) who own</h2>
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
        {owners.map((owner, index) => (
          <div key={index} className="space-y-3 rounded-2xl border border-[var(--border)] bg-white p-4">
            <p className="font-semibold">Owner {index + 1}</p>
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={owner.name}
                onChange={(e) => updateOwner(index, "name", e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={owner.email}
                  onChange={(e) => updateOwner(index, "email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={owner.phone}
                  onChange={(e) => updateOwner(index, "phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ownership %</Label>
                <Input
                  value={owner.ownershipPercent}
                  onChange={(e) => updateOwner(index, "ownershipPercent", e.target.value)}
                />
              </div>
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="monthlyRent">Current monthly rent</Label>
          <Input id="monthlyRent" name="monthlyRent" defaultValue={property.monthlyRent} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leaseLengthMonths">Lease length (months)</Label>
          <Input
            id="leaseLengthMonths"
            name="leaseLengthMonths"
            defaultValue={property.leaseLengthMonths}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leaseExpiresAt">Lease expiration date</Label>
          <Input
            id="leaseExpiresAt"
            name="leaseExpiresAt"
            type="date"
            defaultValue={property.leaseExpiresAt}
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-lg font-semibold">Property details (manual entry)</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Input
              id="bedrooms"
              name="bedrooms"
              defaultValue={property.bedrooms}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Input
              id="bathrooms"
              name="bathrooms"
              defaultValue={property.bathrooms}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yearBuilt">Year built</Label>
            <Input
              id="yearBuilt"
              name="yearBuilt"
              defaultValue={property.yearBuilt}
              inputMode="numeric"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="squareFootage">Living area (sq ft)</Label>
            <Input
              id="squareFootage"
              name="squareFootage"
              defaultValue={property.squareFootage}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lotSizeSqFt">Lot size (sq ft)</Label>
            <Input
              id="lotSizeSqFt"
              name="lotSizeSqFt"
              defaultValue={property.lotSizeSqFt}
              inputMode="numeric"
            />
          </div>
        </div>
      </fieldset>

      {error ? <p className="text-lg text-[var(--danger)]">{error}</p> : null}
      <Button type="submit" size="large" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
