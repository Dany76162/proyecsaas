"use server";

import { requirePlatformAdmin } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

export type InitializeSandboxResult = {
  success: boolean;
  message: string;
  createdOrganization: boolean;
  createdSubscription: boolean;
  createdMembership: boolean;
  orgId: string | null;
  subscriptionId: string | null;
  membershipId: string | null;
  error?: string;
};

export async function initializeProductionSandboxAction(): Promise<InitializeSandboxResult> {
  try {
    // 1. Rigorous security check - only Superadmins
    const sessionUser = await requirePlatformAdmin();
    const targetSlug = "raicespilot-qa-test";

    // 2. Query existing sandbox organization
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: targetSlug },
      include: { subscription: true, memberships: true }
    });

    let orgId: string | null = existingOrg?.id || null;
    let subscriptionId: string | null = existingOrg?.subscription?.id || null;
    let membershipId: string | null = null;

    let createdOrganization = false;
    let createdSubscription = false;
    let createdMembership = false;

    // A) If Organization does not exist, create it!
    if (!existingOrg) {
      // Find available plans in DB
      const availablePlans = await prisma.plan.findMany({ select: { id: true } });
      const preferredPlan = availablePlans.find(p => 
        p.id.toLowerCase().includes("piloto") || 
        p.id.toLowerCase().includes("founder") || 
        p.id.toLowerCase().includes("starter")
      );
      const planIdToUse = preferredPlan ? preferredPlan.id : (availablePlans[0]?.id || "piloto");

      const createdOrg = await prisma.organization.create({
        data: {
          name: "RaicesPilot QA Test",
          slug: targetSlug,
          city: "Buenos Aires",
          isActive: true,
          description: "Organización de pruebas y sandbox interno del sistema QA Operativo.",
          planLabel: "$65.000 + impuestos",
          subscription: {
            create: {
              planId: planIdToUse,
              status: "ACTIVE",
              billingMode: "COURTESY",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              planCode: "FOUNDER",
              paidCycles: 1,
              aiStatus: "ACTIVE",
              aiMonthlyConversationLimit: 300,
              aiMonthlyConversationsUsed: 0,
              lifetimeGrantedAt: null,
              internalBillingNotes: "internal-sandbox: RaicesPilot QA Test. No contabilizar en métricas comerciales reales."
            }
          },
          memberships: {
            create: {
              userId: sessionUser.id,
              role: "OWNER"
            }
          }
        },
        include: {
          subscription: true,
          memberships: true
        }
      });

      orgId = createdOrg.id;
      subscriptionId = createdOrg.subscription?.id || null;
      membershipId = createdOrg.memberships[0]?.id || null;
      createdOrganization = true;
      createdSubscription = true;
      createdMembership = true;
    } else {
      // B) Organization exists. Check and heal subscription
      if (!existingOrg.subscription) {
        const availablePlans = await prisma.plan.findMany({ select: { id: true } });
        const preferredPlan = availablePlans.find(p => 
          p.id.toLowerCase().includes("piloto") || 
          p.id.toLowerCase().includes("founder") || 
          p.id.toLowerCase().includes("starter")
        );
        const planIdToUse = preferredPlan ? preferredPlan.id : (availablePlans[0]?.id || "piloto");

        const newSub = await prisma.subscription.create({
          data: {
            organizationId: existingOrg.id,
            planId: planIdToUse,
            status: "ACTIVE",
            billingMode: "COURTESY",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            planCode: "FOUNDER",
            paidCycles: 1,
            aiStatus: "ACTIVE",
            aiMonthlyConversationLimit: 300,
            aiMonthlyConversationsUsed: 0,
            lifetimeGrantedAt: null,
            internalBillingNotes: "internal-sandbox: RaicesPilot QA Test. No contabilizar en métricas comerciales reales."
          }
        });

        subscriptionId = newSub.id;
        createdSubscription = true;
      }

      // C) Organization exists. Check and heal Owner Membership for current user
      const existingUserMembership = existingOrg.memberships.find(m => m.userId === sessionUser.id);
      if (!existingUserMembership) {
        const newMembership = await prisma.membership.create({
          data: {
            userId: sessionUser.id,
            organizationId: existingOrg.id,
            role: "OWNER"
          }
        });
        membershipId = newMembership.id;
        createdMembership = true;
      } else {
        membershipId = existingUserMembership.id;
      }
    }

    // 3. Register a structured DB Audit Log
    const auditData = {
      createdOrganization,
      createdSubscription,
      createdMembership,
      orgId,
      slug: targetSlug,
      timestamp: new Date().toISOString()
    };

    await prisma.auditLog.create({
      data: {
        event: "qa-sandbox-initialized",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "ORGANIZATION",
        entityId: orgId,
        entityName: "RaicesPilot QA Test",
        metadata: auditData
      }
    });

    // 4. Log a structured JSON string in Railway/console
    console.log(JSON.stringify({
      scope: "qa-sandbox-initializer",
      event: "qa-sandbox-initialized",
      userId: sessionUser.id,
      email: sessionUser.email,
      ...auditData
    }));

    return {
      success: true,
      message: createdOrganization
        ? "Organización sandbox, suscripción y membresía OWNER creadas con éxito."
        : createdSubscription || createdMembership
          ? "La organización ya existía. Se inicializó la suscripción o membresía OWNER faltante con éxito."
          : "El sandbox y tu membresía OWNER ya están completamente activos e inicializados en la plataforma.",
      createdOrganization,
      createdSubscription,
      createdMembership,
      orgId,
      subscriptionId,
      membershipId
    };
  } catch (err: any) {
    console.error("Error in initializeProductionSandboxAction:", err);
    return {
      success: false,
      message: err.message || String(err),
      createdOrganization: false,
      createdSubscription: false,
      createdMembership: false,
      orgId: null,
      subscriptionId: null,
      membershipId: null,
      error: err.message || String(err)
    };
  }
}

