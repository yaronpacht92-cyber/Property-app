import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
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
          Pachtfolio
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">Sign in</h1>
        <p className="mt-2 text-lg text-[var(--muted-foreground)]">
          Your family&apos;s calm place for every property, document, and reminder.
        </p>

        {params.error ? (
          <Alert className="mt-6" tone="danger" title="We could not sign you in">
            Please check your email and password. Use the sample logins below exactly as shown,
            including the capital letters in the password. If you use a security code, enter it
            below.
          </Alert>
        ) : null}

        <form
          className="mt-8 space-y-5"
          action={async (formData) => {
            "use server";
            const callbackUrl = String(formData.get("callbackUrl") || "/home");
            try {
              await signIn("credentials", {
                email: String(formData.get("email") ?? "").trim().toLowerCase(),
                password: String(formData.get("password") ?? ""),
                mfaCode: String(formData.get("mfaCode") ?? "").trim() || undefined,
                redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/home",
              });
            } catch (error) {
              // Successful Auth.js sign-in throws a redirect — rethrow it.
              // Failed credentials should return to the login form, not a 500 page.
              if (error instanceof AuthError) {
                redirect(`/login?error=${encodeURIComponent(error.type)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
              }
              throw error;
            }
          }}
        >
          <input type="hidden" name="callbackUrl" value={params.callbackUrl || "/home"} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              defaultValue="admin@pachtfolio.local"
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
              defaultValue="ChangeMe!Pachtfolio1"
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
          <p className="mt-1">admin@pachtfolio.local / ChangeMe!Pachtfolio1</p>
          <p>member@pachtfolio.local / ChangeMe!Pachtfolio1</p>
          <p>readonly@pachtfolio.local / ChangeMe!Pachtfolio1</p>
          <p className="mt-2 text-[var(--muted-foreground)]">
            The admin fields above are prefilled for this demo. Click Sign in to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
