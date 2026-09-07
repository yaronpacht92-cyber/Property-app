"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HelpTip } from "@/components/ui/help-tip";
import { createAccountAction } from "@/server/actions/register";

export function CreateAccountForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-8 space-y-5"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await createAccountAction(formData);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center">
          <Label htmlFor="organizationName">Family or portfolio name</Label>
          <HelpTip text="Example: The Pacht Family Properties. This is your private space in Pachtfolio." />
        </div>
        <Input
          id="organizationName"
          name="organizationName"
          required
          maxLength={120}
          placeholder="e.g. Smith Family Properties"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          autoComplete="name"
          placeholder="Your full name"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center">
          <Label htmlFor="password">Password</Label>
          <HelpTip text="At least 12 characters with uppercase, lowercase, and a number." />
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Create a strong password"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Type the password again"
          disabled={pending}
        />
      </div>

      {error ? (
        <p className="text-base text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" size="large" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-lg text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--primary)] underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
