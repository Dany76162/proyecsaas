import { cn } from "@/lib/utils";

type SectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  actions,
  noPadding = false,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200/70 bg-white shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4",
        )}
      >
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              "font-semibold tracking-tight text-slate-900",
              eyebrow ? "mt-1.5 text-lg" : "text-xl",
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {/* Body */}
      <div className={cn(noPadding ? "" : "p-6")}>{children}</div>
    </section>
  );
}
