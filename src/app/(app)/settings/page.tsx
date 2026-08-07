import Link from "next/link";
import { requireSession } from "@/lib/session";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { BackLink } from "@/components/layout/back-link";

export default async function SettingsPage() {
  const session = await requireSession();
  const isAdmin = hasPermission(session.user.permissions, PERMISSIONS.SETTINGS_MANAGE);

  const links = [
    { href: "/settings/security", label: "Security", description: "Password and two-step verification", show: true },
    { href: "/settings/users", label: "Family users", description: "Add or remove people who can sign in", show: isAdmin },
    { href: "/settings/integrations", label: "Integrations", description: "QuickBooks and email connections", show: isAdmin },
    { href: "/settings/reminders", label: "Reminder defaults", description: "When insurance reminders are created", show: isAdmin },
    { href: "/settings/audit", label: "Audit history", description: "Important changes made in Pachtfolio", show: hasPermission(session.user.permissions, PERMISSIONS.AUDIT_READ) },
  ].filter((item) => item.show);

  return (
    <div className="space-y-6 animate-fade-up">
      <BackLink href="/home" label="Back to Home" />
      <div>
        <h1 className="text-4xl font-semibold md:text-5xl">Settings</h1>
        <p className="mt-2 text-xl text-[var(--muted-foreground)]">
          Signed in as {session.user.name} ({session.user.roleName})
        </p>
      </div>
      <div className="grid gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:bg-white"
          >
            <p className="text-2xl font-semibold">{link.label}</p>
            <p className="mt-1 text-lg text-[var(--muted-foreground)]">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
