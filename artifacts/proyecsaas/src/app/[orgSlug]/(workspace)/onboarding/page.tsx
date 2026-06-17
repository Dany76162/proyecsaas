export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { BusinessTypePrompt } from "@/components/onboarding/business-type-prompt";
import { ExpressPropertyDialog } from "@/components/onboarding/express-property-dialog";
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
  businessType: string | null,
) {
  const isDeveloper = businessType === "DESARROLLADORA";
  const isBoth = businessType === "AMBAS";

  // Paso 4 adaptado al tipo de negocio (propiedad vs. desarrollo/loteo).
  const inventoryStep = isDeveloper
    ? {
        title: "Cargá tu primer desarrollo",
        description:
          "Creá tu emprendimiento o loteo con su plano e inventario de lotes. Es lo que la IA va a ofrecer y mostrar en el masterplan público.",
        href: `/${orgSlug}/developments`,
        cta: "Cargar desarrollo",
      }
    : isBoth
      ? {
          title: "Cargá tu primera propiedad o desarrollo",
          description:
            "Creá una propiedad (precio, tipo y dirección) o un desarrollo con su plano. Activala como disponible y pública para que la IA la ofrezca en las conversaciones.",
          href: `/${orgSlug}/properties`,
          cta: "Cargar inventario",
        }
      : {
          title: "Cargá tu primera propiedad",
          description:
            "Creá una propiedad con precio, tipo y dirección. Activala como disponible y pública para que la IA pueda ofrecerla en las conversaciones.",
          href: `/${orgSlug}/properties`,
          cta: "Cargar propiedad",
        };

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
      title: inventoryStep.title,
      description: inventoryStep.description,
      href: inventoryStep.href,
      cta: inventoryStep.cta,
      serverStatus: (status.propertiesReady ? "completed" : "pending") as "completed" | "pending",
    },
    {
      number: 5,
      key: "prueba",
      title: "Probá tu agente",
      description:
        "Enviá un mensaje de prueba a tu WhatsApp y mirá cómo la IA responde y crea la oportunidad sola. Te llevamos al Inbox IA apenas llegue el primer mensaje. Este es el momento clave del sistema.",
      href: `/${orgSlug}/onboarding/probar`,
      cta: "Probar mi agente",
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

  const orgMeta = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      marketFocus: true,
      _count: { select: { conversations: true, Development: true } },
    },
  });

  const businessType = orgMeta?.marketFocus ?? null;
  const hasConversation = (orgMeta?._count.conversations ?? 0) > 0;
  const hasDevelopment = (orgMeta?._count.Development ?? 0) > 0;

  // El paso 4 se completa con propiedades o desarrollos según el tipo de negocio.
  const inventoryReady =
    businessType === "DESARROLLADORA"
      ? hasDevelopment
      : businessType === "AMBAS"
        ? setupStatus.propertiesLoaded || hasDevelopment
        : setupStatus.propertiesLoaded;

  const steps = buildOnboardingSteps(
    orgSlug,
    {
      profileReady: setupStatus.profileComplete,
      whatsappReady: setupStatus.whatsappConnected,
      agentReady: setupStatus.agentConfigured,
      propertiesReady: inventoryReady,
      tested: hasConversation,
    },
    businessType,
  );

  return (
    <div className="mt-3 pb-20">
      {!businessType && (
        <div className="mb-6">
          <BusinessTypePrompt orgSlug={orgSlug} />
        </div>
      )}

      <OnboardingStepsList orgSlug={orgSlug} steps={steps} />

      {!inventoryReady && businessType !== "DESARROLLADORA" && (
        <section className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">Atajo</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">Publicá tu primera propiedad en 1 minuto</h2>
            <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-slate-500">
              Cargá lo mínimo y queda disponible al instante para que tu agente IA la ofrezca. Las fotos y el resto los completás después.
            </p>
          </div>
          <ExpressPropertyDialog orgSlug={orgSlug} />
        </section>
      )}

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
