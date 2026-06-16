"use client";

import Link from "next/link";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2, PencilRuler, Layers, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type PlanEditorProProps = {
  orgSlug: string;
  developmentId: string;
  developmentName: string;
  masterplanSVG: string | null;
};

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
  return (
    <div className="absolute bottom-5 right-5 z-20 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <button type="button" onClick={() => zoomIn()} className={btn} aria-label="Acercar" title="Acercar">
        <ZoomIn className="h-4.5 w-4.5" />
      </button>
      <button type="button" onClick={() => zoomOut()} className={btn} aria-label="Alejar" title="Alejar">
        <ZoomOut className="h-4.5 w-4.5" />
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        className={btn}
        aria-label="Centrar"
        title="Centrar / ajustar"
      >
        <Maximize2 className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}

export function PlanEditorPro({
  orgSlug,
  developmentId,
  developmentName,
  masterplanSVG,
}: PlanEditorProProps) {
  const backHref = `/${orgSlug}/developments/${developmentId}?tab=blueprint`;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950",
        "h-[calc(100dvh-3.5rem)] -mx-4 -my-5 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8",
      )}
    >
      {/* Toolbar moderno */}
      <header className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al plano
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <PencilRuler className="h-4.5 w-4.5" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">{developmentName}</h1>
              <p className="text-[11px] font-medium text-slate-500">Editor de plano — Pro</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 sm:inline-flex">
          <Sparkles className="h-3.5 w-3.5" />
          Herramientas de dibujo — próximamente
        </div>
      </header>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden">
        {masterplanSVG ? (
          <TransformWrapper minScale={0.2} maxScale={8} limitToBounds={false} centerOnInit>
            <ZoomControls />
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", height: "100%" }}
            >
              <div
                className="flex h-full w-full items-center justify-center p-8 [&_svg]:h-auto [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: masterplanSVG }}
              />
            </TransformComponent>
          </TransformWrapper>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200/70 text-slate-400 dark:bg-slate-800">
              <Layers className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Todavía no hay un plano cargado
            </p>
            <p className="max-w-sm text-xs font-medium leading-relaxed text-slate-400">
              Subí el plano del proyecto en el Paso 2 (Plano del Proyecto) y volvé acá para editarlo
              sobre el plano vivo.
            </p>
            <Link
              href={backHref}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-slate-800"
            >
              Ir a subir el plano
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
