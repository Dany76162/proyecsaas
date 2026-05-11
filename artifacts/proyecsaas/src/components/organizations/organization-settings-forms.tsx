"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateOrganizationProfileAction,
  updatePropertySourceAction,
} from "@/modules/organizations/actions";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/workspace/status-badge";
import { cn } from "@/lib/utils";

// ─── Shared UI helpers ────────────────────────────────────────────────────────

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
      <label className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {label}
        {required && <span className="ml-1 text-brand-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-900 border-l-2 border-brand-500 pl-3">
      {children}
    </p>
  );
}

function SaveFeedback({ error, saved }: { error: string; saved: boolean }) {
  if (error)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  if (saved)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Configuración actualizada con éxito.
      </div>
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
        <GroupLabel>Identidad Corporativa</GroupLabel>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Nombre de la inmobiliaria" required>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Ej. Raices Inmobiliaria"
            />
          </Field>
          <Field label="Zona de operación">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={120}
              placeholder="Ej. Buenos Aires, Palermo"
            />
          </Field>
          <Field label="Enfoque comercial">
            <Input
              value={marketFocus}
              onChange={(e) => setMarketFocus(e.target.value)}
              maxLength={160}
              placeholder="Ej: Residencial, Inversiones"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descripción de marca">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Breve resumen para perfiles internos y buscadores."
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div>
        <GroupLabel>Información de Contacto</GroupLabel>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Email institucional">
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              maxLength={200}
              placeholder="contacto@empresa.com"
            />
          </Field>
          <Field label="Teléfono de oficina">
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              maxLength={50}
              placeholder="+54 11 ..."
            />
          </Field>
          <Field label="WhatsApp de ventas">
            <Input
              type="tel"
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              maxLength={50}
              placeholder="+54 9 11 ..."
            />
          </Field>
          <Field label="Sitio web oficial">
            <Input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={300}
              placeholder="https://www.tuweb.com"
            />
          </Field>
        </div>
      </div>

      {/* Operación */}
      <div>
        <GroupLabel>Atención al Cliente</GroupLabel>
        <Field label="Horarios de atención">
          <Input
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
            maxLength={200}
            placeholder="Ej: Lun–Vie 9–18 h"
          />
        </Field>
      </div>

      <SaveFeedback error={error} saved={saved} />

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          variant="primary"
          className="min-w-[180px]"
        >
          {isPending ? "Guardando..." : "Actualizar perfil"}
        </Button>
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
  /** Website URL from the org profile — used as pre-fill when no source URL is set yet */
  websiteFallback: string | null;
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

  // Pre-fill from the org website if no source URL has been configured yet
  const [url, setUrl] = useState(
    initial.propertySourceUrl ?? initial.websiteFallback ?? ""
  );
  const [type, setType] = useState(initial.propertySourceType ?? "website");

  const handleSync = async () => {
    if (!url.trim()) return;
    setSyncResult(null);
    setError("");
    setIsSyncing(true);
    try {
      // Auto-save the URL before syncing so the API can read it from DB.
      // This removes the two-step "save first, then sync" trap.
      const saveRes = await updatePropertySourceAction(orgSlug, {
        propertySourceUrl: url.trim(),
        propertySourceType: type,
      });
      if (!saveRes.success) {
        setSyncResult({ success: false, message: saveRes.message });
        setIsSyncing(false);
        return;
      }

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
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="URL del listado de propiedades">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              maxLength={500}
              placeholder="https://www.tusitio.com/propiedades"
            />
          </Field>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Pega la URL donde se encuentra el catálogo público. La IA de RaicesPilot escaneará esta página para mantener tu inventario sincronizado.
          </p>
        </div>
        <Field label="Tipo de conector">
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="website">Exploración Web (IA)</option>
            <option value="sitemap">Sitemap XML</option>
            <option value="listing">Listado directo</option>
          </Select>
        </Field>
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Estado de sincronización</p>
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2">
            <StatusBadge label={statusUi.label} tone={
              initial.propertySourceStatus === "OK" ? "success" : 
              initial.propertySourceStatus === "ERROR" ? "danger" : 
              initial.propertySourceStatus === "SYNCING" ? "warning" : "neutral"
            } dot />
            <span className="text-[10px] font-bold text-slate-400 uppercase tabular-nums">
              Último: {formatDate(initial.propertySourceSyncedAt)}
            </span>
          </div>
        </div>
      </div>

      {syncResult && (
        <div className={cn(
          "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
          syncResult.success
            ? "border-emerald-100 bg-emerald-50 text-emerald-800"
            : "border-red-100 bg-red-50 text-red-800"
        )}>
          {syncResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {syncResult.message}
        </div>
      )}

      <SaveFeedback error={error} saved={saved} />

      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button
          type="button"
          onClick={handleSync}
          disabled={isSyncing || !url.trim()}
          variant="secondary"
          className="text-xs font-bold uppercase tracking-widest"
        >
          {isSyncing ? "Sincronizando..." : "Sincronizar ahora"}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          variant="primary"
          className="min-w-[160px]"
        >
          {isPending ? "Guardando..." : "Guardar conector"}
        </Button>
      </div>
    </div>
  );
}
