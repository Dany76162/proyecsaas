import "server-only";

import { getOperationalObservabilitySnapshot } from "@/server/health/operational-observability";
import { getSystemStatusSnapshot } from "@/server/health/system-status";

export type OperationalAlertSeverity = "critical" | "warning" | "info";

export type OperationalAlert = {
  severity: OperationalAlertSeverity;
  title: string;
  message: string;
  impact: string;
  action: string;
  href?: string;
};

function severityWeight(severity: OperationalAlertSeverity) {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const [systemStatus, observability] = await Promise.all([
    getSystemStatusSnapshot(),
    getOperationalObservabilitySnapshot(),
  ]);

  const alerts: OperationalAlert[] = [];

  if (observability.worker.status === "error") {
    alerts.push({
      severity: "critical",
      title: "Worker caido",
      message: observability.worker.message,
      impact: "Las automatizaciones y procesos en cola pueden quedar detenidos.",
      action: "Revisar Salud del sistema y validar heartbeat del worker.",
      href: "/platform/health",
    });
  } else if (observability.worker.status === "warning") {
    alerts.push({
      severity: "warning",
      title: "Worker degradado",
      message: observability.worker.message,
      impact: "La automatizacion puede responder con demora o dejar cola acumulada.",
      action: "Validar heartbeat y performance del worker.",
      href: "/platform/health",
    });
  }

  if (observability.queue.status === "error") {
    alerts.push({
      severity: "critical",
      title: "Cola automatizada comprometida",
      message: observability.queue.message,
      impact: "Los jobs nuevos pueden no procesarse y la operacion quedar frenada.",
      action: "Revisar Redis, BullMQ y operaciones IA.",
      href: "/platform/ai-operations",
    });
  } else if (observability.queue.status === "warning") {
    alerts.push({
      severity: "warning",
      title: "Cola con senales de acumulacion",
      message: observability.queue.message,
      impact: "Puede crecer la latencia entre recepcion del evento y procesamiento final.",
      action: "Mirar fallos, waiting y actividad del worker.",
      href: "/platform/ai-operations",
    });
  }

  if (observability.whatsapp.status === "error") {
    alerts.push({
      severity: "critical",
      title: "WhatsApp sin operacion estable",
      message: observability.whatsapp.message,
      impact: "La plataforma no podra recibir o enrutar conversaciones nuevas con normalidad.",
      action: "Revisar canales, webhook y estado de Meta.",
      href: "/platform/health",
    });
  } else if (observability.whatsapp.status === "warning") {
    alerts.push({
      severity: "warning",
      title: "WhatsApp con actividad baja o incompleta",
      message: observability.whatsapp.message,
      impact: "Puede haber canales activos pero sin trafico util o con operacion incompleta.",
      action: "Validar canal, numero y actividad reciente por tenant.",
      href: "/platform/organizations",
    });
  }

  if (systemStatus.runtime !== "ok") {
    alerts.push({
      severity: "critical",
      title: "Variables criticas faltantes",
      message: "El runtime no expone todas las variables base esperadas.",
      impact: "Auth, webhooks o integraciones pueden fallar en runtime.",
      action: "Completar secretos base del entorno.",
      href: "/platform/settings",
    });
  }

  if (observability.mercadopago.status === "error") {
    alerts.push({
      severity: "critical",
      title: "Mercado Pago incompleto",
      message: observability.mercadopago.message,
      impact: "Los cobros online o confirmaciones automaticas pueden no completarse.",
      action: "Revisar credenciales y webhook de Mercado Pago.",
      href: "/platform/billing",
    });
  } else if (observability.mercadopago.status === "warning") {
    alerts.push({
      severity: "warning",
      title: "Mercado Pago sin actividad reciente",
      message: observability.mercadopago.message,
      impact: "La integracion puede estar configurada pero sin validacion operativa reciente.",
      action: "Revisar Comercial y confirmar flujo de cobro.",
      href: "/platform/billing",
    });
  }

  if (observability.openai.status === "warning" || systemStatus.openai !== "ok") {
    alerts.push({
      severity: "warning",
      title: "Motor IA sin credencial valida",
      message: observability.openai.message,
      impact: "Las respuestas IA y automatizaciones conversacionales pueden degradarse o fallar.",
      action: "Revisar credenciales del proveedor IA.",
      href: "/platform/settings",
    });
  }

  if (!alerts.some((alert) => alert.severity === "critical" || alert.severity === "warning")) {
    alerts.push({
      severity: "info",
      title: "Sin alertas criticas",
      message: "El entorno no muestra incidencias prioritarias en este momento.",
      impact: "La operacion general se ve estable con las senales actualmente disponibles.",
      action: "Continuar monitoreo y usar Salud del sistema para seguimiento.",
      href: "/platform/health",
    });
  }

  return alerts.sort((a, b) => severityWeight(a.severity) - severityWeight(b.severity));
}
