export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getLeadSummary } from "@/modules/leads/service";
import {
  getOrganizationWorkspace,
  getSetupChecklistStatus,
} from "@/modules/organizations/service";
import { getVisitSummary } from "@/modules/visits/service";
import { ACTIVATION_EVENTS, trackActivationEventOnce } from "@/server/activation/events";
import { prisma } from "@/server/db/prisma";
import { getSessionUser } from "@/server/auth/session";

type OnboardingStep = {
  number: number;
  title: string;
  description: string;
  href: string;
  cta: string;
  status: "pending" | "completed";
};

function buildOnboardingSteps(
  orgSlug: string,
  status: {
    profileReady: boolean;
    firstLeadReady: boolean;
    conversationsReady: boolean;
    interventionReady: boolean;
    resultReady: boolean;
  },
): OnboardingStep[] {
  return [
    {
      number: 1,
      title: "Configuracion base",
      description:
        "Asegurate de tener WhatsApp conectado y los datos principales de la inmobiliaria listos para operar.",
      href: `/${orgSlug}/settings/organization`,
      cta: "Ir a configuracion",
      status: status.profileReady ? "completed" : "pending",
    },
    {
      number: 2,
      title: "Entender tu primer lead",
      description:
        "Cuando entra un mensaje, el sistema lo registra automaticamente y deja el contexto listo para trabajar.",
      href: `/${orgSlug}/manual-uso`,
      cta: "Ver como funciona",
      status: status.firstLeadReady ? "completed" : "pending",
    },
    {
      number: 3,
      title: "Abrir conversaciones",
      description:
        "La bandeja de conversaciones es donde vas a ver todos los clientes y seguir cada oportunidad.",
      href: `/${orgSlug}/conversations`,
      cta: "Abrir conversaciones",
      status: status.conversationsReady ? "completed" : "pending",
    },
    {
      number: 4,
      title: "Intervenir en el momento correcto",
      description:
        "Responde manualmente cuando el cliente quiera avanzar o necesite una definicion comercial importante.",
      href: `/${orgSlug}/conversations`,
      cta: "Ir a intervenir",
      status: status.interventionReady ? "completed" : "pending",
    },
    {
      number: 5,
      title: "Llevarlo a resultado",
      description:
        "El objetivo final es mover cada conversacion hacia una visita o una operacion concreta.",
      href: `/${orgSlug}/conversations`,
      cta: "Ver objetivo final",
      status: status.resultReady ? "completed" : "pending",
    },
  ];
}

export default async function WorkspaceOnboardingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, setupStatus, leadSummary, visitSummary, sessionUser] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getSetupChecklistStatus(orgSlug),
    getLeadSummary(orgSlug),
    getVisitSummary(prisma, orgSlug),
    getSessionUser(),
  ]);

  if (!organization) {
    notFound();
  }

  await trackActivationEventOnce(prisma, {
    event: ACTIVATION_EVENTS.onboardingView,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    actorId: sessionUser?.id,
    actorEmail: sessionUser?.email,
  });

  const steps = buildOnboardingSteps(orgSlug, {
    profileReady: setupStatus.profileComplete && setupStatus.whatsappConnected,
    firstLeadReady: leadSummary.total > 0,
    conversationsReady: leadSummary.total > 0,
    interventionReady:
      visitSummary.pendingCount + visitSummary.confirmedCount + visitSummary.completedCount > 0,
    resultReady: visitSummary.confirmedCount + visitSummary.completedCount > 0,
  });

  const completedCount = steps.filter((step) => step.status === "completed").length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const recommendedStep = steps.find((step) => step.status === "pending") ?? null;

  return (
    <div className="mt-3 space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 p-6 text-white shadow-soft">
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
                Puesta en marcha
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                {completedCount}/{steps.length} completados
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-200">
                Primeros pasos en Raices Pilot
              </p>
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Configura tu inmobiliaria y empeza a convertir consultas en visitas
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-200">
                Este recorrido te muestra por donde empezar, que revisar primero y como pasar de
                una consulta a una oportunidad real sin perderte entre pantallas.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>Progreso inicial</span>
                <span className="font-semibold">{progressPercent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
              Que vas a lograr
            </p>
            <div className="mt-4 space-y-3">
              {[
                "Dejar lista la base operativa de la inmobiliaria.",
                "Entender donde aparece cada consulta nueva.",
                "Saber cuando dejar a la IA y cuando intervenir vos.",
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-900">
                    ✓
                  </span>
                  <p className="text-sm leading-6 text-slate-100">{item}</p>
                </div>
              ))}
            </div>

            {recommendedStep ? (
              <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                  Empezar aqui
                </p>
                <p className="mt-2 text-base font-semibold text-white">
                  Paso {recommendedStep.number}: {recommendedStep.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-200">
                  {recommendedStep.description}
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Recorrido completo
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-100">
                  La puesta en marcha inicial ya quedo cubierta. Ahora podes operar desde conversaciones
                  y revisar el manual de uso cuando lo necesites.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isRecommended = recommendedStep?.number === step.number;

          return (
            <SectionCard
              key={step.number}
              eyebrow={isRecommended ? `Paso ${step.number} - Siguiente paso` : `Paso ${step.number}`}
              title={step.title}
              description={step.description}
            >
              <div
                className={`rounded-[1.25rem] border p-5 transition ${
                  isRecommended
                    ? "border-brand-300 bg-brand-50 shadow-sm"
                    : isCompleted
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-slate-200 bg-slate-50/60"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isRecommended
                            ? "bg-brand-500 text-white"
                            : "border border-slate-300 bg-white text-slate-500"
                      }`}
                    >
                      {isCompleted ? "OK" : step.number}
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          label={isCompleted ? "COMPLETADO" : "PENDIENTE"}
                          tone={isCompleted ? "success" : "neutral"}
                        />
                        {isRecommended ? (
                          <StatusBadge label="Empezar aqui" tone="warning" />
                        ) : null}
                      </div>

                      <p className="max-w-2xl text-sm leading-6 text-slate-600">
                        {isCompleted
                          ? "Este paso ya esta cubierto y te deja seguir al siguiente con una base operativa suficiente."
                          : isRecommended
                            ? "Este es el siguiente paso logico para avanzar y sacar tu primer resultado real dentro de la plataforma."
                            : "Este paso sigue pendiente, pero conviene abordarlo despues de completar el recomendado."}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={step.href}
                    className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isRecommended
                        ? "bg-brand-500 text-white hover:bg-brand-600"
                        : isCompleted
                          ? "border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {step.cta}
                  </Link>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Atajo recomendado
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Manual de uso para el equipo</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Si queres ver el flujo completo antes de operar, abrí la guía práctica del workspace.
            </p>
          </div>

          <Link
            href={`/${orgSlug}/manual-uso`}
            className="inline-flex w-fit rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Abrir manual de uso
          </Link>
        </div>
      </section>
    </div>
  );
}
