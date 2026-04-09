type SectionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-[1.5rem] border bg-white p-4 sm:p-6 shadow-soft overflow-hidden">
      <div className="mb-5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
