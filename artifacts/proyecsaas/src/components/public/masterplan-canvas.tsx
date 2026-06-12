"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Camera, Globe, LayoutTemplate, MapPin } from "lucide-react";
import Link from "next/link";
import type { MasterplanUnit } from "@/lib/masterplan-store";
import type { PublicOverlayConfig } from "@/components/masterplan/masterplan-map";
import type { DevelopmentDrawableLayerDto } from "@/types/development-layers";

const MasterplanViewer = dynamic(
    () => import("@/components/masterplan/masterplan-viewer"),
    { ssr: false, loading: () => <CanvasLoading label="Cargando plano..." /> },
);

const MasterplanMap = dynamic(
    () => import("@/components/masterplan/masterplan-map"),
    { ssr: false, loading: () => <CanvasLoading label="Cargando mapa..." /> },
);

function CanvasLoading({ label }: { label: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900/60">
            <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                <p className="text-sm font-bold text-slate-500">{label}</p>
            </div>
        </div>
    );
}

const STATUS_LEGEND: Array<[string, string]> = [
    ["Disponible", "bg-emerald-500"],
    ["Reservado", "bg-amber-500"],
    ["Vendido", "bg-rose-500"],
    ["Bloqueado", "bg-slate-400"],
];

export interface MasterplanCanvasProps {
    proyectoId: string;
    units: MasterplanUnit[];
    planAsset: string | null;
    mapCenterLat: number | null;
    mapCenterLng: number | null;
    mapZoom: number | null;
    hasMap: boolean;
    hasTour360: boolean;
    slug: string;
    /** Geo-transform config for polygon rendering (from server-rendered page, avoids auth-gated API). */
    initialOverlayConfig?: PublicOverlayConfig | null;
    initialDrawableLayers?: DevelopmentDrawableLayerDto[];
    orgSlug?: string;
    developmentId?: string;
}

export default function MasterplanCanvas({
    proyectoId,
    units,
    planAsset,
    mapCenterLat,
    mapCenterLng,
    mapZoom,
    hasMap,
    hasTour360,
    slug,
    initialOverlayConfig,
    initialDrawableLayers = [],
    orgSlug,
    developmentId,
}: MasterplanCanvasProps) {
    const [view, setView] = useState<"plano" | "mapa">("plano");

    const hasContent = planAsset || units.length > 0 || hasMap;

    if (!hasContent) {
        return (
            <div className="overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-lg">
                <div className="flex h-64 w-full flex-col items-center justify-center gap-4 text-center px-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                        <MapPin className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-300">El mapa interactivo estará disponible próximamente.</p>
                        <p className="mt-1 text-xs text-slate-500">En cuanto esté listo podrás explorar la disponibilidad de lotes en tiempo real.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Switch + leyenda — siempre arriba, no se mueve */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div
                    role="group"
                    aria-label="Cambiar vista del masterplan"
                    className="inline-flex items-center gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm"
                >
                    <button
                        type="button"
                        onClick={() => setView("plano")}
                        aria-pressed={view === "plano"}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                            view === "plano"
                                ? "bg-brand-500 text-white shadow"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <LayoutTemplate className="h-4 w-4" />
                        Plano
                    </button>
                    {hasMap && (
                        <button
                            type="button"
                            onClick={() => setView("mapa")}
                            aria-pressed={view === "mapa"}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                view === "mapa"
                                    ? "bg-brand-500 text-white shadow"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Globe className="h-4 w-4" />
                            Mapa
                        </button>
                    )}
                    {hasTour360 && (
                        <Link
                            href={`/proyectos/${slug}/tour360`}
                            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-muted-foreground transition-all hover:text-foreground"
                        >
                            <Camera className="h-4 w-4" />
                            Tour 360
                        </Link>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    {STATUS_LEGEND.map(([label, tone]) => (
                        <span
                            key={label}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground"
                        >
                            <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Mismo contenedor para los dos modos — solo cambia el contenido interno */}
            <div className="overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-lg">
                <div className="h-[88vh] min-h-[620px] w-full bg-white">
                    {view === "plano" ? (
                        <MasterplanViewer
                            proyectoId={proyectoId}
                            modo="public"
                            canEdit={false}
                            initialUnits={units}
                            backgroundAssetUrl={planAsset}
                            orgSlug={orgSlug}
                            developmentId={developmentId}
                        />
                    ) : (
                        <MasterplanMap
                            proyectoId={proyectoId}
                            modo="public"
                            canEdit={false}
                            variant="viewer"
                            initialUnits={units}
                            overlayImageUrl={planAsset || undefined}
                            centerLat={mapCenterLat ?? undefined}
                            centerLng={mapCenterLng ?? undefined}
                            mapZoom={mapZoom ?? undefined}
                            initialOverlayConfig={initialOverlayConfig}
                            initialDrawableLayers={initialDrawableLayers}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