// ==========================================
// STAGE D: AI CONSUMPTION QA SIMULATOR ACTIONS
// ==========================================

async function getAndValidateSandbox() {
  const sessionUser = await requirePlatformAdmin();
  const targetSlug = "raicespilot-qa-test";

  const org = await prisma.organization.findUnique({
    where: { slug: targetSlug },
    include: { subscription: true }
  });

  if (!org) {
    throw new Error("El Sandbox 'raicespilot-qa-test' no está inicializado. Por favor inicialízalo primero.");
  }

  if (org.slug !== targetSlug) {
    throw new Error("Barrera de seguridad activada: Intento de operar sobre un slug de organización inválido.");
  }

  return { org, subscription: org.subscription, sessionUser };
}

export type SimulatorActionResult = {
  success: boolean;
  message: string;
  data?: any;
};

export async function resetSandboxAiAction(): Promise<SimulatorActionResult> {
  try {
    const { org, subscription, sessionUser } = await getAndValidateSandbox();

    const previousUsed = subscription?.aiMonthlyConversationsUsed ?? 0;
    const previousLimit = subscription?.aiMonthlyConversationLimit ?? 300;
    const previousAiStatus = subscription?.aiStatus ?? "ACTIVE";

    // 1. Reset subscription metrics (preserving commercial cycles & paid cycles)
    await prisma.subscription.update({
      where: { organizationId: org.id },
      data: {
        aiMonthlyConversationsUsed: 0,
        aiMonthlyConversationLimit: 300,
        aiStatus: "ACTIVE"
      }
    });

    // 2. Safe deletion of QA simulated records
    await prisma.message.deleteMany({
      where: {
        organizationId: org.id,
        OR: [
          { id: { startsWith: "qa-sim-" } },
          { id: { startsWith: "rep_qa-sim-" } },
          { conversationId: { startsWith: "qa-sim-" } }
        ]
      }
    });

    await prisma.conversation.deleteMany({
      where: {
        organizationId: org.id,
        id: { startsWith: "qa-sim-" }
      }
    });

    await prisma.lead.deleteMany({
      where: {
        organizationId: org.id,
        id: { startsWith: "QA_SIM_" }
      }
    });

    const auditMeta = {
      event: "qa-sandbox-ai-reset",
      userId: sessionUser.id,
      email: sessionUser.email,
      orgId: org.id,
      slug: org.slug,
      previousUsed,
      newUsed: 0,
      previousLimit,
      newLimit: 300,
      previousAiStatus,
      newAiStatus: "ACTIVE",
      timestamp: new Date().toISOString()
    };

    await prisma.auditLog.create({
      data: {
        event: "qa-sandbox-ai-reset",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "ORGANIZATION",
        entityId: org.id,
        entityName: org.name,
        metadata: auditMeta
      }
    });

    console.log(JSON.stringify({ scope: "qa-simulator", ...auditMeta }));

    return {
      success: true,
      message: "Sandbox de consumo IA restablecido con éxito a 0/300 ACTIVE. Registros simulados QA eliminados.",
      data: auditMeta
    };
  } catch (error: any) {
    console.error("Error in resetSandboxAiAction:", error);
    return { success: false, message: error.message || String(error) };
  }
}

