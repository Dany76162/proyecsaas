"use client";

import React from "react";
import { motion } from "framer-motion";
import { Compass, Smartphone, Sparkles, Volume2, Maximize, CheckCircle2 } from "lucide-react";

export function Tour360Section() {
  return (
    <section id="tour-360" className="relative overflow-hidden bg-slate-900 py-24 text-slate-100 border-b border-slate-800">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-3xl opacity-40 pointer-events-none -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-3xl opacity-30 pointer-events-none translate-y-1/3 -translate-x-1/3" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* TEXTO INFORMATIVO (IZQUIERDA) */}
          <div className="flex-1 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 border border-brand-500/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-400">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Exclusivo de RaícesPilot
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
                Tours Virtuales 360° <br />
                <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  Solo con tu celular.
                </span>
              </h2>
              <p className="text-lg leading-relaxed text-slate-300">
                Olvidate de comprar cámaras 360° costosas o de lidiar con trípodes y configuraciones complejas. Con nuestro nuevo **Escáner Continuo por Giroscopio**, cualquiera de tus agentes puede crear un tour virtual inmersivo de calidad profesional en menos de 2 minutos usando únicamente su teléfono móvil.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {[
                {
                  icon: Smartphone,
                  color: "text-brand-400",
                  bg: "bg-brand-500/10",
                  title: "Escaneo Continuo Guiado",
                  desc: "Presioná 'Escanear' y girá lentamente. El giroscopio del celular detecta la rotación y captura los frames de manera inteligente en tiempo real."
                },
                {
                  icon: Volume2,
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/10",
                  title: "Voz Guía Asistida (Web Speech API)",
                  desc: "La app te habla al oído mientras te moves. Te avisa si girás muy rápido, cuándo apuntar al techo o al piso, y cuándo se completa el escaneo."
                },
                {
                  icon: Compass,
                  color: "text-indigo-400",
                  bg: "bg-indigo-500/10",
                  title: "Detección Inteligente de Zonas",
                  desc: "El sistema mapea las orientaciones esféricas en tiempo real dividiendo el progreso en Frente, Techo y Piso para lograr una cobertura inmersiva total."
                },
                {
                  icon: Maximize,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10",
                  title: "Costura (Stitching) en la Nube",
                  desc: "Nuestro microservicio inteligente une los frames tomados en segundos, resolviendo las costuras automáticamente para entregar una escena 360° perfecta."
                }
              ].map((item, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-sm font-semibold text-brand-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Disponible desde cualquier navegador móvil. Sin descargar aplicaciones.</span>
            </div>
          </div>

          {/* HUD INTERACTIVO ANIMADO (DERECHA) */}
          <div className="flex-1 w-full flex justify-center items-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative w-full max-w-[340px] aspect-[9/18.5] rounded-[3rem] border-[8px] border-slate-800 bg-slate-950 p-3 shadow-2xl ring-1 ring-white/10 overflow-hidden"
            >
              {/* Celular Front feed mock */}
              <div className="absolute inset-0 z-0 bg-slate-900">
                <img 
                  src="https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop" 
                  alt="Escena del ambiente a escanear" 
                  className="w-full h-full object-cover opacity-60 brightness-[0.7] saturate-[0.8]"
                />
              </div>

              {/* Scanning Sweep Line Animation */}
              <motion.div 
                animate={{ top: ["10%", "90%", "10%"] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] z-10"
              />

              {/* HUD / Scanning Targets Overlay */}
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 pointer-events-none select-none">
                
                {/* Header HUD */}
                <div className="flex items-center justify-between rounded-full bg-black/60 px-3 py-1.5 backdrop-blur border border-white/5 text-[9px] font-bold">
                  <span className="text-white">Escáner: Living</span>
                  <span className="text-brand-400 animate-pulse">● Grabando</span>
                </div>

                {/* Grid of Dots (premium HUD style) */}
                <div className="absolute inset-0 flex items-center justify-center p-12 opacity-60">
                  <div className="grid grid-cols-5 gap-6 text-center w-full">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`h-1.5 w-1.5 rounded-full inline-block ${
                          i % 3 === 0 
                            ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" 
                            : "bg-white/20"
                        }`} 
                      />
                    ))}
                  </div>
                </div>

                {/* Target Circle (Center Alignment) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="h-24 w-24 rounded-full border-[3px] border-emerald-400/80 bg-emerald-400/5 flex items-center justify-center animate-pulse">
                    <span className="text-2xl font-bold text-emerald-300">✓</span>
                  </div>
                  
                  {/* Floating speech assistant bubble */}
                  <motion.div 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="mt-6 bg-slate-950/95 border border-white/10 rounded-2xl px-4 py-2.5 text-center backdrop-blur shadow-xl max-w-[200px]"
                  >
                    <p className="text-[10px] font-extrabold text-cyan-300 tracking-wide uppercase flex items-center gap-1.5 justify-center">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                      Voz Asistente
                    </p>
                    <p className="text-[11px] font-medium text-white/90 mt-1 leading-snug">
                      "Girá lentamente... ¡Área escaneada!"
                    </p>
                  </motion.div>
                </div>

                {/* Bottom HUD - Progress */}
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex flex-col gap-1 rounded-xl bg-black/60 p-2.5 border border-white/5 backdrop-blur text-[8px] font-bold text-white/80">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">🔵 FRENTE:</span>
                      <span>10/12 (83%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-300">🟡 TECHO:</span>
                      <span>4/6 (66%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-500">🟢 PISO:</span>
                      <span>4/6 (66%)</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-brand-600/90 border border-brand-500/30 px-3 py-2 text-center shadow-lg">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white">
                      Escaneo Completo 80%
                    </p>
                  </div>
                </div>

              </div>

              {/* Speaker Speaker cutout at phone top */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30" />
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
