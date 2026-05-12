import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppCardProps = {
  children?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
};

export function AppCard({ children, title, description, className }: AppCardProps) {
  return (
    <article className={cn(
      "rounded-xl border border-slate-200/60 bg-white shadow-enterprise transition-all duration-200 hover:shadow-soft",
      className
    )}>
      {title && (
        <div className="p-6 pb-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          {description && <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>}
        </div>
      )}
      {children}
    </article>
  );
}
