import Link from "next/link";
import { Compass, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccessRequestForm } from "./access-request-form";

export const metadata = {
  title: "Solicitar Acceso | RAÃCESPilot",
  description: "Solicita una demo de la plataforma operativa para inmobiliarias modernas.",
};

export default function SolicitarAccesoPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900 text-slate-900 flex flex-col">
      {/* Navbar MÃ­nima */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white transition-transform group-hover:scale-105">
              <Compass className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              RAÃCES<span className="font-light">Pilot</span>
            </span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Acceder al sistema</Link>
          </Button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-16">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">
            Solicitar demo de RaicesPilot
          </h1>
          <p className="text-lg text-slate-600 mb-12 leading-relaxed max-w-xl mx-auto">
            CompletÃ¡ tus datos y coordinamos una demo para mostrarte cÃ³mo RaicesPilot puede ordenar la atenciÃ³n, el seguimiento y la gestiÃ³n comercial de tu inmobiliaria.
          </p>

          {/* Formulario de Solicitud */}
          <AccessRequestForm />

          {/* NavegaciÃ³n secundaria */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 border-t border-slate-200">
            <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-900">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-900">
              <Link href="/login">
                Ya tengo cuenta <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
