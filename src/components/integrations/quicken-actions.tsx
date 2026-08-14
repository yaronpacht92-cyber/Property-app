"use client";

import { useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  assignQuickenTransactionAction,
  disconnectQuickenAction,
  enableQuickenAction,
  importQuickenFileAction,
  importSampleQuickenAction,
  upsertQuickenPropertyMappingAction,
} from "@/server/actions/quicken";

function PendingButton({
  children,
  variant = "default",
  ...props
}: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending || props.disabled} {...props}>
      {pending ? "Working…" : children}
    </Button>
  );
}

function ActionMessage({ message }: { message: string | null }) {
  if (!message) return null;
  const isError =
    /fail|missing|choose|enter|too large|use a|could not|not found/i.test(message) &&
    !/complete|saved|ready|imported|assigned|disconnected/i.test(message);
  return (
    <p className={`mt-2 text-base ${isError ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
      {message}
    </p>
  );
}

export function EnableQuickenButton() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async () => {
        setMessage(null);
        const result = await enableQuickenAction();
        setMessage(result.error || result.success || null);
      }}
    >
      <PendingButton>Enable Quicken</PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}

export function DisconnectQuickenButton({ connectionId }: { connectionId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await disconnectQuickenAction(formData);
        setMessage(result.error || result.success || null);
      }}
    >
      <input type="hidden" name="connectionId" value={connectionId} />
      <PendingButton variant="danger">Disconnect</PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}

export function ImportQuickenFileForm({ connectionId }: { connectionId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await importQuickenFileAction(formData);
        setMessage(result.error || result.success || null);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="connectionId" value={connectionId} />
      <label className="flex flex-col gap-1 text-base font-medium">
        Quicken export file
        <input
          type="file"
          name="file"
          accept=".ofx,.qfx,.qif,.csv,.txt,text/csv,application/x-ofx,application/vnd.intu.qfx"
          className="min-h-12 rounded-xl border-2 border-[var(--border-strong)] bg-white px-3 py-2 text-lg file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--muted)] file:px-3 file:py-2 file:text-base file:font-semibold"
        />
      </label>
      <PendingButton variant="outline">Import file</PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}

export function ImportSampleQuickenButton({ connectionId }: { connectionId?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await importSampleQuickenAction(formData);
        setMessage(result.error || result.success || null);
      }}
    >
      {connectionId ? <input type="hidden" name="connectionId" value={connectionId} /> : null}
      <PendingButton variant="secondary">Import sample Quicken file</PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}

export function QuickenMappingForm({
  connectionId,
  properties,
}: {
  connectionId: string;
  properties: Array<{ id: string; nickname: string }>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await upsertQuickenPropertyMappingAction(formData);
        setMessage(result.error || result.success || null);
      }}
      className="mt-4 grid gap-3 md:grid-cols-2"
    >
      <input type="hidden" name="connectionId" value={connectionId} />
      <label className="flex flex-col gap-1 text-base font-medium">
        Property
        <select
          name="propertyId"
          className="min-h-12 rounded-xl border-2 border-[var(--border-strong)] bg-white px-3 text-lg"
          defaultValue=""
          required
        >
          <option value="" disabled>
            Choose property
          </option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.nickname}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-base font-medium">
        Match using
        <select
          name="mappingType"
          className="min-h-12 rounded-xl border-2 border-[var(--border-strong)] bg-white px-3 text-lg"
          defaultValue="ACCOUNT"
        >
          <option value="ACCOUNT">Quicken account name</option>
          <option value="CUSTOM">Quicken category / tag</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-base font-medium md:col-span-2">
        Account or category name in Quicken
        <input
          name="externalName"
          placeholder="e.g. Oak Street Rental or Repairs:Oak Street"
          className="min-h-12 rounded-xl border-2 border-[var(--border-strong)] bg-white px-3 text-lg"
          required
        />
      </label>
      <div>
        <PendingButton size="small">Save mapping</PendingButton>
        <ActionMessage message={message} />
      </div>
    </form>
  );
}

export function AssignQuickenTransactionForm({
  transactionId,
  properties,
  currentPropertyId,
}: {
  transactionId: string;
  properties: Array<{ id: string; nickname: string }>;
  currentPropertyId?: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await assignQuickenTransactionAction(formData);
        setMessage(result.error || result.success || null);
      }}
      className="mt-3 flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="transactionId" value={transactionId} />
      <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-base font-medium">
        Assign to property
        <select
          name="propertyId"
          defaultValue={currentPropertyId || ""}
          className="min-h-12 rounded-xl border-2 border-[var(--border-strong)] bg-white px-3 text-lg"
        >
          <option value="">Unassigned</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.nickname}
            </option>
          ))}
        </select>
      </label>
      <PendingButton size="small" variant="outline">
        Save
      </PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}
