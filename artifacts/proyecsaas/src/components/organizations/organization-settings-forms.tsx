"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateOrganizationProfileAction,
  updatePropertySourceAction,
} from "@/modules/organizations/actions";

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-2xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 bg-white";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{children}</p>
  );
}

function SaveFeedback({ error, saved }: { error: string; saved: boolean }) {
  if (error)
    return (
      <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  if (saved)
    return (
      <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Cambios guardados correctamente.
      </p>
    );
  return null;
}

// ─── OrganizationProfileForm ─────────────────────────────────────────────────

export type OrgContactInitial = {
  name: string;
  city: string | null;
  marketFocus: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  website: string | null;
  businessHours: string | null;
};

export function OrganizationProfileForm({
  orgSlug,
  initial,
}: {
  orgSlug: string;
  initial: OrgContactInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city ?? "");
  const [marketFocus, setMarketFocus] = useState(initial.marketFocus ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initial.contactPhone ?? "");
  const [contactWhatsapp, setContactWhatsapp] = useState(initial.contactWhatsapp ?? "");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [businessHours, setBusinessHours] = useState(initial.businessHours ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await updateOrganizationProfileAction(orgSlug, {
        name,
        city,
        marketFocus,
        description,
        contactEmail,
        contactPhone,
        contactWhatsapp,
        website,
        businessHours,
      });
      if (res.success) {
        setSaved(true);
        setTimeout(() => router.refresh(), 0);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Perfil básico */}
      <div>
        <GroupLabel>Perfil básico</GroupLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre comercial" required>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className={inputCls}
              placeholder="Inmobiliaria del Valle"
            />
          </Field>
          <Field label="Ciudad / zona">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={120}
              className={inputCls}
              placeholder="Buenos Aires, Palermo"
            />
          </Field>
          <Field label="Enfoque de mercado">
            <input
              value={marketFocus}
              onChange={(e) => setMarketFocus(e.target.value)}
              maxLength={160}
              className={inputCls}
              placeholder="Ej: Alquileres residenciales, CABA norte"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descripción breve">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Resumen operativo de la inmobiliaria (aparece en perfiles internos)"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div>
        <GroupLabel>Contacto</GroupLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Email principal">
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              maxLength={200}
              className={inputCls}
              placeholder="contacto@inmobiliaria.com"
            />
          </Field>
          <Field label="Teléfono">
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              maxLength={50}
              className={inputCls}
              placeholder="+54 11 4xxx-xxxx"
            />
          </Field>
          <Field label="WhatsApp">
            <input
              type="tel"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              maxLength={50}
              className={inputCls}
              placeholder="+54 9 11 xxxx-xxxx"
            />
          </Field>
          <Field label="Sitio web">
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={300}
              className={inputCls}
              placeholder="https://www.inmobiliaria.com"
            />
          </Field>
        </div>
      </div>

      {/* Operación */}
      <div>
        <GroupLabel>Operación</GroupLabel>
        <Field label="Horario de atención">
          <input
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
            maxLength={200}
            className={inputCls}
            placeholder="Ej: Lun–Vie 9–18 h, Sáb 9–13 h"
          />
        </Field>
      </div>

      <SaveFeedback error={error} saved={saved} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

// ─── PropertySourceForm ───────────────────────────────────────────────────────

export type PropertySourceInitial = {
  propertySourceUrl: string | null;
  propertySourceType: string | null;
  propertySourceStatus: string;
  propertySourceSyncedAt: string | null;
};

const SOURCE_STATUS_UI: Record<string, { label: string; cls: string }> = {
  IDLE: { label: "Sin sincronizar", cls: "bg-slate-100 text-slate-500" },
  SYNCING: { label: "Sincronizando...", cls: "bg-amber-50 text-amber-700" },
  OK: { label: "Sincronizado", cls: "bg-emerald-50 text-emerald-700" },
  ERROR: { label: "Error en sync", cls: "bg-red-50 text-red-700" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PropertySourceForm({
  orgSlug,
  initial,
}: {
  orgSlug: string;
  initial: PropertySourceInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const [url, setUrl] = useState(initial.propertySourceUrl ?? "");
  const [type, setType] = useState(initial.propertySourceType ?? "website");

  const handleSync = async () => {
    setSyncResult(null);
    setIsSyncing(true);
    try {
      const res = await fetch("/api/properties/sync-from-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult({ success: true, message: data.message });
        router.refresh();
      } else {
        setSyncResult({ success: false, message: data.error ?? "Error al sincronizar" });
      }
    } catch {
      setSyncResult({ success: false, message: "Error de conexión al sincronizar" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await updatePropertySourceAction(orgSlug, {
        propertySourceUrl: url,
        propertySourceType: type,
      });
      if (res.success) {
        setSaved(true);
        setTimeout(() => router.refresh(), 0);
      } else {
        setError(res.message);
      }
    });
  };

  const statusUi = SOURCE_STATUS_UI[initial.propertySourceStatus] ?? SOURCE_STATUS_UI["IDLE"];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="URL del listado de propiedades">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={500}
              className={inputCls}
              placeholder="https://www.inmobiliaria.com/propiedades"
            />
          </Field>
        </div>
        <Field label="Tipo de fuente">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputCls}
          >
            <option value="website">Sitio web</option>
            <option value="sitemap">Sitemap XML</option>
            <option value="listing">Listado directo</option>
          </select>
        </Field>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-slate-700">Estado</p>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusUi.cls}`}>
              {statusUi.label}
            </span>
            <span className="text-xs text-slate-400">
              Último sync: {formatDate(initial.propertySourceSyncedAt)}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Guardá la URL y luego hacé click en &quot;Sincronizar ahora&quot; para importar las propiedades automáticamente. El sistema usará IA para leer el sitio y extraer los datos.
      </p>

      {syncResult && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${
          syncResult.success
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-800"
        }`}>
          {syncResult.message}
        </div>
      )}

      <SaveFeedback error={error} saved={saved} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing || !url}
          className="rounded-2xl border border-brand-100 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSyncing ? "Sincronizando con IA..." : "↺ Sincronizar ahora"}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar fuente"}
        </button>
      </div>
    </form>
  );
}
