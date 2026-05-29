"use client";

import React, { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  Save,
  Loader2,
  UserPlus,
  ShieldOff,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Globe,
  Activity,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { DeleteUserButton } from "@/components/platform/DeleteUserButton";
import {
  updateGlobalSetting,
  grantAdminAccess,
  revokeAdminAccess,
} from "./actions/settings-actions";
import { cn } from "@/lib/utils";

// --- Editable Setting Row ----------------------------------------------------

function EditableSetting({
  label,
  settingKey,
  initialValue,
  description,
  placeholder,
}: {
  label: string;
  settingKey: string;
  initialValue: string;
  description: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isSensitive = settingKey === "OPERATOR_CUID";

  const handleSave = async () => {
    // 1. Mandatory Text Validador
    if (settingKey === "OPERATOR_NAME" || settingKey === "OPERATOR_LASTNAME") {
      if (!value.trim()) {
        setMessage({ type: "error", text: "El campo no puede estar vacío." });
        return;
      }
    }

    // 2. CUIL/DNI Validador
    if (settingKey === "OPERATOR_CUID") {
      const cleanValue = value.replace(/\D/g, "");
      if (cleanValue.length < 7 || cleanValue.length > 11) {
        setMessage({ type: "error", text: "Formato inválido. Ingrese un DNI o CUIL numérico de 7 a 11 dígitos." });
        return;
      }
    }

    // 3. Teléfono de Plataforma Validador
    if (settingKey === "PLATFORM_WHATSAPP_NUMBER") {
      const cleanValue = value.replace(/\D/g, "");
      if (!cleanValue.startsWith("54") || cleanValue.length < 10) {
        setMessage({ type: "error", text: "Formato inválido. Debe comenzar con 54 (Argentina) sin espacios ni el signo + (Ej: 5491166037990)." });
        return;
      }
    }

    // 4. Precio Comercial Validador
    if (settingKey === "BASE_PLAN_PRICE_ARS") {
      const num = Number(value);
      if (isNaN(num) || num < 0) {
        setMessage({ type: "error", text: "El precio debe ser un valor numérico positivo o cero." });
        return;
      }
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await updateGlobalSetting(settingKey, value);
      setMessage({ type: "success", text: "Guardado" });
    } catch {
      setMessage({ type: "error", text: "Error al guardar" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="py-5 border-b border-slate-100 last:border-0">
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-800 uppercase tracking-widest">{label}</label>
          <p className="text-[11px] leading-relaxed text-slate-500 max-w-xl">{description}</p>
        </div>
        <div className="flex items-center gap-3 w-full relative">
          <div className="relative flex-1">
            <input
              type={isSensitive && !showSensitive ? "password" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none",
                isSensitive && "pr-12"
              )}
            />
            {isSensitive && value && (
              <button
                type="button"
                onClick={() => setShowSensitive(!showSensitive)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title={showSensitive ? "Ocultar identificador" : "Mostrar identificador"}
              >
                {showSensitive ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || value === initialValue}
            className={cn(
               "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:grayscale",
               message?.type === "success"
                 ? "bg-emerald-500 text-white"
                 : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : message?.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Save className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {message?.type === "error" && (
        <p className="mt-1.5 text-[10px] font-bold text-red-500">{message.text}</p>
      )}
    </div>
  );
}

// --- Status Row --------------------------------------------------------------

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/10 last:border-0">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-white/90 mt-0.5">{value}</p>
      </div>
      {ok ? (
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3" /> ACTIVO
        </span>
      ) : (
        <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-400 border border-red-500/20">
          <XCircle className="h-3 w-3" /> PENDIENTE
        </span>
      )}
    </div>
  );
}

// --- Delegated Admin Section -------------------------------------------------

function DelegatedAdminSection({
  initial,
}: {
  initial: { id: string; fullName: string; email: string }[];
}) {
  const [admins, setAdmins] = useState(initial);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleGrant = () => {
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await grantAdminAccess(email.trim());
      if (result.success) {
        setEmail("");
        showMessage("success", "Acceso otorgado correctamente");
        // Refresh list â€” page revalidation will update on next navigation
        // For immediate UI update, we optimistically add a placeholder
        setAdmins((prev) => [...prev, { id: "_pending", fullName: email, email }]);
      } else {
        showMessage("error", result.error ?? "Error al otorgar acceso");
      }
    });
  };

  const handleRevoke = (userId: string, name: string) => {
    startTransition(async () => {
      const result = await revokeAdminAccess(userId);
      if (result.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== userId));
        showMessage("success", `Acceso revocado a ${name}`);
      } else {
        showMessage("error", result.error ?? "Error al revocar acceso");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">
          Administración Delegada
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Otorgá acceso temporal al panel a otro usuario registrado. Podés revocarlo en cualquier momento.
        </p>
      </div>

      {/* Grant access input */}
      <div className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email del usuario a designar"
          onKeyDown={(e) => e.key === "Enter" && handleGrant()}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
        />
        <button
          onClick={handleGrant}
          disabled={isPending || !email.trim()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40 disabled:grayscale"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Designar
        </button>
      </div>

      {message && (
        <p
          className={cn(
            "text-xs font-bold",
            message.type === "success" ? "text-emerald-600" : "text-red-500"
          )}
        >
          {message.text}
        </p>
      )}

      {/* Current delegated admins */}
      {admins.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                  <Shield className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{admin.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRevoke(admin.id, admin.fullName)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-40"
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  Revocar
                </button>
                <DeleteUserButton
                  userId={admin.id}
                  userLabel={admin.fullName}
                  onDeleted={(deletedUserId) =>
                    setAdmins((prev) => prev.filter((item) => item.id !== deletedUserId))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Sin administradores delegados actualmente.</p>
      )}
    </div>
  );
}

// --- SaaS Feed Section --------------------------------------------------------

function SaaSFeedSection({
  initialFeeds,
}: {
  initialFeeds: string;
}) {
  const [feeds, setFeeds] = useState<string[]>(() => {
    try {
      return JSON.parse(initialFeeds || "[]");
    } catch {
      return [];
    }
  });
  const [newUrl, setNewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleAddFeed = async () => {
    let cleanUrl = newUrl.trim();
    if (!cleanUrl) return;

    // Validate URL or Domain
    try {
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
      }
      new URL(cleanUrl);
    } catch {
      showMessage("error", "URL o dominio inválido. Ingrese una dirección web correcta.");
      return;
    }

    if (feeds.includes(cleanUrl)) {
      showMessage("error", "Este dominio o feed ya se encuentra agregado.");
      return;
    }

    setIsSaving(true);
    setMessage(null);
    const updatedFeeds = [...feeds, cleanUrl];

    try {
      await updateGlobalSetting("SAAS_FEED_URLS", JSON.stringify(updatedFeeds));
      setFeeds(updatedFeeds);
      setNewUrl("");
      showMessage("success", "Feed agregado y guardado con éxito.");
    } catch {
      showMessage("error", "Error al guardar la configuración del Feed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFeed = async (urlToRemove: string) => {
    setIsSaving(true);
    setMessage(null);
    const updatedFeeds = feeds.filter((f) => f !== urlToRemove);

    try {
      await updateGlobalSetting("SAAS_FEED_URLS", JSON.stringify(updatedFeeds));
      setFeeds(updatedFeeds);
      showMessage("success", "Feed eliminado con éxito.");
    } catch {
      showMessage("error", "Error al eliminar la configuración del Feed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">
          Conexión y Alimentación SaaS
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Agregá dominios de catálogos y fuentes autorizadas de propiedades para alimentar el motor de captación y sincronización de leads de la plataforma.
        </p>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Ej: catalog.inmobiliarias.com o feed.raicespilot.com/v1"
          onKeyDown={(e) => e.key === "Enter" && handleAddFeed()}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
        />
        <button
          onClick={handleAddFeed}
          disabled={isSaving || !newUrl.trim()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar
        </button>
      </div>

      {message && (
        <p
          className={cn(
            "text-xs font-bold",
            message.type === "success" ? "text-emerald-600" : "text-red-500"
          )}
        >
          {message.text}
        </p>
      )}

      {feeds.length > 0 ? (
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          {feeds.map((feed, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Globe className="h-4 w-4 text-slate-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate">{feed}</p>
              </div>
              <button
                onClick={() => handleRemoveFeed(feed)}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No hay fuentes ni dominios SaaS agregados actualmente.</p>
      )}
    </div>
  );
}

// --- Main Component ----------------------------------------------------------

interface Settings {
  waContact: string;
  basePrice: string;
  operatorName: string;
  operatorLastName: string;
  operatorCuid: string;
  operatorCompany: string;
  saasFeeds: string;
  mpStatus: boolean;
  aiStatus: boolean;
}

export default function PlatformSettingsUI({
  settings,
  delegatedAdmins,
}: {
  settings: Settings;
  delegatedAdmins: { id: string; fullName: string; email: string }[];
}) {
  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-1 w-8 rounded-full bg-indigo-600" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600">
            Control Operativo
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-950">
          Panel de Configuración
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
          Definí valores y contactos internos de Raíces Pilot en tiempo real. Estos valores afectan directamente la facturación, el WhatsApp de la plataforma, el centro de soporte y la configuración comercial.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">

          {/* 1. Perfil del Operador */}
          <section className="rounded-2xl sm:rounded-[2.5rem] border border-slate-200 bg-white p-5 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-bold text-slate-900 mb-5 sm:mb-8">Perfil del Operador</h2>

            <EditableSetting
              label="Nombre"
              settingKey="OPERATOR_NAME"
              initialValue={settings.operatorName}
              description="Nombre del administrador o dueño de la plataforma."
              placeholder="Ej: Carlos"
            />
            <EditableSetting
              label="Apellido"
              settingKey="OPERATOR_LASTNAME"
              initialValue={settings.operatorLastName}
              description="Apellido del administrador."
              placeholder="Ej: García"
            />
            <EditableSetting
              label="CUIL / DNI del Operator"
              settingKey="OPERATOR_CUID"
              initialValue={settings.operatorCuid}
              description="Clave única de identificación o DNI del responsable de la plataforma (se almacena de forma encriptada en base de datos)."
              placeholder="Ej: 30123456"
            />
            <EditableSetting
              label="Razón Social (opcional)"
              settingKey="OPERATOR_COMPANY"
              initialValue={settings.operatorCompany}
              description="Nombre comercial o empresa bajo la que opera la plataforma."
              placeholder="Ej: Raíces Pilot S.A.S."
            />
          </section>

          {/* 2. Parámetros Operativos */}
          <section className="rounded-2xl sm:rounded-[2.5rem] border border-slate-200 bg-white p-5 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-bold text-slate-900 mb-5 sm:mb-8">Parámetros Operativos</h2>

            <EditableSetting
              label="Número general de WhatsApp de la plataforma"
              settingKey="PLATFORM_WHATSAPP_NUMBER"
              initialValue={settings.waContact}
              description="Número de WhatsApp que los clientes de las inmobiliarias usan para contactarse. Es el número visible en el panel de cada inmobiliaria. Formato internacional sin + ni espacios. Ej: 5491166037990"
              placeholder="Ej: 5491166037990"
            />
            <EditableSetting
              label="Precio del plan base (ARS)"
              settingKey="BASE_PLAN_PRICE_ARS"
              initialValue={settings.basePrice}
              description="Valor de referencia del plan comercial base. Afecta a los nuevos ciclos y planes comerciales de referencia."
              placeholder="Ej: 65000"
            />
          </section>

          {/* 3. Conexión y Alimentación SaaS */}
          <section className="rounded-2xl sm:rounded-[2.5rem] border border-slate-200 bg-white p-5 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
            <SaaSFeedSection initialFeeds={settings.saasFeeds} />
          </section>

          {/* 4. Administración Delegada */}
          <section className="rounded-2xl sm:rounded-[2.5rem] border border-slate-200 bg-white p-5 sm:p-10 shadow-sm hover:shadow-md transition-shadow">
            <DelegatedAdminSection initial={delegatedAdmins} />
          </section>
        </div>

        {/* Sidebar: Integridad del Sistema */}
        <aside>
          <section className="rounded-2xl sm:rounded-[2.5rem] border border-slate-900/10 bg-slate-950 p-5 sm:p-8 shadow-2xl text-white relative overflow-hidden group lg:sticky top-6">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Loader2 className="h-24 w-24" />
            </div>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-8 border-b border-white/10 pb-4">
              Integridad del Sistema
            </h2>
            <div className="space-y-1">
              <StatusRow
                label="Conexión SaaS"
                value="Conectado"
                ok={true}
              />
              <StatusRow
                label="Estado de Ventas"
                value="Activo"
                ok={true}
              />
              <StatusRow
                label="Mercado Pago"
                value={settings.mpStatus ? "Conectado" : "Desconectado"}
                ok={settings.mpStatus}
              />
              <StatusRow
                label="Motor IA (OpenAI)"
                value={settings.aiStatus ? "Activo" : "Error de API"}
                ok={settings.aiStatus}
              />
            </div>
            
            <Link
              href="/platform/health"
              className="mt-8 flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-xs font-bold text-slate-200 border border-white/10 hover:bg-white/10 transition-all text-center"
            >
              <span>Ver operación del sistema</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>

            <div className="mt-8 rounded-2xl bg-white/5 p-5 border border-white/10">
              <p className="text-[11px] leading-relaxed text-slate-400">
                <span className="text-white font-bold">Nota operativa:</span> Los cambios se
                persisten en PostgreSQL en tiempo real. Los precios impactan en las renovaciones
                del próximo ciclo.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
