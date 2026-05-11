import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "flex h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
