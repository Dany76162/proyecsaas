type WorkspaceIntroProps = {
  title: string;
  orgSlug: string;
  description: string;
};

export function WorkspaceIntro({
  title,
  orgSlug,
  description,
}: WorkspaceIntroProps) {
  return (
    <section className="rounded-[2rem] border bg-white p-8 shadow-soft">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{orgSlug}</p>
      <h2 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-4 max-w-2xl text-slate-600">{description}</p>
    </section>
  );
}

