export const dynamic = "force-dynamic";

import { CheckCircle2, XCircle, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getWorkerHeartbeatStatus } from "@/modules/platform/service";

function formatSecondsAgo(s: number): string {
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  return `hace ${Math.floor(s / 3600)}h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const WORKER_UI = {
  ok: {
    label: "Operativo",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
  },
  stale: {
    label: "Lento",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    icon: <Clock className="h-5 w-5 text-amber-500 shrink-0" />,
  },
  down: {
    label: "Caído",
    chip: "border-red-200 bg-red-50 text-red-700",
    icon: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
  },
} as const;

export default async function PlatformHealthPage() {
  const now = new Date();

  const [worker, activeOrgCount, pendingInvites, expiredInvites, pendingBilling, paidBilling, auditLogs] =
    await Promise.all([
      getWorkerHeartbeatStatus(),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.inviteToken.count({ where: { usedAt: null, expiresAt: { gte: now } } }),
      prisma.inviteToken.count({ where: { usedAt: null, expiresAt: { lt: now } } }),
      prisma.orgBillingRecord.count({ where: { status: "PENDING" } }),
      prisma.orgBillingRecord.count({ where: { status: "PAID" } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }).catch(() => []),
    ]);

  const mpConfigured = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const openAiConfigured = !!(process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? process.env.OPENAI_API_KEY);
  const encryptionConfigured = !!process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  const waContact = process.env.PLATFORM_WHATSAPP_CONTACT ?? null;

  type AlertLevel = "error" | "warning";
  const alerts: { level: AlertLevel; message: string }[] = [];

  if (worker.status === "down")
    alerts.push({ level: "error", message: "Worker caído: no se recibió heartbeat en más de 5 minutos." });
  else if (worker.status === "stale")
    alerts.push({ level: "warning", message: "Worker lento: último heartbeat hace más de 2 minutos." });

  if (activeOrgCount === 0)
    alerts.push({ level: "error", message: "No hay organizaciones activas en la plataforma." });

  if (!encryptionConfigured)
    alerts.push({ level: "warning", message: "Cifrado de tokens WhatsApp no configurado — WHATSAPP_TOKEN_ENCRYPTION_KEY ausente." });

  if (!mpConfigured)
    alerts.push({ level: "warning", message: "Mercado Pago no configurado — MERCADO_PAGO_ACCESS_TOKEN ausente." });

  if (!openAiConfigured)
    alerts.push({ level: "warning", message: "Motor IA no configurado — AI_INTEGRATIONS_OPENAI_API_KEY ausente." });

  if (pendingBilling > 0)
    alerts.push({ level: "warning", message: `${pendingBilling} cobro${pendingBilling !== 1 ? "s" : ""} pendiente${pendingBilling !== 1 ? "s" : ""} de confirmación.` });

  const workerUi = WORKER_UI[worker.status];

  const AUDIT_LABELS: Record<string, { label: string; color: string }> = {
    "billing.record_created":  { label: "Cobro creado",           color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    "billing.paid":            { label: "Pago confirmado",        color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    "billing.cancelled":       { label: "Cobro cancelado",        color: "text-slate-500 bg-slate-50 border-slate-200" },
    "billing.status_changed":  { label: "Estado cobro cambiado",  color: "text-amber-700 bg-amber-50 border-amber-200" },
    "billing.mp_link_generated":{ label: "Link MP generado",      color: "text-violet-600 bg-violet-50 border-violet-200" },
    "org.reactivated":         { label: "Org reactivada",         color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    "org.suspended":           { label: "Org suspendida",         color: "text-red-600 bg-red-50 border-red-200" },
    "settings.updated":        { label: "Configuración editada",  color: "text-blue-600 bg-blue-50 border-blue-200" },
    "admin.access_granted":    { label: "Admin delegado",         color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    "admin.access_revoked":    { label: "Acceso revocado",        color: "text-red-600 bg-red-50 border-red-200" },
  };

  const integrations = [
    {
      label: "Mercado Pago",
      detail: mpConfigured ? "MERCADO_PAGO_ACCESS_TOKEN configurado" : "MERCADO_PAGO_ACCESS_TOKEN ausente",
      ok: mpConfigured,
    },
    {
      label: "OpenAI (motor IA)",
      detail: openAiConfigured ? "Replit AI proxy activo" : "AI_INTEGRATIONS_OPENAI_API_KEY ausente",
      ok: openAiConfigured,
    },
    {
      label: "Cifrado de tokens WhatsApp",
      detail: encryptionConfigured ? "WHATSAPP_TOKEN_ENCRYPTION_KEY configurado" : "WHATSAPP_TOKEN_ENCRYPTION_KEY ausente",
      ok: encryptionConfigured,
    },
    {
      label: "Contacto WhatsApp de plataforma",
      detail: waContact ? `+54 ${waContact}` : "PLATFORM_WHATSAPP_CONTACT ausente",
      ok: !!waContact,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Salud del Sistema</h1>
        <p className="text-sm text-slate-500">
          Estado operativo de la plataforma en tiempo real.
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-2xl border px-5 py-3.5 text-sm font-medium ${
                a.level === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Orgs activas</p>
          <p className={`mt-2 text-3xl font-extrabold ${activeOrgCount === 0 ? "text-red-500" : "text-slate-900"}`}>
            {activeOrgCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Invites pendientes</p>
          <p className={`mt-2 text-3xl font-extrabold ${pendingInvites > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {pendingInvites}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cobros pendientes</p>
          <p className={`mt-2 text-3xl font-extrabold ${pendingBilling > 0 ? "text-amber-600" : "text-slate-900"}`}>
            {pendingBilling}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cobros confirmados</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">{paidBilling}</p>
        </div>
      </div>

      {/* Worker */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b bg-slate-50 px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Worker BullMQ</h3>
        </div>
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            {workerUi.icon}
            <div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${workerUi.chip}`}>
                {workerUi.label}
              </span>
              {worker.lastSeenAt ? (
                <p className="mt-1.5 text-xs text-slate-500">
                  Último heartbeat: {formatDate(worker.lastSeenAt)}
                  {worker.secondsAgo !== null && ` (${formatSecondsAgo(worker.secondsAgo)})`}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-400">Sin registros de heartbeat en base de datos.</p>
              )}
            </div>
          </div>
          <p className="text-right text-xs text-slate-400">ok &lt; 2 min · stale &lt; 5 min · down ≥ 5 min</p>
        </div>
      </div>

      {/* Integrations */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b bg-slate-50 px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Integraciones</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {integrations.map(({ label, detail, ok }) => (
            <div key={label} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">{detail}</p>
              </div>
              {ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-red-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit log */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b bg-slate-50 px-6 py-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Auditoría del Sistema</h3>
          <span className="ml-auto text-xs text-slate-400">Últimos 30 eventos</span>
        </div>
        {auditLogs.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">
            Sin eventos registrados aún. Los eventos se generan automáticamente.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {auditLogs.map((log) => {
              const ui = AUDIT_LABELS[log.event] ?? { label: log.event, color: "text-slate-600 bg-slate-50 border-slate-200" };
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ui.color}`}>
                    {ui.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    {log.entityName && (
                      <p className="text-sm font-semibold text-slate-800 truncate">{log.entityName}</p>
                    )}
                    {log.actorEmail && (
                      <p className="text-xs text-slate-400 truncate">Por: {log.actorEmail}</p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-slate-400 tabular-nums">
                    {new Date(log.createdAt).toLocaleString("es-AR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expired invites footnote */}
      {expiredInvites > 0 && (
        <p className="text-center text-xs text-slate-400">
          {expiredInvites} invitación{expiredInvites !== 1 ? "es" : ""} expirada{expiredInvites !== 1 ? "s" : ""} sin activar —{" "}
          <a href="/platform/onboarding" className="font-semibold text-slate-600 underline underline-offset-2">
            revisalas en Onboarding
          </a>
          .
        </p>
      )}
    </div>
  );
}
