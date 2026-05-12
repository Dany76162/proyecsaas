"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("[Global Error Handled]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 selection:bg-brand-100">
      <div className="max-w-xl w-full text-center space-y-10">
        {/* Error Icon */}
        <div className="relative mx-auto w-28 h-28 bg-brand-50 rounded-[2.5rem] flex items-center justify-center animate-in fade-in zoom-in duration-700">
           <AlertTriangle className="h-14 w-14 text-brand-600" />
           <div className="absolute inset-0 border-2 border-brand-200 rounded-[2.5rem] animate-ping opacity-20" />
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Algo no salió como esperábamos</h1>
          <p className="text-slate-500 text-lg leading-relaxed max-w-md mx-auto">
            Hemos tenido un inconveniente técnico interno. Nuestro equipo ha sido notificado y estamos trabajando para resolverlo.
          </p>
          {error.digest && (
            <code className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              Error ID: {error.digest}
            </code>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Button 
            size="lg" 
            onClick={() => reset()} 
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-500/20 rounded-2xl gap-2 h-14 px-10 text-lg"
          >
            <RotateCcw className="h-5 w-5" />
            Reintentar
          </Button>
          
          <Button variant="ghost" asChild size="lg" className="w-full sm:w-auto text-slate-600 rounded-2xl gap-2 h-14 px-8 hover:bg-slate-100">
            <Link href="/">
              <Home className="h-5 w-5" />
              Ir al Inicio
            </Link>
          </Button>
        </div>

        {/* Support Section */}
        <div className="pt-10 border-t border-slate-100">
          <p className="text-sm text-slate-400 mb-4">¿Necesitas ayuda inmediata?</p>
          <Button variant="outline" asChild className="rounded-full border-slate-200 text-slate-600 gap-2">
            <a href="https://wa.me/5491161630205" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              Soporte vía WhatsApp
            </a>
          </Button>
        </div>

        {/* Branding */}
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">
          RaicesPilot High Availability Core
        </p>
      </div>
    </div>
  );
}
