"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TONE_LABELS, TONE_DESCRIPTIONS, PROPERTY_TYPE_LABELS } from "@/modules/agents/types";
import type { AgentDetail } from "@/modules/agents/types";

type Channel = {
  id: string;
  provider?: string | null;
  displayPhoneNumber: string | null;
  verifiedDisplayName: string | null;
  status: string;
};

type ConnectionRequest = {
  id: string;
  requestedPhoneNumber: string;
  businessName: string;
  status: string;
  createdAt: Date;
};

type OrgContact = {
  whatsapp: string | null;
  phone: string | null;
  name: string;
};

export function AgentForm({
  orgSlug,
  action,
  channels,
  connectionRequests = [],
  orgContact,
  agent,
  mode,
}: {
  orgSlug: string;
  action: (formData: FormData) => Promise<void>;
  channels: Channel[];
  connectionRequests?: ConnectionRequest[];
  orgContact?: OrgContact;
  agent?: AgentDetail;
  mode: "create" | "edit";
}) {
  const [tone, setTone] = useState<"FORMAL" | "FRIENDLY" | "NEUTRAL">(
    (agent?.tone as "FORMAL" | "FRIENDLY" | "NEUTRAL") ?? "FRIENDLY",
  );
  const [is24x7, setIs24x7] = useState(agent?.is24x7 ?? true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(agent?.propertyTypes ?? []);

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  const pendingRequests = connectionRequests.filter(r => r.status === "PENDING" || r.status === "IN_REVIEW");

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {mode === "create" ? "Crear agente IA" : `Editar: ${agent?.name}`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "create"
                ? "Configurá el agente que va a atender consultas de WhatsApp automáticamente."
                : "Actualizá la configuración del agente."}
            </p>
          </div>
          <Link
            href={`/${orgSlug}/agents`}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            ← Volver
          </Link>
        </div>
      </div>

      {/* Identidad */}
      <div className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Identidad</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">¿Cómo se llama y cómo se presenta?</h2>
        <div className="mt-5 grid gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="name">
              Nombre del agente <span className="text-rose-500">*</span>
            </label>
            <input id="name" name="name" required defaultValue={agent?.name} placeholder="Ej: Agente Palermo, Bot de Ventas Norte" className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="description">Descripción interna</label>
            <input id="description" name="description" defaultValue={agent?.description ?? ""} placeholder="Ej: Maneja consultas de Palermo, Belgrano y Villa Crespo" className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Tono de comunicación</label>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {(["FORMAL", "FRIENDLY", "NEUTRAL"] as const).map((t) => (
                <label key={t} className={`cursor-pointer rounded-2xl border p-4 transition ${tone === t ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="tone" value={t} checked={tone === t} onChange={() => setTone(t)} className="sr-only" />
                  <p className="text-sm font-semibold text-slate-950">{TONE_LABELS[t]}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{TONE_DESCRIPTIONS[t]}</p>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="persona">Personalidad personalizada <span className="font-normal text-slate-400">(opcional)</span></label>
            <p className="text-xs text-slate-400 mt-0.5">Instrucciones adicionales para el agente.</p>
            <textarea id="persona" name="persona" rows={3} defaultValue={agent?.persona ?? ""} placeholder="Instrucciones extra para el comportamiento del agente..." className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none" />
          </div>
        </div>
      </div>

      {/* Disponibilidad */}
      <div className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Disponibilidad</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">¿Cuándo trabaja el agente?</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-2xl border p-5 transition ${is24x7 ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/20" : "border-slate-200 hover:border-slate-300"}`}>
            <input type="radio" name="is24x7" value="true" checked={is24x7} onChange={() => setIs24x7(true)} className="sr-only" />
            <div className="flex items-center gap-3"><span className="text-2xl">🌙</span><div><p className="font-bold text-slate-950">24/7 — Siempre disponible</p><p className="text-xs text-slate-500 mt-0.5">Responde a cualquier hora.</p></div></div>
          </label>
          <label className={`cursor-pointer rounded-2xl border p-5 transition ${!is24x7 ? "border-brand-400 bg-brand-50 ring-2 ring-brand-400/20" : "border-slate-200 hover:border-slate-300"}`}>
            <input type="radio" name="is24x7" value="false" checked={!is24x7} onChange={() => setIs24x7(false)} className="sr-only" />
            <div className="flex items-center gap-3"><span className="text-2xl">🗓</span><div><p className="font-bold text-slate-950">Solo en horarios configurados</p><p className="text-xs text-slate-500 mt-0.5">Dentro de los horarios de disponibilidad.</p></div></div>
          </label>
        </div>
      </div>

      {/* ── Canal WhatsApp (REWRITTEN) ────────────────────────────── */}
      <div className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Canal</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">Número de WhatsApp asignado</h2>
        <p className="mt-1 text-sm text-slate-500">
          Asigná un número de WhatsApp Business propio de tu inmobiliaria. Podés crear el agente ahora y asignar el número más adelante.
        </p>

        <div className="mt-5 space-y-4">
          {/* Option: no channel */}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 hover:border-amber-300 transition">
            <input type="radio" name="whatsappChannelId" value="" defaultChecked={!agent?.whatsappChannelId} className="mt-0.5 h-4 w-4 accent-brand-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700">Sin número por ahora</p>
              <p className="text-xs text-slate-500 mt-0.5">El agente quedará creado pero <strong>no responderá mensajes de WhatsApp</strong> hasta que le asignes un número.</p>
            </div>
          </label>

          {/* Existing channels */}
          {channels.length > 0 && (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-2">Números propios de tu inmobiliaria</p>
              {channels.map((ch) => (
                <label key={ch.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition">
                  <input type="radio" name="whatsappChannelId" value={ch.id} defaultChecked={agent?.whatsappChannelId === ch.id} className="h-4 w-4 accent-brand-500" />
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white text-sm">📱</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-950">
                      {ch.verifiedDisplayName ??
                        ch.displayPhoneNumber ??
                        (ch.provider === "EVOLUTION_API" ? "WhatsApp conectado por QR" : "Canal de WhatsApp")}
                    </p>
                    <p className="text-xs text-slate-400">
                      {ch.displayPhoneNumber ??
                        (ch.provider === "EVOLUTION_API"
                          ? "Conectado por código QR — listo para asignar"
                          : "Sin número")}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ch.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {ch.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  </span>
                </label>
              ))}
            </>
          )}

          {/* No channels: guidance card */}
          {channels.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <p className="text-sm font-bold text-amber-900">Todavía no tenés números de WhatsApp Business conectados</p>
              <p className="mt-1.5 text-sm leading-6 text-amber-800">
                Podés crear este agente ahora y asignarle un número más adelante. Para que responda mensajes reales, primero necesitás solicitar la conexión de un número de WhatsApp Business.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/${orgSlug}/settings/integrations/whatsapp`} className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition">
                  Solicitar nuevo número →
                </Link>
                {orgContact?.whatsapp && (
                  <Link href={`/${orgSlug}/settings/integrations/whatsapp`} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                    Usar WhatsApp de la inmobiliaria ({orgContact.whatsapp})
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Pending connection requests */}
          {pendingRequests.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
              <p className="text-sm font-bold text-blue-900">Solicitud de conexión en curso</p>
              <p className="mt-1 text-sm leading-6 text-blue-800">
                Hay {pendingRequests.length} solicitud{pendingRequests.length > 1 ? "es" : ""} pendiente{pendingRequests.length > 1 ? "s" : ""}. Podés crear el agente ahora y asignar el número cuando esté conectado.
              </p>
              <div className="mt-3 space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl bg-white border border-blue-100 p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{req.requestedPhoneNumber}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{req.businessName}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      {req.status === "PENDING" ? "Pendiente" : "En revisión"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros de propiedades */}
      <div className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Inventario</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">¿Qué tipo de propiedades maneja?</h2>
        <p className="mt-1 text-sm text-slate-500">Dejá todo vacío para que maneje todo el inventario disponible.</p>
        <div className="mt-5 grid gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700">Zonas / Barrios</label>
            <p className="text-xs text-slate-400 mt-0.5">Separadas por comas.</p>
            <input name="zoneFilters" defaultValue={agent?.zoneFilters.join(", ") ?? ""} placeholder="Todas las zonas" className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700">Tipos de propiedad</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggleType(value)} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${selectedTypes.includes(value) ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                  {label}
                </button>
              ))}
            </div>
            {selectedTypes.map((t) => (<input key={t} type="hidden" name="propertyTypes" value={t} />))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="minBudget">Presupuesto mínimo <span className="font-normal text-slate-400">(opcional)</span></label>
              <input id="minBudget" name="minBudget" type="number" min="0" defaultValue={agent?.minBudget ?? ""} placeholder="Sin mínimo" className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="maxBudget">Presupuesto máximo <span className="font-normal text-slate-400">(opcional)</span></label>
              <input id="maxBudget" name="maxBudget" type="number" min="0" defaultValue={agent?.maxBudget ?? ""} placeholder="Sin máximo" className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Escalado */}
      <div className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Escalado</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">¿Cuándo pasa a un agente humano?</h2>
        <div className="mt-5 grid gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="escalateAfterMessages">Escalar después de <span className="font-normal text-slate-400">(mensajes)</span></label>
            <div className="mt-1.5 flex items-center gap-3">
              <input id="escalateAfterMessages" name="escalateAfterMessages" type="number" min="1" max="20" defaultValue={agent?.escalateAfterMessages ?? 5} className="w-24 rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              <span className="text-sm text-slate-500">intercambios de mensajes</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="escalateOnKeywords">Palabras clave de escalado</label>
            <p className="text-xs text-slate-400 mt-0.5">Separadas por comas.</p>
            <input id="escalateOnKeywords" name="escalateOnKeywords" defaultValue={agent?.escalateOnKeywords.join(", ") ?? ""} placeholder="Ej: hablar con alguien, operador, persona" className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="humanHandoffMessage">Mensaje de traspaso <span className="font-normal text-slate-400">(opcional)</span></label>
            <textarea id="humanHandoffMessage" name="humanHandoffMessage" rows={2} defaultValue={agent?.humanHandoffMessage ?? "Entendido, voy a conectarte con uno de nuestros asesores. Te contactarán muy pronto."} className="mt-1.5 w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-950 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between rounded-[1.75rem] border border-slate-200 bg-white px-6 py-4 shadow-soft">
        <Link href={`/${orgSlug}/agents`} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
          Cancelar
        </Link>
        <Button type="submit" size="sm">
          {mode === "create" ? "Crear agente" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
