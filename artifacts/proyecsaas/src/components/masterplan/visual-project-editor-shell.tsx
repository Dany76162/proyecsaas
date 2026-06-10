"use client";

/**
 * VisualProjectEditorShell — Paso 4 del wizard de Desarrollos.
 *
 * Superficie de diseño visual del proyecto: calles, manzanas, áreas verdes,
 * perímetro, etiquetas, amenities y etapas. El plano SVG es el protagonista.
 *
 * El ajuste geográfico (overlay sobre mapa real) queda en Paso 5 — Mapa Interactivo.
 *
 * Fase 1: muestra MasterplanViewer como canvas de referencia.
 * Fase 2: se reemplazará por editor Konva/SVG con herramientas de dibujo.
 */

import dynamic from "next/dynamic";
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Layers,
    PenLine,
    TreePine,
    Route,
    Tag,
    MapPin,
    ArrowRight,
    LayoutTemplate,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MasterplanViewer = dynamic(() => import("@/components/masterplan/masterplan-viewer"), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-slate-950 text-white gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-semibold text-slate-400">Cargando plano visual...</span>
        </div>
    ),
});

interface Tool {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    status: "available" | "soon";
}

const TOOLS: Tool[] = [
    {
        label: "Capas del Proyecto",
        description: "Dibujá calles, áreas verdes y perímetro",
        icon: Layers,
        status: "available",
    },
    {
        label: "Nombres de Calles",
        description: "Etiquetas flotantes para calles y accesos",
        icon: Route,
        status: "soon",
    },
    {
        label: "Áreas y Zonas",
        description: "Etapas, zonas comerciales y amenities",
        icon: TreePine,
        status: "soon",
    },
    {
        label: "Etiquetas Libres",
        description: "Texto libre sobre el plano",
        icon: Tag,
        status: "soon",
    },
];

interface VisualProjectEditorShellProps {
    proyectoId: string;
    step2Done: boolean;
    step3Done: boolean;
}

export default function VisualProjectEditorShell({
    proyectoId,
    step2Done,
    step3Done,
}: VisualProjectEditorShellProps) {
    return (
        <div className="flex-1 flex flex-col h-full min-h-[640px] overflow-hidden gap-0">
            {/* Header del Editor Visual */}
            <div className="shrink-0 px-4 pt-3 pb-2 flex flex-col gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                            <PenLine className="w-4 h-4 text-brand-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                                Editor Visual del Proyecto
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                Diseñá las capas visuales del desarrollo: calles, manzanas, áreas verdes, perímetro y amenities.
                            </p>
                        </div>
                    </div>

                    {/* Tool chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {TOOLS.map((tool) => {
                            const Icon = tool.icon;
                            const isAvailable = tool.status === "available";
                            return (
                                <div
                                    key={tool.label}
                                    title={tool.description}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors",
                                        isAvailable
                                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                                    )}
                                >
                                    <Icon className="w-3 h-3 shrink-0" />
                                    {tool.label}
                                    {isAvailable ? (
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                    ) : (
                                        <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Fase badge + aviso Step 5 */}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Fase 1
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        Editor visual inicial: diseñá el plano del desarrollo. El editor avanzado con dibujo libre estará disponible en la próxima fase.
                    </span>
                    <Link
                        href="?tab=mapa"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-500 hover:text-brand-600 transition-colors ml-auto shrink-0"
                    >
                        <MapPin className="w-3 h-3 shrink-0" />
                        Ajuste geográfico → Paso 5
                        <ArrowRight className="w-3 h-3 shrink-0" />
                    </Link>
                </div>
            </div>

            {/* Warning si no hay plano */}
            {!step2Done && (
                <div className="shrink-0 flex items-center gap-2 mx-3 mt-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Subí el plano del proyecto en el{" "}
                    <Link href="?tab=blueprint" className="underline font-bold">
                        Paso 2 — Plano del Proyecto
                    </Link>{" "}
                    para trabajar sobre el diseño visual.
                </div>
            )}

            {/* Canvas principal — plano visual */}
            <div className="flex-1 min-h-0 overflow-hidden border-t-0 border border-slate-200 dark:border-slate-800 rounded-b-2xl">
                {step2Done ? (
                    <MasterplanViewer
                        proyectoId={proyectoId}
                        modo="admin"
                        canEdit={true}
                    />
                ) : (
                    /* Placeholder profesional cuando no hay plano */
                    <div className="w-full h-full flex flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                            <LayoutTemplate className="w-8 h-8 text-brand-500/60" />
                        </div>
                        <div className="space-y-1.5 max-w-sm">
                            <p className="text-sm font-bold text-slate-300">
                                Sin plano cargado todavía
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Cargá el plano DXF, SVG, PDF o imagen en el Paso 2 para comenzar a diseñar las capas visuales del desarrollo.
                            </p>
                        </div>
                        <Link
                            href="?tab=blueprint"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 hover:border-brand-500/40 text-brand-400 text-xs font-bold transition-all"
                        >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Ir al Paso 2 — Plano del Proyecto
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
