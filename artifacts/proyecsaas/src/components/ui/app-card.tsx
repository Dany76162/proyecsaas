type AppCardProps = {
  title: string;
  description: string;
};

export function AppCard({ title, description }: AppCardProps) {
  return (
    <article className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-enterprise transition-all duration-200 hover:shadow-soft">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}

