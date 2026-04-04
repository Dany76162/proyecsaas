import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "info";
};

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-brand-100 text-brand-900",
};

export function StatusBadge({
  label,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {label}
    </span>
  );
}
