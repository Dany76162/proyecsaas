"use client";

import { CheckCircle2, AlertCircle, Layers, Route, Type, TreePine, Dumbbell, Tag } from "lucide-react";

interface VisualProjectEditorShellProps {
  proyectoId: string;
  step2Done: boolean;
  step3Done: boolean;
}

export default function VisualProjectEditorShell({
  step2Done,
  step3Done,
}: VisualProjectEditorShellProps) {
  return (
    <div className="flex flex-col gap-6 p-6 min-h-[640px] bg-slate-950 text-white">

      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-white">Editor Visual</h2>
        <p className="mt-1 text-sm text-slate-400">
          Estamos preparando el nuevo editor visual del desarrollo.
        </p>
      </div>

      {/* Estado del plano */}
      {!step2Done ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Primero cargá el plano en el <strong>Paso 2</strong> para poder trabajar sobre el masterplan.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Plano detectado. El nuevo editor visual se implementará sobre este masterplan.
          </span>
        </div>
      )}

      {/* Advertencia Paso 3 */}
      {!step3Done && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Recomendado: revisá el Masterplan en el <strong className="text-slate-300">Paso 3</strong> antes de editar visualmente.
          </span>
        </div>
      )}

      {/* Cuerpo — dos columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Lo que habrá */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
            Este editor será para
          </h3>
          <ul className="space-y-3">
            {[
              { icon: Route,    label: "Calles internas y accesos" },
              { icon: Type,     label: "Textos y etiquetas sobre el plano" },
              { icon: TreePine, label: "Zonas verdes y espacios comunes" },
              { icon: Dumbbell, label: "Amenities y equipamientos" },
              { icon: Tag,      label: "Referencias visuales del proyecto" },
              { icon: Layers,   label: "Capas decorativas sobre el plano" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Lo que NO habrá */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
            Este editor NO será para
          </h3>
          <ul className="space-y-3">
            {[
              "Georreferenciación del proyecto",
              "Visualización sobre mapa satelital",
              "Overlay geográfico de plano",
              "Coordenadas reales del mapa",
            ].map((label) => (
              <li key={label} className="flex items-center gap-3 text-sm text-slate-400">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-600">
                  <span className="text-base leading-none">✕</span>
                </span>
                {label}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500 leading-relaxed border-t border-slate-800 pt-3">
            Todo lo relacionado con el mapa satelital y las coordenadas geográficas reales
            pertenece al <strong className="text-slate-400">Paso 5 — Mapa Interactivo</strong>.
          </p>
        </div>

      </div>
    </div>
  );
}
