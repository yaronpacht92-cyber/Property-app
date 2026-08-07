"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { beginMfaSetupAction, confirmMfaSetupAction } from "@/server/actions/mfa";

export function MfaSetupPanel() {
  const [uri, setUri] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 space-y-4">
      {!uri ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await beginMfaSetupAction();
                setUri(result.otpauthUri || null);
                setError(null);
              } catch {
                setError("We could not start two-step verification. Please try again.");
              }
            })
          }
        >
          Start two-step verification
        </Button>
      ) : (
        <form
          className="space-y-3"
          action={(formData) => {
            startTransition(async () => {
              const result = await confirmMfaSetupAction(formData);
              if (result?.error) setError(result.error);
              else setMessage(result?.success || "Security code enabled.");
            });
          }}
        >
          <p className="text-lg">
            Add this account in your authenticator app, then enter the 6-digit code.
          </p>
          <p className="break-all rounded-xl bg-white p-3 text-sm">{uri}</p>
          <div className="space-y-2">
            <Label htmlFor="code">Security code</Label>
            <Input id="code" name="code" inputMode="numeric" required />
          </div>
          <Button type="submit" disabled={pending}>
            Turn on security code
          </Button>
        </form>
      )}
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-[var(--success)]">{message}</p> : null}
    </div>
  );
}
