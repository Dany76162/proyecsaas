export const dynamic = "force-dynamic";

import { CheckCircle2, XCircle } from "lucide-react";

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5 font-mono break-all">{value}</p>
      </div>
      {ok ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-red-400 shrink-0" />
      )}
    </div>
  );
}

export default function PlatformSettingsPage() {
  const waContact = process.env.PLATFORM_WHATSAPP_CONTACT ?? null;
  const mpConfigured = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const encryptionConfigured = !!process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const openAiConfigured = !!process.env.OPENAI_API_KEY;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Configuración de Plataforma</h1>
        <p className="text-sm text-slate-500">
          Estado de integraciones y parámetros operativos globales. Las variables se configuran en el entorno, no desde esta UI.
        </p>
      </div>

      {/* Contacto WhatsApp oficial */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-slate-50 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Contacto oficial de plataforma</h3>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-slate-900 break-all">
                {waContact ? `+54 ${waContact}` : "No configurado"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 break-words">
                {waContact
                  ? "Número de contacto visible para clientes y comunicaciones de plataforma."
                  : "Configurá PLATFORM_WHATSAPP_CONTACT en las variables de entorno."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estado de integraciones */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b bg-slate-50 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Estado de integraciones</h3>
        </div>
        <div className="px-6">
          <StatusRow
            label="URL de la aplicación"
            value={appUrl}
            ok={!appUrl.includes("localhost")}
          />
          <StatusRow
            label="Mercado Pago"
            value={mpConfigured ? "MERCADO_PAGO_ACCESS_TOKEN configurado" : "MERCADO_PAGO_ACCESS_TOKEN no encontrado"}
            ok={mpConfigured}
          />
          <StatusRow
            label="Cifrado de tokens WhatsApp"
            value={encryptionConfigured ? "WHATSAPP_TOKEN_ENCRYPTION_KEY configurado" : "WHATSAPP_TOKEN_ENCRYPTION_KEY no encontrado"}
            ok={encryptionConfigured}
          />
          <StatusRow
            label="OpenAI (motor IA)"
            value={openAiConfigured ? "OPENAI_API_KEY configurado" : "OPENAI_API_KEY no encontrado"}
            ok={openAiConfigured}
          />
          <StatusRow
            label="Contacto WhatsApp de plataforma"
            value={waContact ? `PLATFORM_WHATSAPP_CONTACT = ${waContact}` : "PLATFORM_WHATSAPP_CONTACT no encontrado"}
            ok={!!waContact}
          />
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Para modificar estas variables, actualizalas en Railway (Variables) y redesployá el web service.
      </p>
    </div>
  );
}
