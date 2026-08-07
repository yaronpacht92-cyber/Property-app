import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PrimaryNav } from "@/components/layout/primary-nav";

export function AppShell({
  children,
  userName,
  organizationName,
}: {
  children: React.ReactNode;
  userName: string;
  organizationName: string;
  currentPath?: string;
}) {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-lg"
      >
        Skip to main content
      </a>
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--brand)] md:text-4xl">
                Homefolio
              </p>
              <p className="text-base text-[var(--muted-foreground)]">
                {organizationName} · Signed in as {userName}
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button type="submit" variant="outline" size="small">
                Sign out
              </Button>
            </form>
          </div>
          <PrimaryNav />
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
