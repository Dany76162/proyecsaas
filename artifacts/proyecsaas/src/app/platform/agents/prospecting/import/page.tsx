import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ImportProspectsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
          <Link href="/platform/agents/prospecting">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Importar Prospectos</h1>
          <p className="text-slate-500 font-medium mt-1">Carga masiva desde archivo CSV.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
        <Card className="rounded-[2rem] border-slate-200 shadow-soft p-12 flex flex-col items-center justify-center text-center">
          <div className="h-20 w-20 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 mb-6">
            <Upload className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Selecciona tu archivo CSV</h2>
          <p className="text-sm text-slate-500 mb-8 max-w-sm">
            Asegúrate de que el archivo tenga las columnas: companyName, email, website, phone, country.
          </p>
          <Button disabled className="h-12 px-10 bg-slate-900 font-bold opacity-40 cursor-not-allowed">
            Módulo en planificación
          </Button>
          <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Incluido en hoja de ruta interna
          </p>
        </Card>

        <aside className="space-y-6">
          <Card className="p-6 rounded-3xl border-slate-200 bg-brand-50 border-brand-100">
            <div className="flex items-center gap-2 mb-4 text-brand-600">
              <FileText className="h-4 w-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">Instrucciones</h3>
            </div>
            <ul className="text-[11px] font-bold text-brand-700 space-y-3 leading-relaxed">
              <li className="flex gap-2">
                <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                <span>Usa formato CSV delimitado por comas.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                <span>La columna 'companyName' es la única obligatoria.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                <span>Se realizará deduplicación automática por email y web.</span>
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
