"use client";

/**
 * VisualProjectEditorShell — Paso 4 del wizard de Desarrollos.
 *
 * Contenedor con identidad visual propia para el Editor Visual del Proyecto.
 * En esta fase inicial reutiliza MasterplanMap variant="editor" como superficie
 * de edición. En Fase 2 se reemplazará por un editor Konva/SVG propio.
 */

import dynamic from "next/dynamic";
import { AlertCircle, CheckCircle2, Clock, Layers, MapPin, PenLine, TreePine, Route, Tag } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const MasterplanMap = dynamic(() => import("@/components/masterplan/masterplan-map"), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-slate-950 text-white gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm font-semibold text-slate-400">Cargando editor visual...</span>
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
        label: "Ajustar Plano",
        description: "Calibrá el plano sobre el satélite",
        icon: MapPin,
        status: "available",
    },
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
    step3Done: boolean;
    centerLat?: number;
    centerLng?: number;
    mapZoom?: number;
}

export default function VisualProjectEditorShell({
    proyectoId,
    step3Done,
    centerLat,
    centerLng,
    mapZoom,
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
                                Construí las capas visuales del desarrollo: calles, áreas verdes, perímetro y accesos.
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

                {/* Aviso fase inicial */}
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Fase 1
                    </span>
                    Editor visual inicial: la superficie de edición usa el mapa actual. El editor avanzado estará disponible en la próxima fase.
                </div>
            </div>

            {/* Warning si no hay lotes */}
            {!step3Done && (
                <div className="shrink-0 flex items-center gap-2 mx-3 mt-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Sincronizá los lotes en el{" "}
                    <Link href="?tab=masterplan" className="underline font-bold">
                        Paso 3 — Masterplan
                    </Link>{" "}
                    para poder editar el mapa visual.
                </div>
            )}

            {/* Mapa — superficie de edición */}
            <div className="flex-1 min-h-0 overflow-hidden border-t-0 border border-slate-200 dark:border-slate-800 rounded-b-2xl">
                <MasterplanMap
                    proyectoId={proyectoId}
                    modo="admin"
                    canEdit={true}
                    variant="editor"
                    centerLat={centerLat}
                    centerLng={centerLng}
                    mapZoom={mapZoom}
                />
            </div>
        </div>
    );
}
