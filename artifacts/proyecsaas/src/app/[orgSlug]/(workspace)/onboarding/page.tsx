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

function buildOnboardingSteps(
  orgSlug: string,
  status: {
    profileReady: boolean;
    firstLeadReady: boolean;
    conversationsReady: boolean;
    propertiesReady: boolean;
    agentsReady: boolean;
  },
) {
  return [
    {
      number: 1,
      key: "base",
      title: "Configuración base",
      description:
        "Asegurá los datos de contacto y la identidad de tu inmobiliaria para que la IA tenga el contexto correcto.",
      href: `/${orgSlug}/settings/organization`,
      cta: "Ir a configuración",
      serverStatus: (status.profileReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 2,
      key: "leads",
      title: "Entender tu primer lead",
      description:
        "Mirá cómo entran los prospectos automáticamente y cómo se organizan en tu embudo comercial.",
      href: `/${orgSlug}/leads`,
      cta: "Ver prospectos",
      serverStatus: (status.firstLeadReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 3,
      key: "conversations",
      title: "Abrir conversaciones",
      description:
        "Seguí en tiempo real las charlas de tus clientes con la IA e intervení cuando sea necesario.",
      href: `/${orgSlug}/conversations`,
      cta: "Ver chats en vivo",
      serverStatus: (status.conversationsReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 4,
      key: "properties",
      title: "Agregar / revisar propiedades",
      description:
        "Tu inventario es clave. Cargá o sincronizá tus propiedades para que la IA pueda recomendarlas.",
      href: `/${orgSlug}/properties`,
      cta: "Gestionar catálogo",
      serverStatus: (status.propertiesReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 5,
      key: "agents",
      title: "Activar agentes / automatizaciones",
      description:
        "Configurá el comportamiento de tu asistente IA y habilitá el número de WhatsApp operativo.",
      href: `/${orgSlug}/agents`,
      cta: "Habilitar agentes",
      serverStatus: (status.agentsReady ? "completed" : "pending") as "completed" | "pending",
    },
  ];
}

export default async function WorkspaceOnboardingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, setupStatus, leadSummary, sessionUser] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getSetupChecklistStatus(orgSlug),
    getLeadSummary(orgSlug),
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
    profileReady: setupStatus.profileComplete,
    firstLeadReady: leadSummary.total > 0,
    conversationsReady: leadSummary.total > 0, // Placeholder check, also manual
    propertiesReady: setupStatus.propertiesLoaded,
    agentsReady: setupStatus.agentConfigured && setupStatus.whatsappConnected,
  });

  return (
    <div className="mt-3 pb-20">
      <OnboardingStepsList orgSlug={orgSlug} steps={steps} />

      <section className="mt-12 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Recurso adicional
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Manual de uso para el equipo</h2>
            <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
              Si querés profundizar en cómo operar cada módulo, revisá nuestra guía práctica diseñada para el staff de la inmobiliaria.
            </p>
          </div>

          <Link
            href={`/${orgSlug}/manual-uso`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-xs font-bold uppercase tracking-widest text-slate-900 transition hover:bg-slate-50"
          >
            Abrir manual de uso
          </Link>
        </div>
      </section>
    </div>
  );
}

import { OnboardingStepsList } from "@/components/workspace/onboarding-steps-list";
