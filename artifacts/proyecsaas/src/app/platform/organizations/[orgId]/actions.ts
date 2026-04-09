"use server";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";

export type OrgAuditData = {
  org: {
    id: string;
    name: string;
    slug: string;
    planLabel: string | null;
  };
  subscription: {
    status: string | null;
    daysLeft: number | null;
  };
  whatsapp: {
    status: string;
    lastInbound: Date | null;
  };
  aiAgent: {
    status: string;
    name: string | null;
  };
  catalog: {
    total: number;
    public: number;
  };
  recentHandoffs: {
    id: string;
    participantName: string | null;
    lastMessageAt: Date | null;
    unanswered: boolean; // true if the very last message in the convo is from the user (INBOUND)
    snippet: string | null;
  }[];
  suggestedAction: string;
  suggestedActionReason: string;
};

export async function getOrgAiAudit(orgId: string): Promise<OrgAuditData> {
  await requirePlatformAdmin();

  const orgInfo = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      subscription: true,
      whatsappChannels: { where: { isPrimary: true } },
      aiAgents: true,
      properties: { 
        select: { id: true, publicVisible: true, status: true } 
      },
    }
  });

  if (!orgInfo) throw new Error("Organization not found");

  // Fetch recent handoffs
  const handoffs = await prisma.conversation.findMany({
    where: { 
      organizationId: orgId, 
      isHumanControlled: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: {
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1 // only need the very last message to know who spoke last
      }
    }
  });

  // Calculate catalog stats
  const totalProps = orgInfo.properties.length;
  const publicProps = orgInfo.properties.filter(p => p.publicVisible).length;

  // Evaluate Handoffs
  let unansweredCount = 0;
  const mappedHandoffs = handoffs.map(c => {
    const lastMsg = c.messages[0];
    // If conversation is OPEN and isHumanControlled, and we haven't closed it yet.
    // Also we consider it heavily "unanswered" if the last message was INBOUND.
    const isUnanswered = c.status === "OPEN" && lastMsg?.direction === "INBOUND";
    if (isUnanswered) unansweredCount++;

    return {
      id: c.id,
      participantName: c.participantName || "Desconocido",
      lastMessageAt: c.lastMessageAt,
      unanswered: isUnanswered,
      snippet: lastMsg?.body || null,
    };
  });

  // Derived Values
  const wa = orgInfo.whatsappChannels[0];
  const ai = orgInfo.aiAgents[0];
  const sub = orgInfo.subscription;
  
  let daysLeft = null;
  if (sub?.currentPeriodEnd) {
    daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  // SUGGESTED INTERVENTION LOGIC
  let action = "Monitorear sin intervenir.";
  let reason = "El esquema general parece estar saludable.";

  if (!wa || wa.status !== "ACTIVE") {
    action = "☎️ Contactar para Onboarding: Conectar WhatsApp";
    reason = "El cliente no tiene su número de WhatsApp escaneado y activo.";
  } else if (!ai || ai.status !== "ACTIVE") {
    action = "☎️ Contactar para Onboarding: Activar Agente";
    reason = "El agente IA está en borrador o pausado, por lo que no está filtrando.";
  } else if (publicProps === 0) {
    action = "📧 Solicitar carga de catálogo";
    reason = "Tienen la IA activa, pero 0 propiedades visibles. El bot no tendrá respuestas útiles para ventas.";
  } else if (unansweredCount > 0) {
    action = "🚨 Llamado comercial de Customer Success urgente";
    reason = `Hay ${unansweredCount} conversaciones (leads) derivadas a la inmobiliaria que están pendientes de respuesta final. ¡La IA hizo su trabajo pero el humano los dejó colgados!`;
  } else if (sub?.status === "TRIALING" && daysLeft !== null && daysLeft <= 3 && mappedHandoffs.length > 0) {
    action = "💰 Llamado de Up-sell de Cierre";
    reason = "El trial está a punto de vencer y hemos comprobado que la IA les generó y derivó actividad comercial. ¡Es hora de cobrar!";
  } else if (wa.lastInboundAt && (Date.now() - wa.lastInboundAt.getTime()) > (5 * 24 * 60 * 60 * 1000)) {
    action = "📝 Revisión Estratégica de Marketing";
    reason = "Hace más de 5 días que nadie les escribe al WhatsApp. Necesitan ayuda publicando su número.";
  }

  return {
    org: {
      id: orgInfo.id,
      name: orgInfo.name,
      slug: orgInfo.slug,
      planLabel: orgInfo.planLabel,
    },
    subscription: {
      status: sub?.status || "NO_SUBSCRIPTION",
      daysLeft,
    },
    whatsapp: {
      status: wa?.status || "INACTIVE",
      lastInbound: wa?.lastInboundAt || null,
    },
    aiAgent: {
      status: ai?.status || "NOT_CREATED",
      name: ai?.name || null,
    },
    catalog: {
      total: totalProps,
      public: publicProps,
    },
    recentHandoffs: mappedHandoffs,
    suggestedAction: action,
    suggestedActionReason: reason,
  };
}
