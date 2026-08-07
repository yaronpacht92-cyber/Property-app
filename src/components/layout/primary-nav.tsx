"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/reminders", label: "Reminders" },
  { href: "/documents", label: "Documents" },
  { href: "/settings", label: "Settings" },
];

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-wrap gap-2">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`min-h-12 rounded-xl px-4 py-3 text-lg font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] ${
              active
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--secondary)]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
