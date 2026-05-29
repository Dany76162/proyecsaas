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
  { id: "vision-operativa", label: "Visión operativa" },
  { id: "checklist-100", label: "Checklist 100%" },
  { id: "guias-paso-a-paso", label: "Guías paso a paso" },
  { id: "modulos-superadmin", label: "Funciones del panel" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "control-comercial", label: "Control Comercial" },
] as const;

const operationalDependencies = [
  {
    title: "Meta / WhatsApp",
    description:
      "Canal principal de mensajería. Sin webhook correcto, secreto de la app (secret), token de verificación (verify token) y número operativo, la plataforma no recibe ni enruta conversaciones.",
  },
  {
    title: "OpenAI (Motor de IA)",
    description:
      "Motor de Inteligencia Artificial para respuestas, clasificación y automatizaciones. Requiere una clave API (API key) válida y disponibilidad estable del servicio.",
  },
  {
    title: "Railway",
    description:
      "Infraestructura de despliegue y secretos del tiempo de ejecución (runtime) web y del worker en segundo plano. Cualquier cambio o desalineación de variables de entorno impacta de inmediato en la autenticación, los webhooks y las colas de procesamiento.",
  },
  {
    title: "PostgreSQL",
    description:
      "Base de datos relacional y fuente única de verdad para usuarios, organizaciones, conversaciones, facturación y estados operativos.",
  },
  {
    title: "Redis",
    description:
      "Capa de caché de mensajes y procesamiento de tareas asíncronas en segundo plano. Si la aplicación web recibe eventos pero el proceso worker de automatizaciones o Redis fallan, la operación de los agentes queda incompleta.",
  },
  {
    title: "Mercado Pago (Cobros)",
    description:
      "Capa de cobros en línea para el SaaS. Necesita credenciales de producción, firma de webhook configurada y URLs de retorno (Back URLs) consistentes.",
  },
  {
    title: "Variables críticas",
    description:
      "Secretos y configuraciones del sistema sin valores predeterminados (defaults) inseguros para autenticación, cifrado de tokens, webhooks y servicios externos.",
  },
] as const;

const checklistGroups = [
  {
    title: "Infraestructura",
    items: [
      "Aplicación desplegada y accesible en la web",
      "Base de datos PostgreSQL activa y con lecturas exitosas",
      "Caché en memoria Redis activo",
      "Worker en segundo plano operativo con señales periódicas (heartbeat) recientes",
      "Logs y controles de salud (health checks) disponibles y sin errores",
    ],
  },
  {
    title: "WhatsApp / Meta",
    items: [
      "Cuenta de Meta Business validada por Facebook",
      "Aplicación en Meta Developers configurada en modo Live (En producción)",
      "Número de WhatsApp Business oficial operativo y verificado",
      "Webhook productivo apuntando a la URL /api/webhooks/whatsapp",
      "Variables `WHATSAPP_APP_SECRET` y `WHATSAPP_WEBHOOK_VERIFY_TOKEN` configuradas en Railway",
      "Canal de entrada asignado a la organización correspondiente de forma correcta",
    ],
  },
  {
    title: "OpenAI",
    items: [
      "Variable `OPENAI_API_KEY` o `AI_INTEGRATIONS_OPENAI_API_KEY` configurada con saldo suficiente",
      "Modelos de IA (GPT-4o y similares) operativos y disponibles en tu región",
      "Integración accesible tanto desde el servidor web como desde el worker en segundo plano",
    ],
  },
  {
    title: "Mercado Pago",
    items: [
      "Variable `MERCADO_PAGO_ACCESS_TOKEN` configurada y en modo de producción",
      "Variable `MERCADO_PAGO_WEBHOOK_SECRET` configurada para validar las firmas de cobro",
      "Webhook productivo registrado apuntando a /api/webhooks/mercadopago",
      "Variable `NEXT_PUBLIC_APP_URL` correctamente definida para el procesamiento de URLs de retorno",
    ],
  },
  {
    title: "Tiempo de ejecución / secretos",
    items: [
      "Variables `AUTH_SESSION_SECRET` y `AUTH_SHARED_PASSWORD` cargadas con secretos seguros",
      "Variable de cifrado de tokens de WhatsApp (`WHATSAPP_TOKEN_ENCRYPTION_KEY`) presente",
      "Variable `NEXT_PUBLIC_APP_URL` configurada de manera consistente con el dominio real",
      "Sin valores predeterminados (defaults) inseguros activos en el entorno de producción",
      "Políticas de uso y privacidad públicas y configuradas correctamente en /privacy",
    ],
  },
] as const;

