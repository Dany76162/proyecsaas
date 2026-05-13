"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string; onValueChange?: (v: string) => void; defaultValue?: string }
>(({ className, value, onValueChange, defaultValue, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");
  const currentValue = value !== undefined ? value : internalValue;

  const handleValueChange = (v: string) => {
    if (value === undefined) setInternalValue(v);
    onValueChange?.(v);
  };

  return (
    <div
      ref={ref}
      className={cn("w-full", className)}
      {...props}
      data-state-value={currentValue}
      // Pass context-like behavior via data attributes or custom context if needed
      // For simplicity in this env, we'll use a basic pattern
    >
      {React.Children.map(props.children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            currentValue,
            onValueChange: handleValueChange,
          });
        }
        return child;
      })}
    </div>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { currentValue?: string; onValueChange?: (v: string) => void }
>(({ className, currentValue, onValueChange, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500",
      className
    )}
    {...props}
  >
     {React.Children.map(props.children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            currentValue,
            onValueChange,
          });
        }
        return child;
      })}
  </div>
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; currentValue?: string; onValueChange?: (v: string) => void }
>(({ className, value, currentValue, onValueChange, ...props }, ref) => {
  const isActive = currentValue === value;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange?.(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-900",
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; currentValue?: string; onValueChange?: any }
>(({ className, value, currentValue, onValueChange, ...props }, ref) => {
  if (currentValue !== value) return null;
  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
