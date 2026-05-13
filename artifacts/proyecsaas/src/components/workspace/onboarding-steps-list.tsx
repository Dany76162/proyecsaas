"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, LayoutDashboard, Zap } from "lucide-react";
import { StatusBadge } from "@/components/workspace/status-badge";
import { SectionCard } from "@/components/workspace/section-card";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  key: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  serverStatus: "pending" | "completed";
}

interface OnboardingStepsListProps {
  orgSlug: string;
  steps: Step[];
}

export function OnboardingStepsList({ orgSlug, steps }: OnboardingStepsListProps) {
  const [localProgress, setLocalProgress] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(`onboarding_${orgSlug}`) || "[]");
    setLocalProgress(saved);
    setIsLoaded(true);
  }, [orgSlug]);

  const mergedSteps = steps.map((step) => ({
    ...step,
    isCompleted: step.serverStatus === "completed" || localProgress.includes(step.key),
  }));

  const completedCount = mergedSteps.filter((s) => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const nextStep = mergedSteps.find((s) => !s.isCompleted) || null;

  return (
    <div className="space-y-6">
      {/* Dynamic Progress Header */}
      <section className={cn(
        "rounded-[1.75rem] border p-6 text-white shadow-soft transition-all duration-700",
        progressPercent === 100 
          ? "border-emerald-500 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900" 
          : "border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900"
      )}>
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100">
                Puesta en marcha
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold text-slate-100 uppercase tracking-widest">
                {completedCount}/{steps.length} completados
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-200">
                Primeros pasos en Raices Pilot
              </p>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {progressPercent === 100 
                  ? "¡Todo listo para operar a máxima potencia!" 
                  : "Configurá tu inmobiliaria y empezá a convertir consultas"}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-200/80 font-medium">
                {progressPercent === 100
                  ? "Completaste el recorrido inicial. Tu inmobiliaria ya cuenta con la base necesaria para que la IA atienda y califique leads de forma profesional."
                  : "Este recorrido te muestra por dónde empezar, qué revisar primero y cómo pasar de una consulta a una oportunidad real sin perderte entre pantallas."}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-300">
                <span>Tu progreso</span>
                <span className={cn(progressPercent === 100 ? "text-emerald-400" : "text-brand-300")}>
                  {progressPercent}% COMPLETADO
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    progressPercent === 100 ? "bg-emerald-400" : "bg-brand-500"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-200">Qué vas a lograr</p>
            <div className="mt-4 space-y-3">
              {[
                "Dejar lista la base operativa de la inmobiliaria.",
                "Sincronizar tu inventario de propiedades con IA.",
                "Activar agentes 24/7 para que nada quede sin responder.",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">
                    ✓
                  </span>
                  <p className="text-sm font-medium leading-6 text-slate-100/90">{item}</p>
                </div>
              ))}
            </div>

            {nextStep ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-200">Próxima acción</p>
                <p className="mt-2 text-sm font-bold text-white">Paso {nextStep.number}: {nextStep.title}</p>
                <Link 
                  href={nextStep.href}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-white px-5 text-[11px] font-bold uppercase tracking-wider text-slate-900 transition hover:bg-slate-100"
                >
                  Ir al paso ahora
                </Link>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Recorrido finalizado</p>
                <p className="mt-2 text-sm font-medium text-slate-100">
                  Ya podés operar con confianza. El equipo y la IA están sincronizados.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Steps List */}
      <div className="space-y-4">
        {mergedSteps.map((step) => {
          const isNext = nextStep?.number === step.number;
          const isCompleted = step.isCompleted;

          return (
            <div
              key={step.number}
              className={cn(
                "group relative overflow-hidden rounded-[2rem] border p-6 transition-all duration-300",
                isCompleted 
                  ? "border-slate-100 bg-white/50 opacity-75" 
                  : isNext 
                    ? "border-brand-200 bg-white shadow-lg shadow-brand-500/5" 
                    : "border-slate-100 bg-white/80"
              )}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-5">
                  <div className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black transition-all",
                    isCompleted 
                      ? "bg-emerald-50 text-emerald-500" 
                      : isNext 
                        ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30" 
                        : "bg-slate-100 text-slate-400"
                  )}>
                    {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : step.number}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-[0.2em]",
                        isCompleted ? "text-emerald-600" : isNext ? "text-brand-600" : "text-slate-400"
                      )}>
                        {isCompleted ? "Paso completado" : `Paso ${step.number}`}
                      </span>
                      {isNext && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 uppercase">Recomendado</span>}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                    <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={step.href}
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-xl px-6 text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95",
                    isCompleted
                      ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      : isNext
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  {isCompleted ? "Revisar" : step.cta}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
