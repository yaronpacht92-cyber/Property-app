import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center gap-2 rounded-xl px-2 text-lg font-semibold text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]"
    >
      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      {label}
    </Link>
  );
}
