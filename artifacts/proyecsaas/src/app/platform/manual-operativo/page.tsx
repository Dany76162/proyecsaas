export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ActivitySquare,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserPlus,
  Wrench,
  Zap,
} from "lucide-react";

import { formatRelativeTime } from "@/components/platform/platform-ui";
import { getOperationalAlerts } from "@/server/health/operational-alerts";
import {
  getOperationalObservabilitySnapshot,
  type OperationalHealthStatus,
} from "@/server/health/operational-observability";
import { getSystemStatusSnapshot, type SystemStatusSnapshot } from "@/server/health/system-status";
import { PrintManualButton } from "./PrintManualButton";

const sections = [
  { id: "vision-operativa", label: "Vision operativa" },
  { id: "checklist-100", label: "Checklist 100%" },
  { id: "guias-paso-a-paso", label: "Guias paso a paso" },
  { id: "modulos-superadmin", label: "Funciones del panel" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "control-comercial", label: "Control Comercial" },
] as const;

const operationalDependencies = [
  {
    title: "Meta / WhatsApp",
    description:
      "Canal principal de mensajeria. Sin webhook correcto, secret, verify token y numero operativo, la plataforma no recibe ni enruta conversaciones.",
  },
  {
    title: "OpenAI",
    description:
      "Motor de IA para respuestas, clasificacion y automatizaciones. Debe tener key valida y disponibilidad estable.",
  },
  {
    title: "Railway",
    description:
      "Infraestructura de despliegue y secretos del runtime web/worker. Cualquier drift de variables impacta auth, webhooks y colas.",
  },
  {
    title: "PostgreSQL",
    description:
      "Fuente de verdad de usuarios, organizaciones, conversaciones, billing y estados operativos.",
  },
  {
    title: "Redis / Worker",
    description:
      "Cola y procesamiento asincrono. Si la app recibe eventos pero el worker o Redis fallan, la operacion queda incompleta.",
  },
  {
    title: "Mercado Pago",
    description:
      "Capa de cobro online. Necesita credenciales, webhook firmado y URLs de retorno consistentes.",
  },
  {
    title: "Variables criticas",
    description:
      "Secrets y configuraciones sin defaults inseguros para auth, cifrado, webhooks y servicios externos.",
  },
] as const;

const checklistGroups = [
  {
    title: "Infraestructura",
    items: [
      "Aplicacion desplegada y accesible",
      "Base PostgreSQL activa",
      "Redis activo",
      "Worker operativo con heartbeat reciente",
      "Logs y health checks disponibles",
    ],
  },
  {
    title: "WhatsApp / Meta",
    items: [
      "Cuenta Meta Business validada",
      "App de Developers configurada",
      "Numero de WhatsApp Business operativo",
      "Webhook productivo apuntando a /api/webhooks/whatsapp",
      "WHATSAPP_APP_SECRET y WHATSAPP_WEBHOOK_VERIFY_TOKEN presentes",
      "Canal resuelve a la organizacion correcta",
    ],
  },
  {
    title: "OpenAI",
    items: [
      "OPENAI_API_KEY o AI_INTEGRATIONS_OPENAI_API_KEY configurada",
      "Modelo operativo y disponible",
      "Integracion accesible desde app y worker",
    ],
  },
  {
    title: "Mercado Pago",
    items: [
      "MERCADO_PAGO_ACCESS_TOKEN configurado",
      "MERCADO_PAGO_WEBHOOK_SECRET presente",
      "Webhook productivo apuntando a /api/webhooks/mercadopago",
      "NEXT_PUBLIC_APP_URL correcta para back URLs",
    ],
  },
  {
    title: "Runtime / secretos",
    items: [
      "AUTH_SESSION_SECRET y AUTH_SHARED_PASSWORD presentes",
      "WHATSAPP_TOKEN_ENCRYPTION_KEY configurada",
      "NEXT_PUBLIC_APP_URL consistente con el dominio real",
      "Sin defaults inseguros activos en produccion",
      "Politicas de uso y privacidad configuradas en /auth/accept-policies",
    ],
  },
] as const;

