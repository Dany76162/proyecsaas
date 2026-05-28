const { PrismaClient, AgentLogLevel } = require("@prisma/client");

const prisma = new PrismaClient();

const logsDemo = [
  {
    level: AgentLogLevel.INFO,
    message: "Director Operativo IA inició una tarea de seguimiento comercial.",
    metadata: { agentType: "ORCHESTRATOR", flow: "initial_setup" }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Sincronización de páginas de Meta completada correctamente. 3 páginas detectadas.",
    metadata: { pagesSynced: 3, platform: "FACEBOOK" }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Automatización IA programada para revisión semanal de inventarios.",
    metadata: { cronSchedule: "0 9 * * 1", activeRules: 2 }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Contenido de marketing generado y enviado a aprobación humana.",
    metadata: { taskId: "task_marketing_promo", platform: "INSTAGRAM" }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Límite mensual de IA verificado. Estado: ACTIVE (Consumo: 12/300).",
    metadata: { orgSlug: "raicespilot-qa-test", limit: 300, currentUsed: 12 }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Pago mensual registrado en ciclo SaaS-to-Own. Factura #MP-2026-05.",
    metadata: { transactionId: "mp_pay_88294710", amount: 65000, currency: "ARS" }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Cambio de estado comercial de cliente auditado: trialing -> active.",
    metadata: { orgId: "org_north", previousStatus: "trialing", newStatus: "active" }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Publicación programada registrada en calendario de contenido.",
    metadata: { scheduledFor: "2026-05-30T15:00:00Z", status: "SCHEDULED" }
  },
  {
    level: AgentLogLevel.WARN,
    message: "Advertencia de gobernanza: El Agente de Marketing superó el 75% del budget diario sugerido.",
    metadata: { budgetUsed: 7.5, budgetLimit: 10.0, currency: "USD" }
  },
  {
    level: AgentLogLevel.ERROR,
    message: "Fallo en la publicación directa en Meta: Conexión expirada o permisos de página insuficientes.",
    metadata: { errorCode: 190, errorSubcode: 460, message: "Error validating access token" }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Suscripción courtesy activada de por vida (Lifetime) por Superadmin.",
    metadata: { grantedBy: "admin@raicespilot.local", reason: "Founder courtesy license" }
  },
  {
    level: AgentLogLevel.WARN,
    message: "Consumo de API de OpenAI superó el límite preventivo configurado en Budget Guard.",
    metadata: { limitType: "preventive_limit", consumedTokens: 145000 }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Señal de webhook recibida desde WhatsApp Cloud. Mensaje procesado correctamente.",
    metadata: { messageId: "waba_msg_10928" }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Director Operativo IA reasignó automáticamente tarea fallida a cola de reintentos.",
    metadata: { retryNumber: 1, maxRetries: 3 }
  },
  {
    level: AgentLogLevel.INFO,
    message: "Aprobación humana registrada para el borrador #381. Preparado para publicación manual.",
    metadata: { approvedBy: "admin@raicespilot.local", draftId: "draft_381" }
  }
];

async function main() {
  console.log("Iniciando la carga de logs de demostración...");

  // Eliminamos logs de plataforma previos para no duplicar en demo
  await prisma.agentLog.deleteMany({
    where: { scope: "PLATFORM" }
  });

  // Buscamos un run existente o lo creamos temporalmente si hace falta para vincular los logs
  // Para simplificar, insertamos directamente los logs generales de plataforma sin vincular a un run específico
  for (const log of logsDemo) {
    await prisma.agentLog.create({
      data: {
        scope: "PLATFORM",
        level: log.level,
        message: log.message,
        metadata: log.metadata,
        timestamp: new Date()
      }
    });
  }

  console.log(`¡Carga completada con éxito! Se crearon ${logsDemo.length} registros operativos realistas en español castellano.`);
}

main()
  .catch((e) => {
    console.error("Error al cargar seeds de logs:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
