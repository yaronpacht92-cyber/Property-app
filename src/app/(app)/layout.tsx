import { requireSession } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <AppShell
      userName={session.user.name || "Family member"}
      organizationName={session.user.organizationName || "Your family"}
    >
      {children}
    </AppShell>
  );
}