export async function simulateFirstLeadAction(): Promise<SimulatorActionResult> {
  try {
    const { org, subscription, sessionUser } = await getAndValidateSandbox();

    if (subscription?.aiStatus === "PAUSED") {
      throw new Error("La Inteligencia Artificial de la organización está PAUSADA. No se puede procesar consumo.");
    }

    const previousUsed = subscription?.aiMonthlyConversationsUsed ?? 0;
    const previousLimit = subscription?.aiMonthlyConversationLimit ?? 300;
    const previousAiStatus = subscription?.aiStatus ?? "ACTIVE";

    // 1. Create Simulated Lead A
    const leadId = "QA_SIM_LEAD_A";
    await prisma.lead.upsert({
      where: { id: leadId },
      create: {
        id: leadId,
        organizationId: org.id,
        fullName: "QA Simulated Lead A",
        phone: "+5491112345678",
        status: "NEW",
        source: "WhatsApp",
        notes: "internal-qa-simulation: Simulación de consumo IA Sandbox Etapa D"
      },
      update: {
        fullName: "QA Simulated Lead A",
        notes: "internal-qa-simulation: Simulación de consumo IA Sandbox Etapa D"
      }
    });

    // 2. Create Simulated Conversation A
    const conversationId = "qa-sim-conversation-a";
    await prisma.conversation.upsert({
      where: { id: conversationId },
      create: {
        id: conversationId,
        organizationId: org.id,
        leadId,
        channel: "whatsapp",
        status: "OPEN",
        participantName: "QA Simulated Lead A",
        participantPhone: "+5491112345678",
        subject: "Simulated Conversation A",
        lastMessageAt: new Date()
      },
      update: {
        status: "OPEN",
        lastMessageAt: new Date()
      }
    });

    // 3. Create simulated inbound and outbound messages
    const inboundMsgId = "qa-sim-message-a-in";
    await prisma.message.upsert({
      where: { id: inboundMsgId },
      create: {
        id: inboundMsgId,
        organizationId: org.id,
        conversationId,
        direction: "INBOUND",
        deliveryStatus: "RECEIVED",
        body: "Hola, me interesa la propiedad piloto.",
        senderName: "QA Simulated Lead A",
        senderPhone: "+5491112345678",
        sentAt: new Date()
      },
      update: {}
    });

    const outboundMsgId = "rep_qa-sim-message-a-out";
    await prisma.message.upsert({
      where: { id: outboundMsgId },
      create: {
        id: outboundMsgId,
        organizationId: org.id,
        conversationId,
        direction: "OUTBOUND",
        deliveryStatus: "SENT",
        body: "Hola! Soy el Agente IA de RaicesPilot. Con gusto te asesoro.",
        senderName: "AI Agent",
        sentAt: new Date()
      },
      update: {}
    });

    // 4. Atomic increment
    const updatedSub = await prisma.subscription.update({
      where: { organizationId: org.id },
      data: {
        aiMonthlyConversationsUsed: {
          increment: 1
        }
      }
    });

    // 5. Check limit auto-pause
    let currentAiStatus = updatedSub.aiStatus;
    if (updatedSub.aiMonthlyConversationsUsed >= updatedSub.aiMonthlyConversationLimit) {
      await prisma.subscription.update({
        where: { organizationId: org.id },
        data: { aiStatus: "PAUSED" }
      });
      currentAiStatus = "PAUSED";
    }

    const auditMeta = {
      event: "qa-sandbox-ai-sim-lead-a",
      userId: sessionUser.id,
      email: sessionUser.email,
      orgId: org.id,
      slug: org.slug,
      previousUsed,
      newUsed: updatedSub.aiMonthlyConversationsUsed,
      previousLimit,
      newLimit: updatedSub.aiMonthlyConversationLimit,
      previousAiStatus,
      newAiStatus: currentAiStatus,
      timestamp: new Date().toISOString()
    };

    await prisma.auditLog.create({
      data: {
        event: "qa-sandbox-ai-sim-lead-a",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "ORGANIZATION",
        entityId: org.id,
        entityName: org.name,
        metadata: auditMeta
      }
    });

    console.log(JSON.stringify({ scope: "qa-simulator", ...auditMeta }));

    return {
      success: true,
      message: `Lead A (primer lead) simulado con éxito. Consumo de IA incrementado a ${updatedSub.aiMonthlyConversationsUsed}.`,
      data: auditMeta
    };
  } catch (error: any) {
    console.error("Error in simulateFirstLeadAction:", error);
    return { success: false, message: error.message || String(error) };
  }
}

