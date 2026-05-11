import { cn } from "@/lib/utils";

const STAGE_CONFIG: Record<string, { accent: string; countBg: string }> = {
  NUEVO:      { accent: "border-t-slate-300",   countBg: "bg-slate-100 text-slate-700" },
  CONTACTADO: { accent: "border-t-blue-400",    countBg: "bg-blue-50 text-blue-700" },
  INTERESADO: { accent: "border-t-brand-500",   countBg: "bg-brand-50 text-brand-700" },
  "EN VISITA":{ accent: "border-t-amber-400",   countBg: "bg-amber-50 text-amber-700" },
  CERRADO:    { accent: "border-t-emerald-400", countBg: "bg-emerald-50 text-emerald-700" },
};

type StageColumnProps = {
  title: string;
  count: number;
  children: React.ReactNode;
};

export function StageColumn({ title, count, children }: StageColumnProps) {
  const config = STAGE_CONFIG[title] ?? {
    accent: "border-t-slate-300",
    countBg: "bg-slate-100 text-slate-700",
  };

  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border border-slate-200/70 bg-slate-50/50 border-t-2",
        config.accent,
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200/60">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {title}
        </h3>
        <span
          className={cn(
            "min-w-[22px] rounded-md px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums",
            config.countBg,
          )}
        >
          {count}
        </span>
      </div>
      {/* Cards */}
      <div className="flex-1 space-y-2 p-2.5">{children}</div>
    </section>
  );
}