const playbooks = [
  {
    title: "Configurar WhatsApp / Meta desde cero",
    summary:
      "Alta completa del canal oficial de mensajería para que entren consultas reales de clientes y se procesen por la capa automatizada.",
    steps: [
      "Crear o verificar la cuenta de Meta Business de la plataforma.",
      "Ingresar a Meta Developers, crear la aplicación y habilitar el producto WhatsApp.",
      "Obtener el token de acceso de larga duración, el secreto de la aplicación (app secret) y definir el token de verificación (verify token).",
      "Registrar el número de teléfono oficial y asociarlo a la cuenta comercial correspondiente.",
      "Cargar los secretos en la consola de Railway y confirmar que el tiempo de ejecución web no marque variables faltantes.",
      "Configurar el webhook productivo en Meta Developers apuntando a /api/webhooks/whatsapp y validar el reto (challenge).",
      "Probar un enlace de captación con el parámetro [ref:orgslug] para confirmar que la consulta ingresa al espacio de la organización correcta.",
      "Enviar un mensaje real de prueba y verificar el tráfico en los logs de webhooks y el worker en segundo plano.",
    ],
    validation:
      "El servidor de webhooks debe responder 200 OK, el mensaje debe recibirse, registrar la tarea en cola (job) y mostrar la actividad en la bandeja de entrada.",
  },
  {
    title: "Configurar Railway",
    summary:
      "Control del entorno de infraestructura para asegurar la estabilidad del servidor web y del worker en segundo plano con todas las variables en línea.",
    steps: [
      "Verificar en la consola de Railway que tanto el servicio web como el worker compilen correctamente sobre la rama esperada.",
      "Confirmar las variables críticas: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL` y `NEXT_PUBLIC_APP_URL`.",
      "Cargar las variables de sesión `AUTH_SESSION_SECRET`, `AUTH_SHARED_PASSWORD` y las credenciales de WhatsApp y Mercado Pago.",
      "Asegurar que los comandos de inicio utilicen migraciones ya preparadas y no realicen modificaciones destructivas de esquema en producción.",
      "Revisar logs de inicio, el indicador de latido (heartbeat) del worker y que no haya errores de conexión.",
    ],
    validation:
      "La plataforma debe iniciar de manera limpia sin variables faltantes críticas y el worker debe reportar su señal periódica.",
  },
  {
    title: "Configurar OpenAI",
    summary:
      "Habilitación del motor de Inteligencia Artificial que procesa, clasifica e interactúa de manera autónoma con los prospectos e inmobiliarias.",
    steps: [
      "Obtener la API Key desde el panel de proveedores de OpenAI con los permisos de modelo correctos.",
      "Cargar la clave en Railway utilizando la variable de entorno ya soportada por el sistema.",
      "Confirmar que el servidor web y el worker en segundo plano utilicen exactamente el mismo secreto de acceso.",
      "Verificar que el modelo configurado en el sistema esté habilitado y tenga cuota activa.",
      "Simular una conversación de prueba y auditar los registros para descartar problemas de rate-limit o falta de saldo.",
    ],
    validation:
      "La respuesta de la IA debe completarse de forma fluida sin errores de autenticación (401) ni caídas del modelo.",
  },
  {
    title: "Configurar Mercado Pago",
    summary:
      "Preparación de los enlaces de suscripción SaaS, validación de firmas digitales de pago y confirmación de estados comerciales.",
    steps: [
      "Obtener el token de acceso de producción y la clave secreta del webhook desde el panel de desarrolladores de Mercado Pago.",
      "Configurar las variables `MERCADO_PAGO_ACCESS_TOKEN` y `MERCADO_PAGO_WEBHOOK_SECRET` en Railway.",
      "Confirmar que `NEXT_PUBLIC_APP_URL` esté apuntando al dominio público de producción.",
      "Registrar el endpoint del webhook apuntando a /api/webhooks/mercadopago con eventos de suscripción y pagos activos.",
      "Generar una prueba de cobro en el simulador y verificar la recepción firmada digitalmente por la plataforma.",
    ],
    validation:
      "Los enlaces de pago deben crearse sin fallos y las notificaciones automáticas deben cambiar el estado del cliente de forma inmediata.",
  },
  {
    title: "Gestión de Privacidad y Auditoría",
    summary:
      "Supervisar el acceso administrativo del equipo superadmin a los datos de los clientes y garantizar la transparencia del sistema.",
    steps: [
      "Confirmar que todos los usuarios e inmobiliarias acepten los términos y la política de privacidad en su primer ingreso a la app.",
      "Validar que el bypass de acceso a workspaces de inmobiliarias registre correctamente el log correspondiente en la base de datos.",
      "Monitorear la tabla AuditLog de forma regular para auditar cualquier acción realizada por un superadmin sobre tenants ajenos.",
      "Asegurar que los textos informativos en el flujo de ingreso expliquen claramente el alcance administrativo por motivos de seguridad.",
    ],
    validation:
      "Cada acceso administrativo a un espacio ajeno debe generar una entrada inmutable con el evento SUPERADMIN_WORKSPACE_ACCESS.",
  },
] as const;