export async function simulateRepeatedMessageAction(): Promise<SimulatorActionResult> {
  try {
    const { org, subscription, sessionUser } = await getAndValidateSandbox();

    if (subscription?.aiStatus === "PAUSED") {
      throw new Error("La Inteligencia Artificial de la organización está PAUSADA. No se puede procesar consumo.");
    }

    const previousUsed = subscription?.aiMonthlyConversationsUsed ?? 0;
    const previousLimit = subscription?.aiMonthlyConversationLimit ?? 300;
    const previousAiStatus = subscription?.aiStatus ?? "ACTIVE";

    // Check if Lead A exists
    const leadId = "QA_SIM_LEAD_A";
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new Error("Para simular un mensaje repetido del Lead A, primero debes simular el primer mensaje del Lead A.");
    }

    const conversationId = "qa-sim-conversation-a";

    // Add consecutive messages to same thread
    const inboundMsgId2 = `qa-sim-message-a-in-${Date.now()}`;
    await prisma.message.create({
      data: {
        id: inboundMsgId2,
        organizationId: org.id,
        conversationId,
        direction: "INBOUND",
        deliveryStatus: "RECEIVED",
        body: "Genial, contame más sobre el precio.",
        senderName: "QA Simulated Lead A",
        senderPhone: "+5491112345678",
        sentAt: new Date()
      }
    });

    const outboundMsgId2 = `rep_qa-sim-message-a-out-${Date.now()}`;
    await prisma.message.create({
      data: {
        id: outboundMsgId2,
        organizationId: org.id,
        conversationId,
        direction: "OUTBOUND",
        deliveryStatus: "SENT",
        body: "El precio es de $65.000 + impuestos mensuales.",
        senderName: "AI Agent",
        sentAt: new Date()
      }
    });

    // Consumo NOT incremented because it's a consecutive message in an existing conversation/thread
    const auditMeta = {
      event: "qa-sandbox-ai-sim-repeated-message",
      userId: sessionUser.id,
      email: sessionUser.email,
      orgId: org.id,
      slug: org.slug,
      previousUsed,
      newUsed: previousUsed,
      previousLimit,
      newLimit: previousLimit,
      previousAiStatus,
      newAiStatus: previousAiStatus,
      timestamp: new Date().toISOString()
    };

    await prisma.auditLog.create({
      data: {
        event: "qa-sandbox-ai-sim-repeated-message",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "ORGANIZATION",
        entityId: org.id,
        entityName: org.name,
        metadata: auditMeta
      }
    });

    console.log(JSON.stringify({ scope: "qa-simulator", ...auditMeta }));

    return {
      success: true,
      message: `Mensaje repetido de Lead A simulado con éxito. El contador no incrementa (se mantiene en ${previousUsed}).`,
      data: auditMeta
    };
  } catch (error: any) {
    console.error("Error in simulateRepeatedMessageAction:", error);
    return { success: false, message: error.message || String(error) };
  }
}