const playbooks = [
  {
    title: "Configurar WhatsApp / Meta desde cero",
    summary:
      "Alta completa del canal de mensajeria para que entren mensajes reales y se procesen por la capa automatizada.",
    steps: [
      "Crear o verificar la cuenta de Meta Business.",
      "Entrar a Meta Developers, crear la app y habilitar WhatsApp.",
      "Obtener token de acceso, app secret y verify token.",
      "Registrar el numero operativo y asociarlo al negocio correcto.",
      "Cargar secretos en Railway y confirmar que el runtime web no marque faltantes.",
      "Apuntar el webhook productivo a /api/webhooks/whatsapp y validar el challenge.",
      "Validar un enlace de captacion con [ref:orgslug] para confirmar que la consulta entra a la organizacion correcta.",
      "Enviar un mensaje de prueba y revisar logs de webhook y worker.",
    ],
    validation:
      "Debe verse webhook 200, mensaje recibido, job en cola y actividad asociada a la organizacion.",
  },
  {
    title: "Configurar Railway",
    summary:
      "Base de despliegue para que web y worker arranquen estables, con servicios y secretos en linea.",
    steps: [
      "Verificar que el servicio web y el worker corran sobre la rama esperada.",
      "Confirmar DATABASE_URL, DIRECT_URL, REDIS_URL y NEXT_PUBLIC_APP_URL.",
      "Cargar AUTH_SESSION_SECRET, AUTH_SHARED_PASSWORD y secrets de WhatsApp y Mercado Pago.",
      "Verificar que el start command no repare schema en runtime.",
      "Revisar logs de arranque, heartbeat del worker y respuesta de rutas criticas.",
    ],
    validation:
      "La plataforma debe arrancar sin errores de configuracion y el worker debe registrar heartbeat.",
  },
  {
    title: "Configurar OpenAI",
    summary:
      "Preparar el motor IA que usa la plataforma para conversaciones, clasificacion y automatizacion.",
    steps: [
      "Obtener la API key del entorno operativo.",
      "Cargar la key en Railway usando la variable ya soportada por el runtime.",
      "Confirmar que web y worker apunten a la misma configuracion.",
      "Validar que el modelo esperado este disponible.",
      "Ejecutar una prueba de conversacion y revisar logs por errores del proveedor.",
    ],
    validation:
      "La respuesta IA debe completarse sin errores de autenticacion ni caidas por modelo no disponible.",
  },
  {
    title: "Configurar Mercado Pago",
    summary:
      "Preparar links de pago, webhook firmado y confirmacion del estado comercial.",
    steps: [
      "Obtener access token y webhook secret desde Mercado Pago.",
      "Cargar MERCADO_PAGO_ACCESS_TOKEN y MERCADO_PAGO_WEBHOOK_SECRET en Railway.",
      "Confirmar que NEXT_PUBLIC_APP_URL apunte al dominio real.",
      "Apuntar el webhook a /api/webhooks/mercadopago.",
      "Crear un cobro de prueba y verificar recepcion firmada del webhook.",
    ],
    validation:
      "El link debe generarse bien y el pago debe impactar en el estado comercial esperado.",
  },
  {
    title: "Gestión de Privacidad y Auditoría",
    summary:
      "Controlar cómo el equipo de plataforma accede a los datos de los clientes y asegurar la transparencia.",
    steps: [
      "Confirmar que todos los usuarios acepten los términos en su primer ingreso.",
      "Validar que el bypass de Superadmin esté activo para soporte técnico.",
      "Revisar la tabla AuditLog periódicamente para detectar accesos administrativos no justificados.",
      "Asegurar que las políticas mencionen explícitamente el derecho de auditoría por seguridad.",
    ],
    validation:
      "Cada acceso de Superadmin a un workspace ajeno debe generar un log con evento SUPERADMIN_WORKSPACE_ACCESS.",
  },
] as const;

