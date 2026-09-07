import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { CreateAccountForm } from "@/components/auth/create-account-form";
import { isPublicSignupEnabled } from "@/lib/runtime-flags";

export default async function SignupPage() {
  if (!isPublicSignupEnabled()) {
    redirect("/login");
  }

  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <div className="animate-fade-up rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm md:p-10">
        <p className="font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--brand)]">
          Pachtfolio
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
          Create an account
        </h1>
        <p className="mt-2 text-lg text-[var(--muted-foreground)]">
          Set up a new family portfolio. You will be the family administrator and can add other
          people later from Settings.
        </p>

        <CreateAccountForm />

        <p className="mt-6 text-base text-[var(--muted-foreground)]">
          Joining an existing family? Ask your administrator to add you in{" "}
          <span className="font-semibold">Settings → Family users</span>, then{" "}
          <Link href="/login" className="font-semibold text-[var(--primary)] underline">
            sign in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