export async function simulateSecondLeadAction(): Promise<SimulatorActionResult> {
  try {
    const { org, subscription, sessionUser } = await getAndValidateSandbox();

    if (subscription?.aiStatus === "PAUSED") {
      throw new Error("La Inteligencia Artificial de la organización está PAUSADA. No se puede procesar consumo.");
    }

    const previousUsed = subscription?.aiMonthlyConversationsUsed ?? 0;
    const previousLimit = subscription?.aiMonthlyConversationLimit ?? 300;
    const previousAiStatus = subscription?.aiStatus ?? "ACTIVE";

    // 1. Create Simulated Lead B
    const leadId = "QA_SIM_LEAD_B";
    await prisma.lead.upsert({
      where: { id: leadId },
      create: {
        id: leadId,
        organizationId: org.id,
        fullName: "QA Simulated Lead B",
        phone: "+5491187654321",
        status: "NEW",
        source: "WhatsApp",
        notes: "internal-qa-simulation: Simulación de consumo IA Sandbox Etapa D"
      },
      update: {
        fullName: "QA Simulated Lead B",
        notes: "internal-qa-simulation: Simulación de consumo IA Sandbox Etapa D"
      }
    });

    // 2. Create Simulated Conversation B
    const conversationId = "qa-sim-conversation-b";
    await prisma.conversation.upsert({
      where: { id: conversationId },
      create: {
        id: conversationId,
        organizationId: org.id,
        leadId,
        channel: "whatsapp",
        status: "OPEN",
        participantName: "QA Simulated Lead B",
        participantPhone: "+5491187654321",
        subject: "Simulated Conversation B",
        lastMessageAt: new Date()
      },
      update: {
        status: "OPEN",
        lastMessageAt: new Date()
      }
    });

    // 3. Create simulated inbound and outbound messages
    const inboundMsgId = "qa-sim-message-b-in";
    await prisma.message.upsert({
      where: { id: inboundMsgId },
      create: {
        id: inboundMsgId,
        organizationId: org.id,
        conversationId,
        direction: "INBOUND",
        deliveryStatus: "RECEIVED",
        body: "Hola, quisiera consultar disponibilidad.",
        senderName: "QA Simulated Lead B",
        senderPhone: "+5491187654321",
        sentAt: new Date()
      },
      update: {}
    });

    const outboundMsgId = "rep_qa-sim-message-b-out";
    await prisma.message.upsert({
      where: { id: outboundMsgId },
      create: {
        id: outboundMsgId,
        organizationId: org.id,
        conversationId,
        direction: "OUTBOUND",
        deliveryStatus: "SENT",
        body: "Hola! El catálogo está 100% disponible. ¿Qué tipo de propiedad buscas?",
        senderName: "AI Agent",
        sentAt: new Date()
      },
      update: {}
    });

    // 4. Atomic increment
    const updatedSub = await prisma.subscription.update({
      where: { organizationId: org.id },
      data: {
        aiMonthlyConversationsUsed: {
          increment: 1
        }
      }
    });

    // 5. Check limit auto-pause
    let currentAiStatus = updatedSub.aiStatus;
    if (updatedSub.aiMonthlyConversationsUsed >= updatedSub.aiMonthlyConversationLimit) {
      await prisma.subscription.update({
        where: { organizationId: org.id },
        data: { aiStatus: "PAUSED" }
      });
      currentAiStatus = "PAUSED";
    }

    const auditMeta = {
      event: "qa-sandbox-ai-sim-lead-b",
      userId: sessionUser.id,
      email: sessionUser.email,
      orgId: org.id,
      slug: org.slug,
      previousUsed,
      newUsed: updatedSub.aiMonthlyConversationsUsed,
      previousLimit,
      newLimit: updatedSub.aiMonthlyConversationLimit,
      previousAiStatus,
      newAiStatus: currentAiStatus,
      timestamp: new Date().toISOString()
    };

    await prisma.auditLog.create({
      data: {
        event: "qa-sandbox-ai-sim-lead-b",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "ORGANIZATION",
        entityId: org.id,
        entityName: org.name,
        metadata: auditMeta
      }
    });

    console.log(JSON.stringify({ scope: "qa-simulator", ...auditMeta }));

    return {
      success: true,
      message: `Lead B (nuevo lead) simulado con éxito. Consumo de IA incrementado a ${updatedSub.aiMonthlyConversationsUsed}.`,
      data: auditMeta
    };
  } catch (error: any) {
    console.error("Error in simulateSecondLeadAction:", error);
    return { success: false, message: error.message || String(error) };
  }
}

