export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { prisma } from "@/server/db/prisma";
import { AgentConfigForm } from "@/components/agents/agent-config-form";

export default async function AgentSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) {
    notFound();
  }

  // Fetch or auto-create default agent
  const agent = await prisma.aiAgent.upsert({
    where: { organizationId: organization.id },
    create: {
      organizationId: organization.id,
      name: "Asistente IA",
      tone: "FRIENDLY",
      isActive: true,
    },
    update: {},
  });

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <SectionCard
        eyebrow="Agente IA"
        title="Configuracion del agente"
        description="Configura el nombre, tono y personalidad del agente de IA que atiende las consultas entrantes por WhatsApp. El canal de WhatsApp pertenece a la organizacion y el agente lo utiliza para responder."
      >
        <AgentConfigForm
          orgSlug={orgSlug}
          initial={{
            name: agent.name,
            tone: agent.tone,
            persona: agent.persona,
            isActive: agent.isActive,
          }}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Funcionamiento"
        title="Como trabaja el agente"
        description="El agente de IA sigue este flujo para cada conversacion entrante."
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Mensaje entrante del lead por WhatsApp</li>
          <li>El agente IA analiza la intencion y el contexto de la conversacion</li>
          <li>Consulta propiedades, catalogo e imagenes del inventario</li>
          <li>Responde con propiedades relevantes, links y fotos cuando aplica</li>
          <li>Propone visita solo cuando el lead esta listo</li>
          <li>Notifica al equipo humano si necesita intervencion</li>
        </ol>
      </SectionCard>
    </>
  );
}
