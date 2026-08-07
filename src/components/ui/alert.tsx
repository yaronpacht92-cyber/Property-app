import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;
  const styles = {
    info: "border-[var(--info)] bg-[var(--info-soft)]",
    success: "border-[var(--success)] bg-[var(--success-soft)]",
    warning: "border-[var(--warning)] bg-[var(--warning-soft)]",
    danger: "border-[var(--danger)] bg-[var(--danger-soft)]",
  };

  return (
    <div
      role="status"
      className={cn("flex gap-3 rounded-2xl border-2 px-5 py-4 text-lg", styles[tone], className)}
    >
      <Icon className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}