const modules = [
  {
    title: "Resumen",
    href: "/platform",
    icon: ShieldCheck,
    description:
      "Vista ejecutiva de salud, riesgo, onboarding y volumen para priorizar intervenciones.",
  },
  {
    title: "Operaciones IA",
    href: "/platform/ai-operations",
    icon: Bot,
    description:
      "Monitoreo de actividad automatizada, jobs y funcionamiento del motor IA.",
  },
  {
    title: "Clientes",
    href: "/platform/organizations",
    icon: Building2,
    description:
      "Inventario operativo de organizaciones, accesos, papelera y estado general de cada tenant.",
  },
  {
    title: "Atencion a Clientes",
    href: "/platform/support",
    icon: MessageSquare,
    description:
      "Seguimiento de soporte y asistencia sobre cuentas activas desde la capa plataforma.",
  },
  {
    title: "Captacion",
    href: "/platform/captacion",
    icon: Megaphone,
    description:
      "Link comercial de plataforma para atraer nuevas inmobiliarias interesadas y validar el flujo de entrada por WhatsApp.",
  },
  {
    title: "Onboarding",
    href: "/platform/onboarding",
    icon: UserPlus,
    description:
      "Gestion de invitaciones, altas iniciales y activacion de accesos.",
  },
  {
    title: "Activacion",
    href: "/platform/activation",
    icon: ActivitySquare,
    description:
      "Seguimiento de adopcion real para detectar cuentas trabadas, primer lead e intervencion humana.",
  },
  {
    title: "Salud del sistema",
    href: "/platform/health",
    icon: ActivitySquare,
    description:
      "Tablero de integraciones, worker, auditoria y alertas tecnicas del entorno.",
  },
  {
    title: "Comercial",
    href: "/platform/billing",
    icon: CreditCard,
    description:
      "Control de cobros, links de pago y estados comerciales por organizacion.",
  },
  {
    title: "Configuracion",
    href: "/platform/settings",
    icon: Settings,
    description:
      "Punto de control de ajustes globales y accesos sensibles de plataforma.",
  },
] as const;

const troubleshooting = [
  {
    title: "No llegan mensajes de WhatsApp",
    checks: [
      "Confirmar que Meta apunte a /api/webhooks/whatsapp.",
      "Revisar app secret, verify token y firma entrante.",
      "Validar que el phone_number_id resuelva un canal activo.",
      "Corroborar que el worker siga operativo.",
    ],
  },
  {
    title: "El worker no procesa",
    checks: [
      "Revisar heartbeat reciente en Salud del sistema.",
      "Confirmar REDIS_URL y conectividad del worker.",
      "Buscar timeouts o errores de cola en logs.",
      "Verificar que la app web este encolando jobs.",
    ],
  },
  {
    title: "OpenAI no responde",
    checks: [
      "Verificar la API key cargada.",
      "Revisar errores del proveedor en logs.",
      "Confirmar que el modelo configurado siga disponible.",
    ],
  },
  {
    title: "Mercado Pago no acredita",
    checks: [
      "Confirmar access token y webhook secret.",
      "Revisar trafico real hacia /api/webhooks/mercadopago.",
      "Validar firma, id de notificacion y estado comercial.",
    ],
  },
  {
    title: "Webhook no valida",
    checks: [
      "Comparar el secret del proveedor con Railway.",
      "Verificar headers esperados y body sin alteraciones.",
      "Confirmar que no se este usando una ruta legacy por error.",
    ],
  },
  {
    title: "La consulta entra por link pero no cae en la inmobiliaria correcta",
    checks: [
      "Validar que el enlace compartido conserve el prefijo [ref:orgslug] en el mensaje inicial.",
      "Revisar que el slug de la organizacion exista y este activo.",
      "Confirmar que el webhook productivo sea /api/webhooks/whatsapp y no una ruta legacy.",
    ],
  },
  {
    title: "El link comercial de plataforma no dispara el flujo esperado",
    checks: [
      "Confirmar que exista PLATFORM_WHATSAPP_NUMBER y que Meta este conectado.",
      "Verificar que WHATSAPP_ORGANIZATION_ID apunte a una org activa de plataforma.",
      "Revisar /platform/support para validar si las conversaciones estan entrando al inbox central.",
    ],
  },
  {
    title: "Acceso administrativo denegado (404) en un workspace de cliente",
    checks: [
      "Confirmar que tu usuario tenga isPlatformAdmin: true.",
      "Verificar que la URL del workspace use el slug correcto.",
      "Revisar si el middleware o requireOrganizationMembership están bloqueando por falta de aceptación de políticas.",
    ],
  },
  {
    title: "El usuario no puede salir de la pantalla de políticas",
    checks: [
      "Validar que la redirección post-aceptación tenga el parámetro 'next' correcto.",
      "Verificar que la acción de servidor esté guardando termsAcceptedAt en la base de datos.",
      "Confirmar que no haya un bucle de redirección en requireSessionUser.",
    ],
  },
] as const;

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function getStatusUi(status: string) {
  if (status === "ok") {
    return {
      label: "OK",
      card: "border-emerald-200 bg-emerald-50",
      chip: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-900",
    };
  }

  if (status === "error") {
    return {
      label: "ERROR",
      card: "border-red-200 bg-red-50",
      chip: "bg-red-100 text-red-700",
      text: "text-red-900",
    };
  }

  return {
    label: "WARNING",
    card: "border-amber-200 bg-amber-50",
    chip: "bg-amber-100 text-amber-700",
    text: "text-amber-900",
  };
}

