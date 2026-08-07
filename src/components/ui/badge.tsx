import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-[var(--muted)] text-[var(--foreground)] border-[var(--border-strong)]",
    success: "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-fg)] border-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger)]",
    info: "bg-[var(--info-soft)] text-[var(--info)] border-[var(--info)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-base font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
