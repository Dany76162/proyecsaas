"use client";

/**
 * VisualProjectEditorShell - Paso 4 del wizard de Desarrollos.
 *
 * Superficie de edicion visual del proyecto. El plano SVG/masterplan es el
 * protagonista; la georreferencia y el overlay sobre mapa real quedan en Paso 5.
 */

import dynamic from "next/dynamic";
import { useState } from "react";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Clock,
    LayoutTemplate,
    Layers,
    MapPin,
    PenLine,
    Route,
    Scissors,
    Tag,
    TreePine,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import ProjectLayersEditorPanel from "./project-layers-editor-panel";

const MasterplanViewer = dynamic(() => import("@/components/masterplan/masterplan-viewer"), {
    ssr: false,
    loading: () => (
        <div className="flex flex-1 items-center justify-center gap-2 bg-slate-950 text-white">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
        description: "Crear capas, estilos, visibilidad y eliminacion",
        icon: Layers,
        status: "available",
    },
    {
        label: "Plano interactivo",
        description: "Zoom, filtros, seleccion de lotes y estados",
        icon: PenLine,
        status: "available",
    },
    {
        label: "Division de etapas",
        description: "Segmentacion visual de lotes sobre el plano",
        icon: Scissors,
        status: "available",
    },
    {
        label: "Calles y accesos",
        description: "Dibujo visual sobre coordenadas del plano",
        icon: Route,
        status: "soon",
    },
    {
        label: "Areas y zonas",
        description: "Verdes, amenities, zonas comerciales y perimetro",
        icon: TreePine,
        status: "soon",
    },
    {
        label: "Etiquetas libres",
        description: "Nombres de calles, referencias y textos del plano",
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
}: VisualProjectEditorShellProps) {
    const [showProjectLayers, setShowProjectLayers] = useState(false);

    return (
        <div className="flex h-full min-h-[640px] flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 pb-2 pt-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500/10">
                            <PenLine className="h-4 w-4 text-brand-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black leading-tight text-slate-800 dark:text-white">
                                Editor Visual del Proyecto
                            </h2>
                            <p className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                                Trabaja sobre el plano del desarrollo: lotes, estados, etapas y capas visuales futuras.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {TOOLS.map((tool) => {
                            const Icon = tool.icon;
                            const isAvailable = tool.status === "available";
                            return (
                                <div
                                    key={tool.label}
                                    title={tool.description}
                                    className={cn(
                                        "flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors",
                                        isAvailable
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                                            : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                                    )}
                                >
                                    <Icon className="h-3 w-3 shrink-0" />
                                    <span>{tool.label}</span>
                                    {isAvailable ? (
                                        <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
                                    ) : (
                                        <>
                                            <Clock className="h-2.5 w-2.5 shrink-0 text-slate-400" />
                                            <span className="uppercase tracking-wide">Proximamente</span>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Editor inicial
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        El dibujo libre de calles, areas, perimetro y etiquetas queda marcado como Proximamente hasta contar con persistencia visual propia.
                    </span>
                    <Link
                        href="?tab=mapa"
                        className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-brand-500 transition-colors hover:text-brand-600"
                    >
                        <MapPin className="h-3 w-3 shrink-0" />
                        Ajuste geografico - Paso 5
                        <ArrowRight className="h-3 w-3 shrink-0" />
                    </Link>
                </div>
            </div>

            {!step2Done && (
                <div className="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                        Subi el plano del proyecto en el{" "}
                        <Link href="?tab=blueprint" className="font-bold underline">
                            Paso 2 - Plano del Proyecto
                        </Link>{" "}
                        para trabajar sobre el diseno visual.
                    </span>
                </div>
            )}

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-2xl border border-t-0 border-slate-200 dark:border-slate-800">
                {step2Done ? (
                    <>
                        <div className="absolute right-4 top-4 z-30">
                            <button
                                type="button"
                                onClick={() => setShowProjectLayers((value) => !value)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black shadow-lg backdrop-blur-sm transition-all",
                                    showProjectLayers
                                        ? "border-brand-400 bg-brand-500 text-white"
                                        : "border-slate-700 bg-slate-900/90 text-slate-100 hover:bg-slate-800"
                                )}
                            >
                                <Layers className="h-3.5 w-3.5" />
                                Capas del Proyecto
                            </button>
                        </div>

                        <MasterplanViewer proyectoId={proyectoId} modo="admin" canEdit={true} />

                        {showProjectLayers && (
                            <div className="absolute bottom-4 right-4 top-16 z-40 w-[min(360px,calc(100vw-2rem))]">
                                <ProjectLayersEditorPanel
                                    proyectoId={proyectoId}
                                    onClose={() => setShowProjectLayers(false)}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10">
                            <LayoutTemplate className="h-8 w-8 text-brand-500/60" />
                        </div>
                        <div className="max-w-sm space-y-1.5">
                            <p className="text-sm font-bold text-slate-300">Sin plano cargado todavia</p>
                            <p className="text-xs leading-relaxed text-slate-500">
                                Carga el plano DXF, SVG, PDF o imagen en el Paso 2 para comenzar a trabajar sobre el plano visual.
                            </p>
                        </div>
                        <Link
                            href="?tab=blueprint"
                            className="inline-flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/10 px-4 py-2 text-xs font-bold text-brand-400 transition-all hover:border-brand-500/40 hover:bg-brand-500/20"
                        >
                            <ArrowRight className="h-3.5 w-3.5" />
                            Ir al Paso 2 - Plano del Proyecto
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