const modules = [
  {
    title: "Resumen",
    href: "/platform",
    icon: ShieldCheck,
    description:
      "Vista ejecutiva de la salud del entorno, análisis de riesgos de churn, estado de onboarding y volumen transaccional.",
  },
  {
    title: "Operaciones IA",
    href: "/platform/ai-operations",
    icon: Bot,
    description:
      "Monitoreo de la actividad automatizada, tareas de procesamiento de lenguaje natural y funcionamiento del motor de IA.",
  },
  {
    title: "Clientes",
    href: "/platform/organizations",
    icon: Building2,
    description:
      "Inventario operativo de organizaciones de inmobiliarias, gestión de accesos, suspensión de tenants y papelera de reciclaje.",
  },
  {
    title: "Atención a Clientes",
    href: "/platform/support",
    icon: MessageSquare,
    description:
      "Seguimiento de soporte, tickets y chat interactivo con cuentas activas desde el entorno administrativo central.",
  },
  {
    title: "Captación",
    href: "/platform/captacion",
    icon: Megaphone,
    description:
      "Enlace comercial oficial para captar inmobiliarias interesadas y verificar el flujo de alta automatizada por WhatsApp.",
  },
  {
    title: "Onboarding",
    href: "/platform/onboarding",
    icon: UserPlus,
    description:
      "Gestión de invitaciones enviadas, creación de accesos iniciales para nuevas inmobiliarias y control de vencimientos.",
  },
  {
    title: "Activación",
    href: "/platform/activation",
    icon: ActivitySquare,
    description:
      "Monitoreo del nivel de adopción real del software para detectar cuentas inactivas y proponer asistencia personalizada.",
  },
  {
    title: "Salud del sistema",
    href: "/platform/health",
    icon: ActivitySquare,
    description:
      "Tablero de integraciones, worker, integraciones de servicios, estado en vivo del worker, registros de auditoría administrativa y alertas técnicas.",
  },
  {
    title: "Comercial",
    href: "/platform/billing",
    icon: CreditCard,
    description:
      "Control de suscripciones, generación manual de cobros, enlaces de pago en línea y estado de facturación por organización.",
  },
  {
    title: "Configuración",
    href: "/platform/settings",
    icon: Settings,
    description:
      "Punto de control administrativo para ajustes globales, credenciales del sistema y secretos sensibles.",
  },
] as const;

