import { Construction } from "lucide-react";

export function UnderConstruction({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 mb-6">
        <Construction className="h-10 w-10 text-slate-400" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-3 max-w-sm text-sm text-slate-500">{description}</p>
      <div className="mt-8 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
        Próxima Capa
      </div>
    </div>
  );
}
