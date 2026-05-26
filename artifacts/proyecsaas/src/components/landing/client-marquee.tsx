"use client";

import { useEffect, useState } from "react";
import { Calendar, Activity, Users, Radio } from "lucide-react";

interface ClientItem {
  main: string;
  sub: string;
}

interface ClientMarqueeProps {
  totalClients?: number;
  dynamicClients?: ClientItem[];
}

const DEFAULT_CLIENTS: ClientItem[] = [
  { main: "MelePropiedades", sub: "Inmobiliaria" },
  { main: "Alberto Capelli", sub: "Martillero" },
  { main: "SevenToop", sub: "Marketing Digital" },
  { main: "RaicesPilot", sub: "Tecnología Inmobiliaria" },
];

export function ClientMarquee({ totalClients = 0, dynamicClients = [] }: ClientMarqueeProps) {
  const [currentDateStr, setCurrentDateStr] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const today = new Date();
    const formatted = today.toLocaleDateString('es-ES', options);
    setCurrentDateStr(formatted.charAt(0).toUpperCase() + formatted.slice(1));
  }, []);

  const uniqueDynamic = dynamicClients.filter(
    (dc) => !DEFAULT_CLIENTS.some((bc) => bc.main.toLowerCase() === dc.main.toLowerCase())
  );
  const clientsList = [...uniqueDynamic, ...DEFAULT_CLIENTS];
  const marqueeItems = [...clientsList, ...clientsList, ...clientsList, ...clientsList];

  return (
    <section className="w-full py-16 bg-white overflow-hidden border-y border-slate-100 relative text-slate-800">
      <div className="mx-auto max-w-7xl px-6 relative z-10">
        
        {/* Header Section */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 mb-4 animate-pulse">
            <Radio className="h-3.5 w-3.5" />
            Monitoreo en Vivo
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Quienes ya usan <span className="text-brand-600">RAÍCES</span><span className="font-light text-slate-950">Pilot</span>
          </h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto text-sm font-medium">
            Nuestra red de inmobiliarias conectadas se actualiza automáticamente con cada nuevo miembro.
          </p>
        </div>

        {/* PREMIUM METRICS BOARD (LIGHT THEME) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          
          {/* Lanzamiento Card */}
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm transition-all duration-300 hover:border-brand-500/30 hover:bg-slate-100/50 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Lanzamiento Oficial</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">Lunes, 25 de Mayo de 2026</p>
            </div>
          </div>

          {/* Estado de Red Card */}
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm transition-all duration-300 hover:border-indigo-500/30 hover:bg-slate-100/50 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Última Actualización</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5 min-h-[20px]">
                {mounted ? currentDateStr : "Cargando..."}
              </p>
            </div>
          </div>

          {/* Contador Card */}
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm transition-all duration-300 hover:border-cyan-500/30 hover:bg-slate-100/50 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Inmobiliarias en Red</p>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{totalClients > 0 ? `+${totalClients}` : "+4"} Conectadas</span>
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* FULL WIDTH INFINITE SLIDER CAROUSEL */}
      <div className="relative flex overflow-x-hidden w-full border-y border-slate-100/80 bg-slate-50/50">
        <div className="flex animate-marquee whitespace-nowrap py-6">
          {marqueeItems.map((client, i) => (
            <div 
              key={`client-${i}`} 
              className="mx-16 flex flex-col items-center justify-center text-center transition-all duration-500 cursor-default group"
            >
              <span className="text-2xl font-black tracking-tighter text-slate-800 uppercase opacity-40 group-hover:text-brand-600 group-hover:opacity-100 transition-all duration-300">
                {client.main}
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-1 opacity-60 group-hover:text-slate-600 group-hover:opacity-100 transition-all duration-300">
                {client.sub}
              </span>
            </div>
          ))}
        </div>

        {/* Glow Shadow Overlays for dynamic blend on white background */}
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />
      </div>
    </section>
  );
}
