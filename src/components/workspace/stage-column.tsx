type StageColumnProps = {
  title: string;
  count: number;
  children: React.ReactNode;
};

export function StageColumn({ title, count, children }: StageColumnProps) {
  return (
    <section className="rounded-[1.5rem] border bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {count}
        </span>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