export async function forceSandboxLimitAction(limit: number): Promise<SimulatorActionResult> {
  try {
    const { org, subscription, sessionUser } = await getAndValidateSandbox();

    const previousUsed = subscription?.aiMonthlyConversationsUsed ?? 0;
    const previousLimit = subscription?.aiMonthlyConversationLimit ?? 300;
    const previousAiStatus = subscription?.aiStatus ?? "ACTIVE";

    // 1. Seteamos el límite forzado sin evaluar o modificar aiStatus por sí mismo
    const updatedSub = await prisma.subscription.update({
      where: { organizationId: org.id },
      data: {
        aiMonthlyConversationLimit: limit
      }
    });

    const auditMeta = {
      event: "qa-sandbox-ai-limit-forced",
      userId: sessionUser.id,
      email: sessionUser.email,
      orgId: org.id,
      slug: org.slug,
      previousUsed,
      newUsed: updatedSub.aiMonthlyConversationsUsed,
      previousLimit,
      newLimit: limit,
      previousAiStatus,
      newAiStatus: previousAiStatus, // Mantenemos el estado de IA como estaba
      timestamp: new Date().toISOString()
    };

    await prisma.auditLog.create({
      data: {
        event: "qa-sandbox-ai-limit-forced",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "ORGANIZATION",
        entityId: org.id,
        entityName: org.name,
        metadata: auditMeta
      }
    });

    console.log(JSON.stringify({ scope: "qa-simulator", ...auditMeta }));

    return {
      success: true,
      message: `Límite mensual forzado a ${limit} con éxito. Estado IA mantenido en ${previousAiStatus}.`,
      data: auditMeta
    };
  } catch (error: any) {
    console.error("Error in forceSandboxLimitAction:", error);
    return { success: false, message: error.message || String(error) };
  }
}

