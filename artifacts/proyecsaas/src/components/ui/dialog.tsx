import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = ({ 
  children, 
  open, 
  onOpenChange 
}: { 
  children: React.ReactNode; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:hidden">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-lg z-50">
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div
    className={cn(
      "relative w-full rounded-xl border border-slate-200/60 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200",
      className
    )}
  >
    {children}
  </div>
);

const DialogHeader = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={cn("flex flex-col space-y-1.5 mb-4", className)}>
    {children}
  </div>
);

const DialogTitle = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <h2 className={cn("text-lg font-bold text-slate-900", className)}>
    {children}
  </h2>
);

const DialogDescription = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <p className={cn("text-sm text-slate-500", className)}>
    {children}
  </p>
);

const DialogFooter = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={cn("mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>
    {children}
  </div>
);

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
