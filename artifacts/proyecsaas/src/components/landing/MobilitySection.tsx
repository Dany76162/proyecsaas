"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Globe, Smartphone, Laptop, Compass, LayoutGrid, CheckCircle2, Home, UserPlus, BookOpen, Users, MessageSquare, MapPin, Building2, Sliders, Calendar, Settings, LogOut } from "lucide-react";

export function MobilitySection() {
  return (
    <section className="bg-slate-50 py-24 border-b border-slate-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-brand-100/30 rounded-full blur-3xl opacity-50 pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* MOCKUP INTERACTIVO - IZQUIERDA (REAL DASHBOARD STYLE) */}
          <div className="flex-1 w-full order-2 lg:order-1">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative mx-auto w-full max-w-2xl"
            >
              {/* Laptop Mockup (Dashboard Real Style) */}
              <div className="relative aspect-[16/10] w-full rounded-2xl bg-slate-900 p-2 shadow-2xl ring-1 ring-slate-800">
                <div className="h-full w-full overflow-hidden rounded-xl bg-white flex shadow-inner">
                  
                  {/* Sidebar (Navy - Exacto al real) */}
                  <div className="w-[22%] bg-[#0f172a] h-full flex flex-col shrink-0 text-[7px] text-slate-400">
                    <div className="p-3 border-b border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                        <img 
                          src="/brand/logo_transparent_icon.png" 
                          alt="Logo" 
                          className="h-4 w-4 object-contain brightness-0 invert" 
                        />
                        RAICESPILOT
                      </div>
                      <div className="text-[5px] opacity-60">Real Estate</div>
                    </div>
                    
                    <div className="flex-1 py-3 px-2 space-y-4">
                      <div className="space-y-1.5">
                        <div className="px-2 text-[5px] uppercase tracking-widest opacity-40 font-bold">Operación</div>
                        {[
                          { icon: Home, label: "Inicio" },
                          { icon: CheckCircle2, label: "Bienvenida", active: true },
                          { icon: UserPlus, label: "Captación" },
                          { icon: BookOpen, label: "Manual de uso" },
                          { icon: Users, label: "Prospectos" },
                          { icon: MessageSquare, label: "Conversaciones" },
                          { icon: MapPin, label: "Visitas" },
                          { icon: Building2, label: "Propiedades" },
                        ].map((item, i) => (
                          <div key={i} className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded transition-colors",
                            item.active ? "bg-slate-800 text-white" : "hover:bg-slate-800/50"
                          )}>
                            <item.icon className={cn("h-2.5 w-2.5", item.active ? "text-brand-400" : "opacity-40")} />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5">
                        <div className="px-2 text-[5px] uppercase tracking-widest opacity-40 font-bold">Automatización</div>
                        <div className="flex items-center gap-2 px-2 py-1"><Sliders className="h-2.5 w-2.5 opacity-40" /><span>Agentes IA</span></div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-slate-800 bg-[#1e293b]/30">
                      <div className="flex items-center gap-2">
                         <div className="h-5 w-5 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-white font-bold">D</div>
                         <div className="flex-1 overflow-hidden">
                            <div className="text-white truncate font-bold">Daniel</div>
                            <div className="text-[5px] opacity-40 truncate">Titular</div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Panel (Exacto al real) */}
                  <div className="flex-1 bg-slate-50 h-full flex flex-col overflow-hidden">
                    {/* Top Header */}
                    <div className="h-8 border-b border-slate-200 bg-white flex items-center px-4 justify-between shrink-0">
                      <div className="text-[6px] font-bold text-brand-600 uppercase tracking-widest">Panel de Inmobiliaria</div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-12 bg-slate-100 rounded" />
                        <div className="h-4 w-4 rounded-full bg-slate-200" />
                      </div>
                    </div>

                    {/* Dashboard Content */}
                    <div className="flex-1 p-4 space-y-4 overflow-hidden">
                      {/* Hero Card (Navy Blue) */}
                      <div className="bg-[#0f172a] rounded-xl p-5 text-white relative overflow-hidden">
                        <div className="relative z-10 space-y-3">
                          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[6px] font-bold uppercase">
                            Puesta en marcha <span className="opacity-60">4/5 completados</span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Primeros pasos en Raices Pilot</h4>
                            <h3 className="text-sm font-bold leading-tight max-w-[70%]">Configura tu inmobiliaria y empeza a convertir consultas en visitas</h3>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[6px] font-bold">
                              <span>Progreso inicial</span>
                              <span>80%</span>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 whileInView={{ width: "80%" }}
                                 transition={{ duration: 1.5, delay: 0.5 }}
                                 className="h-full bg-emerald-500" 
                               />
                            </div>
                          </div>
                        </div>
                        {/* Abstract background shape */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                      </div>

                      {/* Steps Area */}
                      <div className="space-y-2">
                        <div className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">Paso 1 - Siguiente Paso</div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                           <div className="flex items-center gap-3">
                             <div className="h-7 w-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                             <div className="space-y-1">
                               <div className="h-2 w-24 bg-slate-900 rounded" />
                               <div className="h-1.5 w-48 bg-slate-100 rounded" />
                             </div>
                           </div>
                           <div className="h-5 w-16 bg-brand-600 rounded flex items-center justify-center text-[6px] text-white font-bold">A configuración</div>
                        </div>
                      </div>

                      {/* Step Completed Example */}
                      <div className="space-y-2 opacity-60">
                        <div className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">Paso 2</div>
                        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                           <div className="flex items-center gap-3">
                             <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[8px] font-bold">OK</div>
                             <div className="space-y-1">
                               <div className="h-2 w-32 bg-slate-900 rounded" />
                               <div className="h-1.5 w-56 bg-slate-100 rounded" />
                             </div>
                           </div>
                           <div className="h-5 w-16 border border-slate-200 rounded flex items-center justify-center text-[6px] text-slate-500 font-bold">Ver como funciona</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Mockup (AI Chat) - Superpuesto con diseño más prolijo */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -right-4 w-40 sm:w-48 aspect-[1/2] rounded-[2.5rem] bg-slate-900 p-1.5 shadow-2xl border-4 border-white ring-1 ring-slate-200 z-20"
              >
                <div className="h-full w-full overflow-hidden rounded-[2.1rem] bg-white flex flex-col">
                   {/* Chat Header (WhatsApp Style) */}
                   <div className="h-12 bg-[#075e54] text-white flex items-center px-4 gap-2 shrink-0">
                      <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center overflow-hidden p-1 border border-white/20">
                        <img 
                          src="/brand/logo_transparent_icon.png" 
                          alt="RaicesPilot" 
                          className="h-full w-full object-contain brightness-0 invert" 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[8px] font-bold leading-tight">RaicesPilot IA</div>
                        <div className="text-[5px] opacity-70">En línea</div>
                      </div>
                   </div>
                   {/* Chat Messages */}
                   <div className="flex-1 p-3 space-y-3 flex flex-col justify-end pb-8 bg-[#e5ddd5] bg-[url('https://i.pinimg.com/originals/97/c0/07/97c0075430c7c310b6193d9d37aa6510.jpg')] bg-repeat bg-[length:150px]">
                      {/* Client Message */}
                      <div className="self-start max-w-[85%] bg-white p-2 rounded-lg rounded-tl-none shadow-sm relative">
                         <p className="text-[7.5px] leading-snug text-slate-800">
                           Hola, estoy buscando un departamento de 3 ambientes en Palermo.
                         </p>
                         <div className="text-[4px] text-slate-400 text-right mt-1">14:02</div>
                      </div>
                      {/* AI Message */}
                      <div className="self-end max-w-[85%] bg-[#dcf8c6] p-2 rounded-lg rounded-tr-none shadow-sm relative">
                         <p className="text-[7.5px] leading-snug text-slate-800">
                           ¡Hola! Te ayudo con eso. Tengo 3 opciones disponibles en Palermo que podrían interesarte. ¿Buscás alquiler o compra?
                         </p>
                         <div className="text-[4px] text-slate-400 text-right mt-1">14:02 <span className="text-blue-500">✓✓</span></div>
                      </div>
                      {/* IA Status Indicator */}
                      <div className="flex justify-center">
                         <div className="px-2 py-0.5 bg-white/80 backdrop-blur-sm rounded-full text-[5px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
                           IA respondiendo...
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>

              {/* Decorative Glow */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-brand-500/10 blur-[80px] rounded-full" />
            </motion.div>
          </div>

          {/* TEXTO - DERECHA */}
          <div className="flex-1 space-y-8 text-left order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
              <Globe className="h-3.5 w-3.5" />
              Ubicuidad total
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl leading-tight">
                Controlá tu empresa desde cualquier lugar
              </h2>
              <p className="text-lg leading-relaxed text-slate-600 max-w-2xl">
                RaicesPilot funciona desde la web, sin instalaciones ni descargas pesadas. Desde tu computadora o celular podés verificar leads, conversaciones y seguimiento comercial sin estar físicamente en la oficina.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center gap-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Operación Móvil</div>
                  <div className="text-xs text-slate-500">Monitoreá la actividad 24/7.</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Laptop className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Acceso Web Directo</div>
                  <div className="text-xs text-slate-500">Sin depender de una sola PC.</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Sin instalar nada. Todo desde la web. Siempre disponible.</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
