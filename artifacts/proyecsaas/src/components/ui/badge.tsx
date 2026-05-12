import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "neutral" | "success" | "warning" | "danger" | "info" | "brand" | "outline";
}

function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  const variants = {
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    warning: "border-amber-100 bg-amber-50 text-amber-700",
    danger: "border-red-100 bg-red-50 text-red-700",
    info: "border-blue-100 bg-blue-50 text-blue-700",
    brand: "border-brand-100 bg-brand-50 text-brand-700",
    outline: "border-slate-200 bg-transparent text-slate-600",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
