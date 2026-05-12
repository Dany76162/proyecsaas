"use client";

import Link from "next/link";
import { Home, Compass, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-brand-100">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Branding Icon */}
        <div className="relative mx-auto w-24 h-24 bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 flex items-center justify-center group transition-transform hover:scale-105 duration-500">
           <Compass className="h-12 w-12 text-brand-600 animate-pulse-slow" />
           <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">
             404
           </div>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Ruta no encontrada</h1>
          <p className="text-slate-500 leading-relaxed">
            Parece que te has desviado del camino. La propiedad o página que buscas no existe o ha sido movida.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button asChild size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 shadow-xl shadow-slate-200 rounded-2xl gap-2 h-14 px-8">
            <Link href="/">
              <Home className="h-5 w-5" />
              Ir al Inicio
            </Link>
          </Button>
          
          <Button variant="outline" size="lg" onClick={() => window.history.back()} className="w-full sm:w-auto border-slate-200 text-slate-600 rounded-2xl gap-2 h-14 px-8 bg-white hover:bg-slate-50 transition-all">
            <ArrowLeft className="h-5 w-5" />
            Volver atrás
          </Button>
        </div>

        {/* Footer Branding */}
        <div className="pt-12 flex items-center justify-center gap-2">
          <img 
            src="/brand/logo_transparent_icon.png" 
            alt="Logo" 
            className="h-6 w-auto grayscale opacity-50" 
          />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">RaicesPilot Infrastructure</span>
        </div>
      </div>
    </div>
  );
}
