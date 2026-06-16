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
    whatsappReady: boolean;
    agentReady: boolean;
    propertiesReady: boolean;
    tested: boolean;
  },
) {
  return [
    {
      number: 1,
      key: "perfil",
      title: "Completá el perfil de tu inmobiliaria",
      description:
        "Agregá el nombre, ciudad y WhatsApp de contacto. Esto es lo que el cliente ve cuando consulta por una propiedad.",
      href: `/${orgSlug}/settings/organization`,
      cta: "Completar perfil",
      serverStatus: (status.profileReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 2,
      key: "whatsapp",
      title: "Conectá tu WhatsApp",
      description:
        "Vinculá el número de WhatsApp de tu inmobiliaria: es el canal por donde la IA atiende a tus clientes. El paso se completa cuando el canal queda Activo.",
      href: `/${orgSlug}/settings/integrations/whatsapp`,
      cta: "Conectar WhatsApp",
      serverStatus: (status.whatsappReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 3,
      key: "agente",
      title: "Activá tu agente IA",
      description:
        "Creá el agente, asignale el número de WhatsApp conectado y activalo. Es el que responde, califica y agenda visitas de forma automática.",
      href: `/${orgSlug}/agents`,
      cta: "Configurar agente",
      serverStatus: (status.agentReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 4,
      key: "propiedad",
      title: "Cargá tu primera propiedad",
      description:
        "Creá una propiedad con precio, tipo y dirección. Activala como disponible y pública para que la IA pueda ofrecerla en las conversaciones.",
      href: `/${orgSlug}/properties`,
      cta: "Cargar propiedad",
      serverStatus: (status.propertiesReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 5,
      key: "prueba",
      title: "Probá tu agente",
      description:
        "Enviá un mensaje de prueba a tu WhatsApp y mirá cómo la IA responde y crea la oportunidad sola. Lo vas a ver en el Inbox IA. Este es el momento clave del sistema.",
      href: `/${orgSlug}/conversations`,
      cta: "Ir al Inbox IA",
      serverStatus: (status.tested ? "completed" : "pending") as "completed" | "pending",
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

  const hasConversation = await prisma.conversation.count({
    where: { organization: { slug: orgSlug } },
  }) > 0;

  const steps = buildOnboardingSteps(orgSlug, {
    profileReady: setupStatus.profileComplete,
    whatsappReady: setupStatus.whatsappConnected,
    agentReady: setupStatus.agentConfigured,
    propertiesReady: setupStatus.propertiesLoaded,
    tested: hasConversation,
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
