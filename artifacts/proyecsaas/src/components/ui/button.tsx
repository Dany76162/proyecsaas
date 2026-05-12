import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline" | "success" | "info";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

const variants = {
  primary:     "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-500/20 active:scale-[0.98]",
  secondary:   "bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300",
  outline:     "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300",
  ghost:       "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20 active:scale-[0.98]",
  success:     "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 active:scale-[0.98]",
  info:        "bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-400/20 active:scale-[0.98]",
};

const sizes = {
  sm:   "h-9 px-4 text-xs",
  md:   "h-11 px-6 text-[15px]",
  lg:   "h-14 px-10 text-lg",
  icon: "h-10 w-10 p-0 flex items-center justify-center",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, children, ...props }, ref) => {
    // asChild: render children element directly with merged props (Slot pattern without radix)
    if (asChild && React.isValidElement(children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        className: cn(
          "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2",
          variants[variant],
          sizes[size],
          child.props.className,
          className,
        ),
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
