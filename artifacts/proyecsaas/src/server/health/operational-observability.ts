import "server-only";

import { prisma } from "@/server/db/prisma";
import { getAutomationQueue } from "@/server/queues";
import { getWorkerHeartbeatStatus } from "@/modules/platform/service";

export type OperationalHealthStatus = "ok" | "warning" | "error";

export type OperationalObservabilitySnapshot = {
  worker: {
    status: OperationalHealthStatus;
    lastSeenAt: string | null;
    secondsAgo: number | null;
    message: string;
  };
  queue: {
    status: OperationalHealthStatus;
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
    message: string;
  };
  whatsapp: {
    status: OperationalHealthStatus;
    activeChannels: number;
    lastInboundAt: string | null;
    lastDeliveryAt: string | null;
    message: string;
  };
  openai: {
    status: OperationalHealthStatus;
    hasKey: boolean;
    message: string;
  };
  mercadopago: {
    status: OperationalHealthStatus;
    lastPaymentAt: string | null;
    hasCredentials: boolean;
    message: string;
  };
};

function minutesAgo(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 60_000);
}

async function getQueueSnapshot(): Promise<OperationalObservabilitySnapshot["queue"]> {
  try {
    const queue = getAutomationQueue();
    const counts = await queue.getJobCounts("waiting", "active", "failed", "delayed");

    let status: OperationalHealthStatus = "ok";
    let message = "La cola automatizada responde y no muestra degradacion evidente.";

    if (counts.failed >= 10) {
      status = "error";
      message = "La cola acumula fallos altos. Conviene revisar worker, proveedor y retries.";
    } else if (counts.failed > 0) {
      status = "warning";
      message = "Hay jobs fallidos recientes. Revisar errores antes de que escalen.";
    } else if (counts.waiting >= 25 && counts.active === 0) {
      status = "warning";
      message = "Hay acumulacion en espera sin jobs activos. El worker puede estar degradado.";
    }

    return {
      status,
      waiting: counts.waiting,
      active: counts.active,
      failed: counts.failed,
      delayed: counts.delayed,
      message,
    };
  } catch {
    return {
      status: "error",
      waiting: 0,
      active: 0,
      failed: 0,
      delayed: 0,
      message: "No fue posible leer la cola BullMQ/Redis desde este runtime.",
    };
  }
}

async function getWhatsAppSnapshot(): Promise<OperationalObservabilitySnapshot["whatsapp"]> {
  const [activeChannels, lastInbound, lastDelivery, lastError] = await Promise.all([
    prisma.whatsAppChannel.count({ where: { status: "ACTIVE" } }),
    prisma.whatsAppChannel.findFirst({
      where: { lastInboundAt: { not: null } },
      orderBy: { lastInboundAt: "desc" },
      select: { lastInboundAt: true },
    }),
    prisma.whatsAppChannel.findFirst({
      where: { lastDeliveryAt: { not: null } },
      orderBy: { lastDeliveryAt: "desc" },
      select: { lastDeliveryAt: true },
    }),
    prisma.whatsAppChannel.findFirst({
      where: { lastErrorAt: { not: null } },
      orderBy: { lastErrorAt: "desc" },
      select: { lastErrorAt: true, lastErrorCode: true },
    }),
  ]);

  const lastInboundAt = lastInbound?.lastInboundAt?.toISOString() ?? null;
  const lastDeliveryAt = lastDelivery?.lastDeliveryAt?.toISOString() ?? null;
  const lastErrorMinutes = minutesAgo(lastError?.lastErrorAt ?? null);

  if (activeChannels === 0) {
    return {
      status: "error",
      activeChannels,
      lastInboundAt,
      lastDeliveryAt,
      message: "No hay canales WhatsApp activos configurados en la plataforma.",
    };
  }

  if (lastErrorMinutes !== null && lastErrorMinutes <= 360) {
    return {
      status: "error",
      activeChannels,
      lastInboundAt,
      lastDeliveryAt,
      message: `Se detecto un error reciente de canal${lastError?.lastErrorCode ? ` (${lastError.lastErrorCode})` : ""}.`,
    };
  }

  if (!lastInboundAt && !lastDeliveryAt) {
    return {
      status: "warning",
      activeChannels,
      lastInboundAt,
      lastDeliveryAt,
      message: "Hay canales activos, pero no se registra actividad reciente todavia.",
    };
  }

  return {
    status: "ok",
    activeChannels,
    lastInboundAt,
    lastDeliveryAt,
    message: "Canales activos y con actividad registrada para operacion.",
  };
}

function getOpenAISnapshot(): OperationalObservabilitySnapshot["openai"] {
  const hasKey = Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim(),
  );

  return {
    status: hasKey ? "ok" : "warning",
    hasKey,
    message: hasKey
      ? "La credencial del motor IA esta presente en el runtime."
      : "No se detecta credencial OpenAI en el runtime actual.",
  };
}

async function getMercadoPagoSnapshot(): Promise<OperationalObservabilitySnapshot["mercadopago"]> {
  const hasCredentials = Boolean(
    process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() &&
      process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim(),
  );

  const lastPaid = await prisma.orgBillingRecord.findFirst({
    where: { status: "PAID" },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const lastPaymentAt = lastPaid?.updatedAt?.toISOString() ?? null;

  if (!hasCredentials) {
    return {
      status: "error",
      lastPaymentAt,
      hasCredentials,
      message: "Faltan credenciales base de Mercado Pago para operar cobros online.",
    };
  }

  if (!lastPaymentAt) {
    return {
      status: "warning",
      lastPaymentAt,
      hasCredentials,
      message: "Credenciales presentes, pero todavia no hay pagos acreditados registrados.",
    };
  }

  return {
    status: "ok",
    lastPaymentAt,
    hasCredentials,
    message: "Mercado Pago configurado y con actividad comercial registrada.",
  };
}

function mapWorkerStatus(
  worker: Awaited<ReturnType<typeof getWorkerHeartbeatStatus>>,
): OperationalObservabilitySnapshot["worker"] {
  if (worker.status === "ok") {
    return {
      status: "ok",
      lastSeenAt: worker.lastSeenAt,
      secondsAgo: worker.secondsAgo,
      message: "Heartbeat reciente. El worker se reporta operativo.",
    };
  }

  if (worker.status === "stale") {
    return {
      status: "warning",
      lastSeenAt: worker.lastSeenAt,
      secondsAgo: worker.secondsAgo,
      message: "El worker sigue vivo, pero el heartbeat ya no es fresco.",
    };
  }

  return {
    status: "error",
    lastSeenAt: worker.lastSeenAt,
    secondsAgo: worker.secondsAgo,
    message: "No hay heartbeat reciente del worker. La automatizacion puede estar detenida.",
  };
}

export async function getOperationalObservabilitySnapshot(): Promise<OperationalObservabilitySnapshot> {
  const [worker, queue, whatsapp, mercadopago] = await Promise.all([
    getWorkerHeartbeatStatus(),
    getQueueSnapshot(),
    getWhatsAppSnapshot(),
    getMercadoPagoSnapshot(),
  ]);

  return {
    worker: mapWorkerStatus(worker),
    queue,
    whatsapp,
    openai: getOpenAISnapshot(),
    mercadopago,
  };
}
