"use client";

import { useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  assignEmailThreadAction,
  connectDemoEmailAction,
  disconnectEmailAction,
  startEmailConnectAction,
  syncEmailAction,
} from "@/server/actions/email";

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
  const isError = message.toLowerCase().includes("fail") || message.toLowerCase().includes("not ");
  return (
    <p className={`mt-2 text-base ${isError ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
      {message}
    </p>
  );
}

export function ConnectEmailButton({
  provider,
  label,
  disabled,
}: {
  provider: "GMAIL" | "MICROSOFT";
  label: string;
  disabled?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await startEmailConnectAction(formData);
        if (result?.error) setMessage(result.error);
      }}
    >
      <input type="hidden" name="provider" value={provider} />
      <PendingButton disabled={disabled}>{label}</PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}

export function ConnectDemoEmailButton() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async () => {
        setMessage(null);
        const result = await connectDemoEmailAction();
        setMessage(result.error || result.success || null);
      }}
    >
      <PendingButton variant="secondary">Connect demo mailbox</PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}

export function SyncEmailButton({ connectionId }: { connectionId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await syncEmailAction(formData);
        setMessage(result.error || result.success || null);
      }}
    >
      <input type="hidden" name="connectionId" value={connectionId} />
      <PendingButton variant="outline">Sync now</PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}

export function DisconnectEmailButton({ connectionId }: { connectionId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await disconnectEmailAction(formData);
        setMessage(result.error || result.success || null);
      }}
    >
      <input type="hidden" name="connectionId" value={connectionId} />
      <PendingButton variant="danger">Disconnect</PendingButton>
      <ActionMessage message={message} />
    </form>
  );
}

export function AssignEmailThreadForm({
  threadId,
  properties,
  currentPropertyId,
}: {
  threadId: string;
  properties: Array<{ id: string; nickname: string }>;
  currentPropertyId?: string | null;
}) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      action={async (formData) => {
        setMessage(null);
        const result = await assignEmailThreadAction(formData);
        setMessage(result.error || result.success || null);
      }}
      className="mt-3 flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="threadId" value={threadId} />
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