export async function simulateThirdLeadAction(): Promise<SimulatorActionResult> {
  try {
    const { org, subscription, sessionUser } = await getAndValidateSandbox();

    const previousUsed = subscription?.aiMonthlyConversationsUsed ?? 0;
    const previousLimit = subscription?.aiMonthlyConversationLimit ?? 300;
    const previousAiStatus = subscription?.aiStatus ?? "ACTIVE";

    // 1. Create Simulated Lead C
    const leadId = "QA_SIM_LEAD_C";
    await prisma.lead.upsert({
      where: { id: leadId },
      create: {
        id: leadId,
        organizationId: org.id,
        fullName: "QA Simulated Lead C",
        phone: "+5491199998888",
        status: "NEW",
        source: "WhatsApp",
        notes: "internal-qa-simulation: Simulación de consumo IA Sandbox Etapa D"
      },
      update: {
        fullName: "QA Simulated Lead C",
        notes: "internal-qa-simulation: Simulación de consumo IA Sandbox Etapa D"
      }
    });

    // 2. Create Simulated Conversation C
    const conversationId = "qa-sim-conversation-c";
    await prisma.conversation.upsert({
      where: { id: conversationId },
      create: {
        id: conversationId,
        organizationId: org.id,
        leadId,
        channel: "whatsapp",
        status: "OPEN",
        participantName: "QA Simulated Lead C",
        participantPhone: "+5491199998888",
        subject: "Simulated Conversation C",
        lastMessageAt: new Date()
      },
      update: {
        status: "OPEN",
        lastMessageAt: new Date()
      }
    });

    // 3. Create simulated inbound and outbound messages
    const inboundMsgId = "qa-sim-message-c-in";
    await prisma.message.upsert({
      where: { id: inboundMsgId },
      create: {
        id: inboundMsgId,
        organizationId: org.id,
        conversationId,
        direction: "INBOUND",
        deliveryStatus: "RECEIVED",
        body: "Quisiera agendar una visita mañana.",
        senderName: "QA Simulated Lead C",
        senderPhone: "+5491199998888",
        sentAt: new Date()
      },
      update: {}
    });

    const outboundMsgId = "rep_qa-sim-message-c-out";
    await prisma.message.upsert({
      where: { id: outboundMsgId },
      create: {
        id: outboundMsgId,
        organizationId: org.id,
        conversationId,
        direction: "OUTBOUND",
        deliveryStatus: "SENT",
        body: "Hola! Lamentablemente hemos alcanzado nuestro límite de atención automática. Un operador te asistirá en breve.",
        senderName: "AI Agent",
        sentAt: new Date()
      },
      update: {}
    });

    // 4. Atomic increment
    const updatedSub = await prisma.subscription.update({
      where: { organizationId: org.id },
      data: {
        aiMonthlyConversationsUsed: {
          increment: 1
        }
      }
    });

    // 5. Force Auto-pause since limit is reached/exceeded
    let currentAiStatus = updatedSub.aiStatus;
    if (updatedSub.aiMonthlyConversationsUsed >= updatedSub.aiMonthlyConversationLimit) {
      await prisma.subscription.update({
        where: { organizationId: org.id },
        data: { aiStatus: "PAUSED" }
      });
      currentAiStatus = "PAUSED";
    }

    const auditMeta = {
      event: "qa-sandbox-ai-sim-lead-c",
      userId: sessionUser.id,
      email: sessionUser.email,
      orgId: org.id,
      slug: org.slug,
      previousUsed,
      newUsed: updatedSub.aiMonthlyConversationsUsed,
      previousLimit,
      newLimit: updatedSub.aiMonthlyConversationLimit,
      previousAiStatus,
      newAiStatus: currentAiStatus,
      timestamp: new Date().toISOString()
    };

    await prisma.auditLog.create({
      data: {
        event: "qa-sandbox-ai-sim-lead-c",
        actorId: sessionUser.id,
        actorEmail: sessionUser.email,
        entityType: "ORGANIZATION",
        entityId: org.id,
        entityName: org.name,
        metadata: auditMeta
      }
    });

    console.log(JSON.stringify({ scope: "qa-simulator", ...auditMeta }));

    return {
      success: true,
      message: `Lead C (tercer lead) simulado con éxito. Consumo en ${updatedSub.aiMonthlyConversationsUsed}/${updatedSub.aiMonthlyConversationLimit}. IA pausada automáticamente.`,
      data: auditMeta
    };
  } catch (error: any) {
    console.error("Error in simulateThirdLeadAction:", error);
    return { success: false, message: error.message || String(error) };
  }
}

