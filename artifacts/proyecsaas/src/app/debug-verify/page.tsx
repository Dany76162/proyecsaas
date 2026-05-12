"use client";

import React from "react";
import { LogOut, X, Home, Users, MessageSquare, Calendar, Building2 } from "lucide-react";

export default function DebugVerifyPage() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. SIDEBAR VERIFICATION */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 w-72 flex flex-col bg-slate-950 h-screen h-[100dvh] transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 transition"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="m-4 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">RaicesPilot</p>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-white">Debug Workspace</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-2">
           <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Operación</p>
           {[ "Inicio", "Leads", "Conversaciones", "Visitas", "Propiedades" ].map(label => (
             <div key={label} className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300">
               {label}
             </div>
           ))}
           <div className="h-[1000px] w-full border-l border-white/5 ml-4 flex items-center justify-center text-slate-800 text-[10px]">
             (Scrollable Area to test footer visibility)
           </div>
        </div>

        {/* FOOTER - THE FIX */}
        <div className="shrink-0 border-t border-white/10 p-4 space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">D</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white leading-tight">Daniel Cata</p>
              <p className="text-[10px] text-slate-400">Titular</p>
            </div>
          </div>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 bg-red-500/5 text-red-400 border border-red-500/20">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* 2. PROPERTY CARD VERIFICATION */}
      <main className="ml-0 lg:ml-72 p-8">
        <h1 className="text-2xl font-bold mb-8">Layout Verification</h1>
        
        <div className="max-w-[400px] mx-auto border-2 border-dashed border-slate-300 p-4 rounded-xl">
          <p className="text-xs text-slate-400 mb-4 text-center">Mobile Viewport Simulation (360px content boundary)</p>
          
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white transition shadow-sm">
            <div className="flex h-32 w-full items-center justify-center bg-slate-100">
              <Building2 className="h-8 w-8 text-slate-300" />
            </div>
            
            <div className="p-5">
              {/* THE FIX: flex-col on mobile */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-snug text-slate-950">
                    Propiedad con Título Muy Largo para Validar que Badges se Apilan Correctamente
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Av. Libertador 1234, Recoleta, CABA
                  </p>
                </div>
                
                {/* Badges container */}
                <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-end">
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Disponible
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                    Público
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-500">
                <span>Departamento</span> • <span>3 dor</span> • <span>2 ba</span> • <span>120 mÂ²</span>
              </div>
              <p className="mt-4 text-xl font-semibold text-slate-950">USD 250.000</p>
            </div>
          </div>
        </div>
        
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="fixed bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg"
          >
            Open Sidebar
          </button>
        )}
      </main>
    </div>
  );
}
