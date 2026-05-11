import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand" | "success" | "warning";
};

const toneConfig = {
  default: {
    value: "text-slate-900",
    label: "text-slate-500",
    accent: "bg-slate-100",
  },
  brand: {
    value: "text-brand-700",
    label: "text-slate-500",
    accent: "bg-brand-50",
  },
  success: {
    value: "text-emerald-700",
    label: "text-slate-500",
    accent: "bg-emerald-50",
  },
  warning: {
    value: "text-amber-700",
    label: "text-slate-500",
    accent: "bg-amber-50",
  },
};

export function MetricCard({ label, value, hint, tone = "default" }: MetricCardProps) {
  const config = toneConfig[tone];
  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[11px] font-bold uppercase tracking-[0.12em]", config.label)}>
          {label}
        </p>
      </div>
      <p className={cn("mt-2 text-4xl font-bold tracking-tight tabular-nums", config.value)}>
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">{hint}</p>
      )}
    </article>
  );
}
