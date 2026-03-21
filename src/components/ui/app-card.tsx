type AppCardProps = {
  title: string;
  description: string;
};

export function AppCard({ title, description }: AppCardProps) {
  return (
    <article className="rounded-[1.5rem] border bg-white/80 p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </article>
  );
}
