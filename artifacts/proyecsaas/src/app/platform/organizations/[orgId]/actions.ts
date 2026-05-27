"use server";

import { prisma } from "@/server/db/prisma";
import { requirePlatformAdmin } from "@/server/auth/access";
import { revalidatePath } from "next/cache";

export type OrgAuditData = {
  org: {
    id: string;
    name: string;
    slug: string;
    planLabel: string | null;
  };
  subscription: {
    status: string;
    daysLeft: number | null;
    planCode: string | null;
    paidCycles: number;
    aiStatus: string;
    aiMonthlyConversationLimit: number;
    aiMonthlyConversationsUsed: number;
    lifetimeGrantedAt: Date | null;
    currentPeriodEnd: Date | null;
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
  if (sub?.currentPeriodEnd && sub.status !== "CANCELLED" && !sub.lifetimeGrantedAt) {
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
      planCode: sub?.planCode || null,
      paidCycles: sub?.paidCycles || 0,
      aiStatus: sub?.aiStatus || "ACTIVE",
      aiMonthlyConversationLimit: sub?.aiMonthlyConversationLimit ?? 300,
      aiMonthlyConversationsUsed: sub?.aiMonthlyConversationsUsed ?? 0,
      lifetimeGrantedAt: sub?.lifetimeGrantedAt || null,
      currentPeriodEnd: sub?.currentPeriodEnd || null,
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

// 💵 Action: Registrar Pago Recibido
export async function registerPaymentAction(orgId: string) {
  await requirePlatformAdmin();

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId }
  });

  if (!sub) throw new Error("Suscripción no encontrada");

  const newCycles = Math.min(sub.paidCycles + 1, 12);

  await prisma.subscription.update({
    where: { organizationId: orgId },
    data: {
      paidCycles: newCycles,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Extiende vigencia por 30 días
      status: "ACTIVE" // Asegura CRM activo al pagar
    }
  });

  console.log(JSON.stringify({
    scope: "audit",
    event: "register-payment",
    orgId,
    previousCycles: sub.paidCycles,
    newCycles,
    operator: "Superadmin",
    timestamp: new Date().toISOString()
  }));

  revalidatePath(`/platform/organizations/${orgId}`);
}

// 🏆 Action: Otorgar Licencia Lifetime
export async function grantLifetimeAction(orgId: string) {
  await requirePlatformAdmin();

  const sub = await prisma.subscription.findUnique({
    where: { organizationId: orgId }
  });

  if (!sub) throw new Error("Suscripción no encontrada");

  await prisma.subscription.update({
    where: { organizationId: orgId },
    data: {
      lifetimeGrantedAt: new Date(),
      status: "ACTIVE" // CRM queda activo de por vida
    }
  });

  console.log(JSON.stringify({
    scope: "audit",
    event: "grant-lifetime",
    orgId,
    operator: "Superadmin",
    timestamp: new Date().toISOString()
  }));

  revalidatePath(`/platform/organizations/${orgId}`);
}

// 🤖 Action: Alternar Estado IA (Pausar / Reactivar / Deshabilitar)
export async function toggleAiStatusAction(orgId: string, status: "ACTIVE" | "PAUSED" | "DISABLED") {
  await requirePlatformAdmin();

  if (!["ACTIVE", "PAUSED", "DISABLED"].includes(status)) {
    throw new Error("Estado de IA no válido");
  }

  await prisma.subscription.update({
    where: { organizationId: orgId },
    data: { aiStatus: status }
  });

  console.log(JSON.stringify({
    scope: "audit",
    event: "toggle-ai-status",
    orgId,
    status,
    operator: "Superadmin",
    timestamp: new Date().toISOString()
  }));

  revalidatePath(`/platform/organizations/${orgId}`);
}

// ⚙️ Action: Actualizar Configuración Comercial Completa (Con Validaciones Estrictas)
export async function updateCommercialConfigAction(
  orgId: string,
  data: {
    planCode: string | null;
    monthlyLimit: number;
    conversationsUsed?: number;
    paidCycles?: number;
    status?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | "SUSPENDED";
    planLabel?: string;
  }
) {
  await requirePlatformAdmin();

  // 1. Validación de Plan
  if (data.planCode !== null && !["FOUNDER", "BASE", "PRO", "ENTERPRISE", "CUSTOM"].includes(data.planCode)) {
    throw new Error("Plan asignado no válido. Debe ser FOUNDER, BASE, PRO, ENTERPRISE, CUSTOM o null.");
  }

  // 2. Validación de Límites No Negativos
  if (data.monthlyLimit < 0) {
    throw new Error("El límite mensual de conversaciones no puede ser menor a 0.");
  }
  if (data.conversationsUsed !== undefined && data.conversationsUsed < 0) {
    throw new Error("Las conversaciones usadas no pueden ser menores a 0.");
  }

  // 3. Validación de Ciclos de Pago
  if (data.paidCycles !== undefined && (data.paidCycles < 0 || data.paidCycles > 12)) {
    throw new Error("Los ciclos pagados deben estar en el rango de 0 a 12.");
  }

  // 4. Validación de Estado CRM
  if (data.status !== undefined && !["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED", "SUSPENDED"].includes(data.status)) {
    throw new Error("Estado comercial de CRM no válido.");
  }

  const updateSubData: any = {
    planCode: data.planCode,
    aiMonthlyConversationLimit: data.monthlyLimit,
  };

  if (data.conversationsUsed !== undefined) {
    updateSubData.aiMonthlyConversationsUsed = data.conversationsUsed;
  }
  if (data.paidCycles !== undefined) {
    updateSubData.paidCycles = data.paidCycles;
  }
  if (data.status !== undefined) {
    updateSubData.status = data.status;
  }

  // Ejecutamos transaccionalmente para actualizar tanto la Subscription como el planLabel de la Organization
  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { organizationId: orgId },
      data: updateSubData
    });

    if (data.planLabel !== undefined) {
      await tx.organization.update({
        where: { id: orgId },
        data: { planLabel: data.planLabel }
      });
    }
  });

  console.log(JSON.stringify({
    scope: "audit",
    event: "update-commercial-config",
    orgId,
    updateData: { ...updateSubData, planLabel: data.planLabel },
    operator: "Superadmin",
    timestamp: new Date().toISOString()
  }));

  revalidatePath(`/platform/organizations/${orgId}`);
}
