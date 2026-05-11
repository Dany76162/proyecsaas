import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "info" | "danger";
  dot?: boolean;
  className?: string;
};

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, { badge: string; dot: string }> = {
  neutral: {
    badge: "bg-slate-100 text-slate-600 ring-slate-200/80",
    dot: "bg-slate-400",
  },
  success: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    dot: "bg-emerald-500",
  },
  warning: {
    badge: "bg-amber-50 text-amber-700 ring-amber-200/60",
    dot: "bg-amber-500",
  },
  info: {
    badge: "bg-brand-50 text-brand-700 ring-brand-200/60",
    dot: "bg-brand-500",
  },
  danger: {
    badge: "bg-red-50 text-red-700 ring-red-200/60",
    dot: "bg-red-500",
  },
};

export function StatusBadge({
  label,
  tone = "neutral",
  dot = false,
  className,
}: StatusBadgeProps) {
  const config = toneClasses[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1",
        config.badge,
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dot)} />
      )}
      {label}
    </span>
  );
}
