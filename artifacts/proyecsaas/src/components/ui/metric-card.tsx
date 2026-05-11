import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    label: string;
    type: "positive" | "negative" | "neutral";
  };
  variant?: "default" | "brand" | "emerald";
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = "default",
  className,
  ...props
}: MetricCardProps) {
  const variants = {
    default: "text-slate-400 bg-slate-50",
    brand: "text-brand-600 bg-brand-50",
    emerald: "text-emerald-600 bg-emerald-50",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/60 bg-white p-6 shadow-enterprise",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", variants[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              trend.type === "positive" && "bg-emerald-50 text-emerald-700 border border-emerald-100",
              trend.type === "negative" && "bg-red-50 text-red-700 border border-red-100",
              trend.type === "neutral" && "bg-slate-50 text-slate-600 border border-slate-200"
            )}
          >
            {trend.value}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</span>
          {description && <span className="text-xs text-slate-400">{description}</span>}
        </div>
      </div>
    </div>
  );
}