const troubleshooting = [
  {
    title: "No llegan mensajes de WhatsApp",
    checks: [
      "Confirmar que Meta apunte exactamente a /api/webhooks/whatsapp.",
      "Revisar el secreto de la app, el token de verificación y la firma criptográfica entrante.",
      "Validar que el phone_number_id corresponda a un canal activo registrado.",
      "Corroborar que el worker en segundo plano se encuentre encendido y reportando.",
    ],
  },
  {
    title: "El worker no procesa tareas",
    checks: [
      "Revisar el estado y latencia del latido (heartbeat) reciente en Salud del sistema.",
      "Confirmar que la variable `REDIS_URL` tenga credenciales activas y conectividad total.",
      "Buscar fallos, errores de cola o caídas por límites de memoria en los logs de Railway.",
      "Verificar que la aplicación web esté encolando correctamente las tareas (jobs).",
    ],
  },
  {
    title: "OpenAI no responde",
    checks: [
      "Verificar la validez de la API Key cargada en el panel de secretos.",
      "Revisar errores del proveedor de IA o límites de cuota (rate limits) en los registros.",
      "Confirmar que el modelo seleccionado siga activo y disponible en el catálogo de OpenAI.",
    ],
  },
  {
    title: "Mercado Pago no acredita pagos",
    checks: [
      "Confirmar la vigencia del access token de producción y el secret del webhook.",
      "Revisar que haya tráfico de red exitoso hacia la URL /api/webhooks/mercadopago.",
      "Validar la validez de la firma digital, el ID de notificación y el estado comercial de la inmobiliaria.",
    ],
  },
  {
    title: "Webhook no valida el challenge",
    checks: [
      "Comparar el token de verificación configurado en el proveedor externo con el de Railway.",
      "Verificar que los encabezados (headers) esperados estén presentes y el cuerpo sin alteraciones.",
      "Confirmar que no se esté consumiendo un endpoint antiguo o discontinuado por error.",
    ],
  },
  {
    title: "La consulta entra por link pero no cae en la inmobiliaria correcta",
    checks: [
      "Validar que el enlace comercial compartido conserve el prefijo obligatorio [ref:orgslug] en el mensaje predeterminado.",
      "Revisar que el identificador (slug) de la organización inmobiliaria exista en la base y esté en estado activo.",
      "Confirmar que el webhook de producción de Meta apunte a la ruta unificada y no a un endpoint desactualizado.",
    ],
  },
  {
    title: "El link comercial de la plataforma no inicia la conversación automatizada",
    checks: [
      "Confirmar que la variable global `PLATFORM_WHATSAPP_NUMBER` contenga el número oficial y Meta esté conectado.",
      "Verificar que la variable `WHATSAPP_ORGANIZATION_ID` apunte al slug del tenant superadmin configurado.",
      "Auditar el canal de soporte para comprobar si las conversaciones entrantes se registran en la bandeja central.",
    ],
  },
  {
    title: "Acceso administrativo denegado (404) en un workspace de cliente",
    checks: [
      "Confirmar que el usuario administrador de plataforma tenga la bandera `isPlatformAdmin: true` activa.",
      "Verificar que la URL del espacio de trabajo del cliente esté utilizando el slug exacto registrado.",
      "Revisar si el middleware de sesión o las reglas de membresía están bloqueando por falta de aceptación de términos.",
    ],
  },
  {
    title: "El usuario no puede salir de la pantalla de políticas",
    checks: [
      "Validar que la redirección post-aceptación tenga cargado el parámetro de retorno 'next' de forma correcta.",
      "Comprobar en la base de datos que la acción guarde la fecha en `termsAcceptedAt` para el ID de usuario correspondiente.",
      "Confirmar que no haya bucles infinitos causados por validaciones duplicadas en `requireSessionUser`.",
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
      title: "WhatsApp oficial",
      status: snapshot.whatsapp,
      description:
        snapshot.whatsapp === "ok"
          ? "Webhook y secretos base configurados para operar el canal de mensajería."
          : "Faltan secretos de WhatsApp en la configuración para validar firmas y eventos.",
    },
    {
      title: "OpenAI",
      status: snapshot.openai,
      description:
        snapshot.openai === "ok"
          ? "Credencial de acceso de OpenAI API activa."
          : "Falta la variable de entorno `OPENAI_API_KEY` en el servidor actual.",
    },
    {
      title: "PostgreSQL",
      status: snapshot.db,
      description:
        snapshot.db === "ok"
          ? "La base de datos relacional responde de forma rápida a consultas SELECT."
          : "Fallo en la comunicación con la base de datos relacional PostgreSQL.",
    },
    {
      title: "Redis / Worker",
      status: snapshot.redis,
      description:
        snapshot.redis === "ok"
          ? "La base en memoria de caché Redis respondió exitosamente al PING."
          : "Fallo al conectar con Redis. Las colas y el procesamiento asíncrono pueden degradarse.",
    },
    {
      title: "Mercado Pago",
      status: snapshot.mercadopago,
      description:
        snapshot.mercadopago === "ok"
          ? "Credenciales comerciales y firma digital de webhook presentes."
          : "Falta el access token o la firma digital para automatizar la facturación y cobros.",
    },
    {
      title: "Variables críticas",
      status: snapshot.runtime,
      description:
        snapshot.runtime === "ok"
          ? "Variables `AUTH_SESSION_SECRET` y `NEXT_PUBLIC_APP_URL` presentes."
          : "Faltan variables críticas del entorno runtime para autenticación o URLs de redirección.",
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
      title: "Proceso en segundo plano (Worker)",
      status: operationalObservability.worker.status,
      metrics: [
        { label: "Último latido (heartbeat)", value: formatOptionalRelativeTime(operationalObservability.worker.lastSeenAt) },
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
      title: "Colas de procesamiento (BullMQ)",
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
                Fuente oficial de operación superadmin
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
                    Para quién
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">Superadmin y soporte tecnico</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-300">
                    Qué resuelve
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
                Centraliza checklists, playbooks y troubleshooting del entorno superadmin.
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
                Lectura rápida del tiempo de ejecución (runtime) actual para detectar desalineaciones antes de bajar al
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
                Qué mirar primero ahora
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
                            <span className="font-semibold text-slate-900">Acción sugerida:</span>{" "}
                            {alert.action}
                          </p>
                        </div>
                      </div>

                      {alert.href ? (
                        <Link
                          href={alert.href}
                          className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 print:hidden"
                        >
                          Abrir módulo
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
                Señales reales para diagnóstico rápido
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
                Navegación interna
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
                eyebrow="Visión operativa"
                title="Qué controla el superadmin y de qué depende"
                description="El superadmin sostiene la salud del entorno, el alta de cuentas, las integraciones externas, el estado comercial y la continuidad operativa. Cuando una dependencia crítica cae, el impacto se propaga a conversaciones, onboarding, cobros y soporte."
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
                description="Lista de verificación operativa para dejar el entorno alineado y sin puntos ciegos antes de trabajar sobre clientes reales."
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
                eyebrow="Guías paso a paso"
                title="Configuraciones críticas del entorno"
                description="Playbooks escritos sobre la realidad actual del sistema: webhooks, runtime, variables de entorno y validaciones concretas."
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
                title="Qué hace cada bloque importante de la plataforma"
                description="Mapa rápido del panel superadmin para intervenir con criterio y entender a dónde dirigirse según la alerta reportada."
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
                title="Qué revisar primero cuando algo falla"
                description="Lista corta y operativa para recortar los tiempos de diagnóstico de incidentes sin abrir múltiples frentes a la vez."
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
                    Base lista para checks operativos dinámicos
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-slate-600">
                    La estructura ya deja preparado el modulo para sumar estados en vivo, checklist accionable y validaciones automáticas por servicio.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Health en vivo</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Checklist dinámico</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Estados por integración</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
