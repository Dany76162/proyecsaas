import Link from "next/link";

import { cn } from "@/lib/utils";
import type { SetupChecklistStatus } from "@/modules/organizations/types";

export type OnboardingStep = {
  key: "profile" | "properties" | "agent" | "whatsapp" | "operate";
  done: boolean;
  href: string;
  title: string;
  explanation: string;
  benefit: string;
  result: string;
  cta: string;
};

type SetupChecklistProps = {
  orgSlug: string;
  status: SetupChecklistStatus;
};

export function buildOnboardingSteps(
  orgSlug: string,
  status: SetupChecklistStatus,
): OnboardingStep[] {
  return [
    {
      key: "profile",
      done: status.profileComplete,
      href: `/${orgSlug}/settings/organization`,
      title: "Configurá tu inmobiliaria",
      explanation: "Completá los datos básicos del negocio para personalizar el workspace.",
      benefit: "Esto ordena la operación y hace que el sistema represente correctamente a tu marca.",
      result: "Tu inmobiliaria queda identificada con nombre, zona y datos principales.",
      cta: "Configurar inmobiliaria",
    },
    {
      key: "properties",
      done: status.propertiesLoaded,
      href: `/${orgSlug}/properties`,
      title: "Cargá tus propiedades",
      explanation: "Subí tu catálogo manualmente y dejá lista la base de inmuebles.",
      benefit: "Sin propiedades cargadas, el sistema no puede recomendar opciones ni ayudarte a captar mejor.",
      result: "Tu catálogo queda listo para compartir, mostrar y usar en conversaciones.",
      cta: "Cargar propiedades",
    },
    {
      key: "agent",
      done: status.agentConfigured,
      href: `/${orgSlug}/agents`,
      title: "Activá tu agente IA",
      explanation: "Configurá el agente de inteligencia artificial incluido en tu plan.",
      benefit: "El agente puede responder consultas, mostrar propiedades y ayudarte a no perder oportunidades.",
      result: "Tu inmobiliaria queda con un agente listo para empezar a trabajar.",
      cta: "Activar agente IA",
    },
    {
      key: "whatsapp",
      done: status.whatsappConnected,
      href: `/${orgSlug}/settings/integrations`,
      title: "Conectá WhatsApp",
      explanation: "Vinculá tu número de WhatsApp Business para operar desde la plataforma.",
      benefit: "Es el canal clave para que el agente IA atienda consultas reales de clientes.",
      result: "Tu WhatsApp queda conectado y preparado para empezar a operar.",
      cta: "Conectar WhatsApp",
    },
    {
      key: "operate",
      done: status.readyToOperate,
      href: `/${orgSlug}/properties`,
      title: "Empezá a operar",
      explanation: "Compartí tu catálogo y activá el flujo comercial desde propiedades y conversaciones.",
      benefit: "Acá es donde la plataforma empieza a generar valor real en la captación y atención de leads.",
      result: "Tu inmobiliaria ya puede mostrar propiedades, atender consultas y ordenar el seguimiento.",
      cta: "Empezar a operar",
    },
  ];
}

export function getNextOnboardingStep(orgSlug: string, status: SetupChecklistStatus): OnboardingStep | null {
  return buildOnboardingSteps(orgSlug, status).find((step) => !step.done) ?? null;
}

export function SetupChecklist({ orgSlug, status }: SetupChecklistProps) {
  const steps = buildOnboardingSteps(orgSlug, status);

  return (
    <section className="rounded-[1.75rem] border border-brand-100 bg-white p-6 shadow-soft">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Onboarding Guiado
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            Configurá tu inmobiliaria en 5 pasos
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Cada paso te acerca a tener tu agente IA atendiendo consultas y mostrando propiedades
            por WhatsApp de forma automática.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-slate-600">
          {status.completedCount} / {status.totalCount} pasos completos
        </span>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <article
            key={step.key}
            className={cn(
              "rounded-2xl border p-5 transition-colors",
              step.done
                ? "border-emerald-100 bg-emerald-50/60"
                : "border-slate-200 bg-white",
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    step.done
                      ? "bg-emerald-500 text-white"
                      : "border border-slate-300 bg-white text-slate-500",
                  )}
                >
                  {step.done ? "✓" : index + 1}
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-base font-semibold text-slate-950">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{step.explanation}</p>
                  </div>

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Beneficio
                      </p>
                      <p className="mt-1 text-slate-600">{step.benefit}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Resultado
                      </p>
                      <p className="mt-1 text-slate-600">{step.result}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 lg:pl-4">
                {step.done ? (
                  <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    Completado
                  </span>
                ) : (
                  <Link
                    href={step.href}
                    className="inline-flex rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    {step.cta}
                  </Link>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
