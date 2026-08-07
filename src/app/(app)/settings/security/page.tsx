import { requireSession } from "@/lib/session";
import { BackLink } from "@/components/layout/back-link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MfaSetupPanel } from "@/components/settings/mfa-setup-panel";

export default async function SecuritySettingsPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <BackLink href="/settings" label="Back to Settings" />
      <h1 className="text-4xl font-semibold">Security</h1>
      <Alert tone="info" title="Keep your family information safe">
        Use a long password and turn on a security code if you can.
      </Alert>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-xl font-semibold">Two-step verification</p>
        <p className="mt-2 text-lg">
          Status:{" "}
          <Badge tone={session.user.mfaEnabled ? "success" : "warning"}>
            {session.user.mfaEnabled ? "On" : "Off"}
          </Badge>
        </p>
        {!session.user.mfaEnabled ? <MfaSetupPanel /> : null}
      </div>
    </div>
  );
}
