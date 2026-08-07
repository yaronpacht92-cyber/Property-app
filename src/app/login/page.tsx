import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { HelpTip } from "@/components/ui/help-tip";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/home");
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <div className="animate-fade-up rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm md:p-10">
        <p className="font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--brand)]">
          Homefolio
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">Sign in</h1>
        <p className="mt-2 text-lg text-[var(--muted-foreground)]">
          Your family&apos;s calm place for every property, document, and reminder.
        </p>

        {params.error ? (
          <Alert className="mt-6" tone="danger" title="We could not sign you in">
            Please check your email and password. If you use a security code, enter it below.
          </Alert>
        ) : null}

        <form
          className="mt-8 space-y-5"
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", {
                email: String(formData.get("email") ?? ""),
                password: String(formData.get("password") ?? ""),
                mfaCode: String(formData.get("mfaCode") ?? ""),
                redirectTo: params.callbackUrl || "/home",
              });
            } catch (error) {
              // Auth.js throws on redirect; rethrow redirect errors.
              throw error;
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Your password"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center">
              <Label htmlFor="mfaCode">Security code (if enabled)</Label>
              <HelpTip text="If you turned on two-step verification, enter the 6-digit code from your authenticator app." />
            </div>
            <Input
              id="mfaCode"
              name="mfaCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Optional 6-digit code"
            />
          </div>
          <Button type="submit" className="w-full animate-soft-pulse" size="large">
            Sign in
          </Button>
        </form>

        <div className="mt-8 rounded-2xl bg-[var(--muted)] p-4 text-base leading-relaxed">
          <p className="font-semibold">Sample development logins</p>
          <p className="mt-1">admin@homefolio.local / ChangeMe!Homefolio1</p>
          <p>member@homefolio.local / ChangeMe!Homefolio1</p>
          <p>readonly@homefolio.local / ChangeMe!Homefolio1</p>
        </div>
      </div>
    </div>
  );
}