function getOperationalStatusUi(status: OperationalHealthStatus) {
  if (status === "ok") {
    return {
      label: "OK",
      card: "border-emerald-200 bg-emerald-50",
      chip: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-900",
    };
  }

  if (status === "error") {
    return {
      label: "ERROR",
      card: "border-red-200 bg-red-50",
      chip: "bg-red-100 text-red-700",
      text: "text-red-900",
    };
  }

  return {
    label: "WARNING",
    card: "border-amber-200 bg-amber-50",
    chip: "bg-amber-100 text-amber-700",
    text: "text-amber-900",
  };
}

function getAlertUi(severity: "critical" | "warning" | "info") {
  if (severity === "critical") {
    return {
      label: "CRITICAL",
      card: "border-red-200 bg-red-50",
      chip: "bg-red-100 text-red-700",
      text: "text-red-900",
    };
  }

  if (severity === "warning") {
    return {
      label: "WARNING",
      card: "border-amber-200 bg-amber-50",
      chip: "bg-amber-100 text-amber-700",
      text: "text-amber-900",
    };
  }

  return {
    label: "INFO",
    card: "border-sky-200 bg-sky-50",
    chip: "bg-sky-100 text-sky-700",
    text: "text-sky-900",
  };
}

function formatOptionalRelativeTime(value: string | null) {
  return value ? formatRelativeTime(value) : "Sin registro";
}

function getStatusDescription(snapshot: SystemStatusSnapshot) {
  return [
    {
      title: "WhatsApp",
      status: snapshot.whatsapp,
      description:
        snapshot.whatsapp === "ok"
          ? "Webhook y secretos base presentes para operar el canal."
          : "Faltan secretos base de WhatsApp para validar webhook y recepcion.",
    },
    {
      title: "OpenAI",
      status: snapshot.openai,
      description:
        snapshot.openai === "ok"
          ? "La key principal del motor IA esta presente."
          : "No se detecta OPENAI_API_KEY en el runtime actual.",
    },
    {
      title: "PostgreSQL",
      status: snapshot.db,
      description:
        snapshot.db === "ok"
          ? "La base responde correctamente a una consulta simple."
          : "La base no respondio al check de lectura SELECT 1.",
    },
    {
      title: "Redis / Worker",
      status: snapshot.redis,
      description:
        snapshot.redis === "ok"
          ? "Redis respondio a PING. La capa de cola tiene conectividad base."
          : "Redis no respondio al ping. La cola y el worker pueden quedar degradados.",
    },
    {
      title: "Mercado Pago",
      status: snapshot.mercadopago,
      description:
        snapshot.mercadopago === "ok"
          ? "Credenciales y secret de webhook presentes."
          : "Falta access token o webhook secret para la integracion de cobro.",
    },
    {
      title: "Variables criticas",
      status: snapshot.runtime,
      description:
        snapshot.runtime === "ok"
          ? "AUTH_SESSION_SECRET y NEXT_PUBLIC_APP_URL estan presentes."
          : "Faltan variables base del runtime para auth o URLs del sistema.",
    },
  ] as const;
}

