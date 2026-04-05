"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, Save, Loader2 } from "lucide-react";
import { updateGlobalSetting } from "./actions/settings-actions";
import { cn } from "@/lib/utils";

interface SettingItemProps {
  label: string;
  settingKey: string;
  initialValue: string;
  description: string;
  placeholder?: string;
}

function EditableSetting({ label, settingKey, initialValue, description, placeholder }: SettingItemProps) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await updateGlobalSetting(settingKey, value);
      setMessage({ type: "success", text: "Guardado correctamente" });
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar" });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="py-6 border-b border-slate-100 last:border-0 group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-bold text-slate-800 uppercase tracking-tight">{label}</label>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md">{description}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 md:w-64 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
          />
          <button
            onClick={handleSave}
            disabled={isSaving || value === initialValue}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:grayscale",
              message?.type === "success" ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
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
      {message && message.type === "error" && (
        <p className="mt-2 text-[10px] font-bold text-red-500 animate-pulse">{message.text}</p>
      )}
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-800/10 last:border-0">
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

export default function PlatformSettingsUI({ 
  settings 
}: { 
  settings: { waContact: string; basePrice: string; mpStatus: boolean; aiStatus: boolean } 
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-20 px-4 pt-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
           <div className="h-1 w-8 rounded-full bg-indigo-600" />
           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-600">Control Operativo</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">Panel de Configuración</h1>
        <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
           Gestioná los parámetros maestros de Raíces Pilot en tiempo real. Estos valores afectan directamente la facturación, los links de soporte y las comunicaciones oficiales.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Settings Card */}
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-bold text-slate-900">Parámetros Maestros</h2>
               <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" title="Sistema en línea" />
            </div>
            
            <EditableSetting
              label="Número de Soporte"
              settingKey="PLATFORM_WHATSAPP_NUMBER"
              initialValue={settings.waContact}
              description="Es el número donde tus clientes te escribirán por soporte. Usá formato internacional sin símbolos."
              placeholder="Ej: 5493412345678"
            />

            <EditableSetting
              label="Precio Plan Base (ARS)"
              settingKey="BASE_PLAN_PRICE_ARS"
              initialValue={settings.basePrice}
              description="Valor mensual de la suscripción. Cambia este valor para ajustar el precio de los nuevos links de pago."
              placeholder="Ej: 45000"
            />
          </section>
        </div>

        <aside className="space-y-8">
          {/* Integrity and Status Card */}
          <section className="rounded-[2.5rem] border border-slate-900/10 bg-slate-950 p-8 shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
               <Loader2 className="h-24 w-24" />
            </div>

            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-8 border-b border-white/10 pb-4">Integridad del Sistema</h2>
            
            <div className="space-y-1">
               <StatusRow label="Mercado Pago" value={settings.mpStatus ? "Conectado" : "Desconectado"} ok={settings.mpStatus} />
               <StatusRow label="Motor IA (OpenAI)" value={settings.aiStatus ? "Activo" : "Error de API"} ok={settings.aiStatus} />
            </div>

            <div className="mt-12 rounded-2xl bg-white/5 p-5 border border-white/10 backdrop-blur-sm">
               <p className="text-[11px] leading-relaxed text-slate-400">
                 <span className="text-white font-bold">Nota operativa:</span> Cualquier cambio guardado se persiste en PostgreSQL. Los precios impactan en las renovaciones automáticas del próximo ciclo.
               </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
