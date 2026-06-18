"use client";

import React from "react";
import { motion } from "framer-motion";
import { Compass, Smartphone, Sparkles, Eye, Building2, Camera, CheckCircle2, MoveHorizontal } from "lucide-react";

export function Tour360Section() {
  return (
    <section id="tour-360" className="relative overflow-hidden bg-white dark:bg-slate-950 py-24 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-900 transition-colors duration-300">

      {/* Background Decorative Gradients - Softened for light theme, highlighted in dark */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-3xl opacity-60 pointer-events-none -translate-y-1/3 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl opacity-50 pointer-events-none translate-y-1/3 -translate-x-1/3" />

      <div className="mx-auto max-w-7xl px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* TEXTO INFORMATIVO (IZQUIERDA) */}
          <div className="flex-1 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-450">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand-600 dark:text-brand-400" />
              Exclusivo de RaícesPilot
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl leading-tight">
                Tours Virtuales 360° <br />
                <span className="text-brand-600 dark:text-brand-400">
                  Mostrá cada propiedad como si estuvieran ahí.
                </span>
              </h2>
              <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-350">
                Subí un tour 360° navegable de una vivienda o de un desarrollo y compartilo por enlace. Tus clientes lo recorren ambiente por ambiente desde el navegador del celular o la computadora, sin descargar ninguna app y sin comprar cámaras costosas.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {[
                {
                  icon: Eye,
                  color: "text-brand-600 dark:text-brand-400",
                  bg: "bg-brand-50 dark:bg-brand-500/10",
                  title: "Recorrido inmersivo en 360°",
                  desc: "Tus clientes giran la vista en cualquier dirección —paredes, techo y piso— y recorren ambiente por ambiente como si estuvieran parados adentro.",
                  soon: false
                },
                {
                  icon: Smartphone,
                  color: "text-cyan-600 dark:text-cyan-400",
                  bg: "bg-cyan-50 dark:bg-cyan-500/10",
                  title: "Sin apps, desde el celular",
                  desc: "El tour se abre en el navegador del teléfono o la compu. Lo compartís por enlace y lo recorren al instante, sin instalar nada.",
                  soon: false
                },
                {
                  icon: Building2,
                  color: "text-indigo-600 dark:text-indigo-400",
                  bg: "bg-indigo-50 dark:bg-indigo-500/10",
                  title: "Para viviendas y desarrollos",
                  desc: "Mostrá una casa o un departamento, o recorré las calles, lotes y amenities de un loteo o desarrollo en 360°.",
                  soon: false
                },
                {
                  icon: Camera,
                  color: "text-emerald-600 dark:text-emerald-450",
                  bg: "bg-emerald-50 dark:bg-emerald-500/10",
                  title: "Creá el tour con tu propio celular",
                  desc: "Estamos terminando el escáner por giroscopio: vas a poder generar el tour 360° grabando con la cámara del teléfono, sin trípodes ni cámaras 360° costosas.",
                  soon: true
                }
              ].map((item, index) => (
                <div key={index} className={`flex gap-4 p-4 rounded-2xl border transition-all duration-300 ${item.soon ? "border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50/40 dark:bg-slate-900/20" : "border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/40"}`}>
                  <div className={`h-10 w-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
                      {item.soon && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                          Próximamente
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-sm font-semibold text-brand-600 dark:text-brand-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>El visor funciona desde cualquier navegador móvil. Sin descargar aplicaciones.</span>
            </div>
          </div>

          {/* VISOR 360° INTERACTIVO (DERECHA) */}
          <div className="flex-1 w-full flex justify-center items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative w-full max-w-[340px] aspect-[9/18.5] rounded-[3rem] border-[8px] border-slate-800 dark:border-slate-900 bg-slate-950 p-3 shadow-2xl ring-1 ring-white/10 dark:ring-white/5 overflow-hidden"
            >
              {/* Escena 360° de la propiedad (con leve paneo continuo) */}
              <div className="absolute inset-0 z-0 overflow-hidden">
                <motion.img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop"
                  alt="Recorrido 360° de una vivienda"
                  className="h-full w-[120%] max-w-none object-cover"
                  animate={{ x: ["0%", "-16%", "0%"] }}
                  transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Vignette para legibilidad del HUD */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55" />
              </div>

              {/* HUD del visor */}
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-5 pointer-events-none select-none">

                {/* Header: escena + badge 360 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 backdrop-blur border border-white/10 text-[10px] font-bold text-white">
                    <Compass className="h-3 w-3 text-brand-300" />
                    Casa modelo · Living
                  </div>
                  <div className="rounded-full bg-brand-600/90 px-2.5 py-1 text-[10px] font-black text-white shadow-lg border border-brand-500/30">
                    360°
                  </div>
                </div>

                {/* Centro: hotspots + ayuda de arrastre */}
                <div className="relative flex items-center justify-center">
                  {/* Hotspots para cambiar de ambiente */}
                  <span className="absolute left-[16%] -top-12 h-3 w-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] ring-4 ring-white/25 animate-pulse" />
                  <span className="absolute right-[18%] top-10 h-3 w-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] ring-4 ring-white/25 animate-pulse" />
                  {/* Ayuda: arrastrá para mirar */}
                  <motion.div
                    animate={{ x: [-8, 8, -8] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 backdrop-blur border border-white/10 shadow-xl"
                  >
                    <MoveHorizontal className="h-4 w-4 text-white" />
                    <span className="text-[10px] font-semibold text-white/90">Arrastrá para mirar</span>
                  </motion.div>
                </div>

                {/* Bottom: selector de ambientes */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {["Living", "Cocina", "Dormitorio", "Exterior"].map((s, i) => (
                    <span
                      key={s}
                      className={`rounded-lg px-2 py-1 text-[9px] font-bold backdrop-blur border ${
                        i === 0
                          ? "bg-brand-600/90 border-brand-500/40 text-white shadow-lg"
                          : "bg-black/45 border-white/10 text-white/80"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>

              </div>

              {/* Speaker cutout at phone top */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30" />
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