export default async function PlatformManualOperativoPage() {
  const [systemStatus, operationalObservability, alerts] = await Promise.all([
    getSystemStatusSnapshot(),
    getOperationalObservabilitySnapshot(),
    getOperationalAlerts(),
  ]);
  const statusCards = getStatusDescription(systemStatus);
  const observabilityCards = [
    {
      title: "Worker",
      status: operationalObservability.worker.status,
      metrics: [
        { label: "Ultimo heartbeat", value: formatOptionalRelativeTime(operationalObservability.worker.lastSeenAt) },
        {
          label: "Latencia",
          value:
            operationalObservability.worker.secondsAgo !== null
              ? `${operationalObservability.worker.secondsAgo}s`
              : "Sin dato",
        },
      ],
      message: operationalObservability.worker.message,
    },
    {
      title: "Colas",
      status: operationalObservability.queue.status,
      metrics: [
        {
          label: "Waiting / Active",
          value: `${operationalObservability.queue.waiting} / ${operationalObservability.queue.active}`,
        },
        {
          label: "Failed / Delayed",
          value: `${operationalObservability.queue.failed} / ${operationalObservability.queue.delayed}`,
        },
      ],
      message: operationalObservability.queue.message,
    },
    {
      title: "WhatsApp",
      status: operationalObservability.whatsapp.status,
      metrics: [
        { label: "Canales activos", value: String(operationalObservability.whatsapp.activeChannels) },
        {
          label: "Ult. inbound / delivery",
          value: `${formatOptionalRelativeTime(operationalObservability.whatsapp.lastInboundAt)} / ${formatOptionalRelativeTime(operationalObservability.whatsapp.lastDeliveryAt)}`,
        },
      ],
      message: operationalObservability.whatsapp.message,
    },
    {
      title: "OpenAI",
      status: operationalObservability.openai.status,
      metrics: [
        {
          label: "Credencial",
          value: operationalObservability.openai.hasKey ? "Presente" : "Ausente",
        },
      ],
      message: operationalObservability.openai.message,
    },
    {
      title: "Mercado Pago",
      status: operationalObservability.mercadopago.status,
      metrics: [
        {
          label: "Credenciales",
          value: operationalObservability.mercadopago.hasCredentials ? "Completas" : "Incompletas",
        },
        {
          label: "Ultimo pago",
          value: formatOptionalRelativeTime(operationalObservability.mercadopago.lastPaymentAt),
        },
      ],
      message: operationalObservability.mercadopago.message,
    },
  ] as const;

  return (
    <div className="w-full max-w-none px-6 lg:px-8 space-y-8 print:max-w-none print:px-0 print:mx-0 print:space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-slate-300 print:shadow-none">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-none w-full space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Fuente oficial de operacion superadmin
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Manual Operativo</h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-200 sm:text-base">
                  Guia viva del entorno superadmin para mantener la plataforma funcionando al 100%,
                  acelerar onboarding tecnico y reducir errores de operacion.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
                    Para quien
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">Superadmin y soporte tecnico</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
                    Que resuelve
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">Operacion, configuracion y mantenimiento</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
                    Estado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">Base lista para checks dinamicos</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end shrink-0">
              <PrintManualButton />
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 print:hidden">
                Centraliza checklist, playbooks y troubleshooting del entorno superadmin.
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50 px-6 py-6 sm:px-8 print:px-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Estado del sistema
              </p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Estado operativo en vivo
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Lectura rapida del runtime actual para detectar desalineaciones antes de bajar al
                detalle del manual.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {statusCards.map((item) => {
                const ui = getStatusUi(item.status);

                return (
                  <article
                    key={item.title}
                    className={`rounded-2xl border p-5 shadow-sm print:break-inside-avoid print:shadow-none ${ui.card}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <h3 className={`text-sm font-bold ${ui.text}`}>{item.title}</h3>
                        <p className={`text-sm leading-6 ${ui.text}`}>{item.description}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${ui.chip}`}
                      >
                        {ui.label}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-6 sm:px-8 print:px-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Alertas operativas
              </p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Que mirar primero ahora
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Las alertas priorizan impacto operativo real y te indican el siguiente modulo del
                panel a revisar.
              </p>
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => {
                const ui = getAlertUi(alert.severity);

                return (
                  <article
                    key={`${alert.severity}-${alert.title}`}
                    className={`rounded-2xl border p-5 shadow-sm print:break-inside-avoid print:shadow-none ${ui.card}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${ui.chip}`}
                          >
                            {ui.label}
                          </span>
                          <h3 className={`text-base font-bold ${ui.text}`}>{alert.title}</h3>
                        </div>

                        <div className="space-y-2">
                          <p className={`text-sm leading-6 ${ui.text}`}>{alert.message}</p>
                          <p className="text-sm leading-6 text-slate-700">
                            <span className="font-semibold text-slate-900">Impacto:</span>{" "}
                            {alert.impact}
                          </p>
                          <p className="text-sm leading-6 text-slate-700">
                            <span className="font-semibold text-slate-900">Accion sugerida:</span>{" "}
                            {alert.action}
                          </p>
                        </div>
                      </div>

                      {alert.href ? (
                        <Link
                          href={alert.href}
                          className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 print:hidden"
                        >
                          Abrir modulo
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-white px-6 py-6 sm:px-8 print:px-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Observabilidad operativa
              </p>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Senales reales para diagnostico rapido
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Esta capa usa fuentes reales del sistema para detectar degradacion en worker, cola y
                servicios criticos sin convertir el manual en un dashboard pesado.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {observabilityCards.map((item) => {
                const ui = getOperationalStatusUi(item.status);

                return (
                  <article
                    key={item.title}
                    className={`rounded-2xl border p-5 shadow-sm print:break-inside-avoid print:shadow-none ${ui.card}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <h3 className={`text-sm font-bold ${ui.text}`}>{item.title}</h3>
                        <p className={`text-sm leading-6 ${ui.text}`}>{item.message}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${ui.chip}`}
                      >
                        {ui.label}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {item.metrics.map((metric) => (
                        <div key={`${item.title}-${metric.label}`} className="rounded-xl border border-white/60 bg-white/60 px-3 py-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            {metric.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 px-6 py-8 sm:px-8 print:block print:px-6 print:py-6">
          <aside className="space-y-3 print:hidden xl:col-span-3 2xl:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Navegacion interna
              </p>
              <nav className="mt-3 space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
                  >
                    {section.label}
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </a>
                ))}
              </nav>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                Uso recomendado
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Usalo antes de un alta nueva, cuando falle una integracion y como referencia rapida
                para operar el entorno sin depender de explicacion oral.
              </p>
            </div>
          </aside>

          <div className="space-y-8 print:space-y-6 xl:col-span-9 2xl:col-span-10">
            <section id="vision-operativa" className="space-y-5 scroll-mt-24">
              <SectionHeader
                eyebrow="Vision operativa"
                title="Que controla el superadmin y de que depende"
                description="El superadmin sostiene la salud del entorno, el alta de cuentas, las integraciones externas, el estado comercial y la continuidad operativa. Cuando una dependencia critica cae, el impacto se propaga a conversaciones, onboarding, cobros y soporte."
              />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {operationalDependencies.map((dependency) => (
                  <article
                    key={dependency.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-violet-50 p-2 text-violet-600">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-bold text-slate-900">{dependency.title}</h3>
                        <p className="text-sm leading-6 text-slate-600">{dependency.description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="checklist-100" className="space-y-5 scroll-mt-24">
              <SectionHeader
                eyebrow="Checklist"
                title="Condiciones para operar al 100%"
                description="Lista de verificacion operativa para dejar el entorno alineado y sin puntos ciegos antes de trabajar sobre clientes reales."
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {checklistGroups.map((group) => (
                  <article
                    key={group.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-800">
                        {group.title}
                      </h3>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {group.items.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section id="guias-paso-a-paso" className="space-y-5 scroll-mt-24">
              <SectionHeader
                eyebrow="Guias paso a paso"
                title="Configuraciones criticas del entorno"
                description="Playbooks escritos sobre la realidad actual del sistema: webhooks, runtime, variables sensibles y validaciones concretas."
              />

              <div className="space-y-4">
                {playbooks.map((playbook) => (
                  <article
                    key={playbook.title}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid print:shadow-none"
                  >
                    <div className="border-b bg-slate-50 px-5 py-4">
                      <h3 className="text-base font-bold text-slate-900">{playbook.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{playbook.summary}</p>
                    </div>
                    <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
                      <ol className="space-y-3">
                        {playbook.steps.map((step, index) => (
                          <li key={step} className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                              {index + 1}
                            </span>
                            <span className="text-sm leading-6 text-slate-700">{step}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                          Validacion final
                        </p>
                        <p className="mt-2 text-sm leading-6 text-violet-900">{playbook.validation}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="modulos-superadmin" className="space-y-5 scroll-mt-24">
              <SectionHeader
                eyebrow="Panel superadmin"
                title="Que hace cada bloque importante de la plataforma"
                description="Mapa rapido del panel para intervenir con criterio y entender donde mirar segun el problema."
              />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {modules.map((module) => {
                  const Icon = module.icon;

                  return (
                    <article
                      key={module.title}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{module.title}</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{module.description}</p>
                          </div>
                        </div>
                        <Link
                          href={module.href}
                          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 print:hidden"
                        >
                          Abrir
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section id="troubleshooting" className="space-y-5 scroll-mt-24">
              <SectionHeader
                eyebrow="Troubleshooting"
                title="Que revisar primero cuando algo falla"
                description="Lista corta y operativa para cortar tiempo de diagnostico sin abrir diez frentes a la vez."
              />

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {troubleshooting.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none"
                  >
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {item.checks.map((check) => (
                        <li key={check} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300" />
                          <span>{check}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section id="control-comercial" className="space-y-5 scroll-mt-24">
              <SectionHeader
                eyebrow="Control Comercial"
                title="Reglas de Facturación y Suscripción (Manual vs Automático)"
                description="El sistema opera bajo un flujo híbrido: permite cobros automatizados por pasarelas (Stripe/Mercado Pago) o la administración manual por parte del Superadmin para excepciones comerciales y transferencias offline."
              />

              <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-800 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Flujo Manual (Superadmin Controls)
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Ubicado en el modal <strong>Comercial</strong> de cada cliente en Clientes. Tiene jerarquía sobre cualquier automatización:
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600 list-disc pl-4">
                    <li><strong>Activar 30d:</strong> Establece el estado comercial en <code>ACTIVE</code> y el modo de cobro en <code>TRANSFER</code> por 30 días, habilitando de inmediato el acceso al workspace.</li>
                    <li><strong>Prueba 14d:</strong> Asigna el estado en <code>TRIALING</code> con modo <code>MANUAL</code> por 14 días. Excelente para pruebas y onboarding técnico, sin aparecer en el carrusel de producción.</li>
                    <li><strong>Suspender:</strong> Pone la cuenta en <code>SUSPENDED</code>, bloqueando el acceso al panel e interrumpiendo de inmediato los bots de WhatsApp.</li>
                    <li><strong>Monto / Plan:</strong> Campo de texto libre para definir el abono (ej: <code>$45.000</code>). Se refleja de inmediato en el dashboard y la lista de clientes.</li>
                  </ul>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-800 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                    Flujo Automático (Pasarelas & Webhooks)
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Procesado a través de webhooks de cobros online seguros:
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600 list-disc pl-4">
                    <li><strong>Cobros exitosos:</strong> El webhook detecta el cobro y cambia automáticamente la suscripción a <code>ACTIVE</code>, extendiendo el vencimiento 30 días con modo <code>ONLINE</code>.</li>
                    <li><strong>Alertas de Mora:</strong> Si un cobro falla, la cuenta pasa automáticamente a <code>PAST_DUE</code>.</li>
                    <li><strong>Agente de Cobranzas IA:</strong> Analiza facturas pendientes y genera borradores de cobranza personalizados para enviar vía WhatsApp basándose en los días de mora.</li>
                  </ul>
                </article>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Regla Crítica del Carrusel Público</p>
                <p className="mt-2 text-sm text-amber-900 leading-relaxed font-medium">
                  Para asegurar la calidad y estética de la marca en producción, en el carrusel comercial de la Landing Pública <strong>solo figurarán inmobiliarias con estado ACTIVE</strong> y abono real configurado que hayan pasado satisfactoriamente el onboarding. Cuentas en modo prueba (<code>TRIALING</code>) o demostraciones inactivas están estrictamente excluidas de la vista pública.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 print:border-slate-300">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Siguiente etapa
                  </p>
                  <h3 className="text-base font-bold text-slate-900">
                    Base lista para checks operativos dinamicos
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600">
                    La estructura ya deja preparado el modulo para sumar estados en vivo, checklist accionable y validaciones automáticas por servicio.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Health en vivo</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Checklist dinamico</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Estados por integracion</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
