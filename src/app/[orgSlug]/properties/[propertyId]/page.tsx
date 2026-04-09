import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { PropertyImageGallery } from "@/components/properties/property-image-gallery";
import { PropertyVideoUpload } from "@/components/properties/property-video-upload";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { updatePropertyAction } from "@/modules/properties/actions";
import { getPropertyDetail } from "@/modules/properties/service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SharePropertyButton } from "@/components/workspace/share-property-button";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  AVAILABLE: "Disponible",
  RESERVED: "Reservada",
  SOLD: "Vendida",
  RENTED: "Alquilada",
};

const OPERATION_TYPE_LABEL: Record<string, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Alquiler temporario",
};

function getPropertyStatusTone(status: string) {
  if (status === "AVAILABLE") return "success" as const;
  if (status === "DRAFT") return "neutral" as const;
  return "warning" as const;
}

function getVisitStatusTone(status: string) {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success" as const;
  if (status === "CANCELED") return "neutral" as const;
  return "warning" as const;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; propertyId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { orgSlug, propertyId } = await params;
  const { success, error } = await searchParams;
  const [organization, property] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getPropertyDetail(orgSlug, propertyId),
  ]);

  if (!organization || !property) {
    notFound();
  }

  const successMessage =
    success === "property-created"
      ? "Propiedad creada. Completá ahora la ficha avanzada con descripción, características, fotos y más."
      : success === "property-updated"
        ? "Propiedad actualizada correctamente."
        : null;
  const errorMessage =
    error === "invalid-property"
      ? "Los datos son inválidos. Revisá los campos e intentá de nuevo."
      : error === "property-not-found"
        ? "Esta propiedad ya no existe en el workspace."
        : null;

  const operationLabel = property.operationType
    ? (OPERATION_TYPE_LABEL[property.operationType] ?? property.operationType)
    : null;

  return (
    <>
      {successMessage && (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
          {successMessage}
        </section>
      )}
      {errorMessage && (
        <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
          {errorMessage}
        </section>
      )}

      {/* Header */}
      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={STATUS_LABEL[property.status] ?? property.status}
                tone={getPropertyStatusTone(property.status)}
              />
              <StatusBadge
                label={property.publicVisible ? "Publicada" : "Solo interna"}
                tone={property.publicVisible ? "info" : "neutral"}
              />
              {operationLabel && (
                <StatusBadge label={operationLabel} tone="info" />
              )}
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {property.title}
            </h1>
            <p className="mt-2 text-base text-slate-500">
              {[property.address, property.neighborhood, property.city].filter(Boolean).join(", ") || "Ubicación pendiente"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {property.publicVisible && (
              <>
                <SharePropertyButton orgSlug={orgSlug} propertyId={property.id} />
                <Link
                  href={`/catalogo/${orgSlug}/${property.id}`}
                  className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Ver publicación
                </Link>
              </>
            )}
            <Link
              href={`/${orgSlug}/leads`}
              className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Ver leads vinculados
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics row */}
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Precio"
          value={property.priceCents != null ? formatCurrency(property.priceCents, property.currency ?? "USD") : "A consultar"}
          hint="Precio de venta o alquiler actual."
        />
        <MetricCard
          label="Tipo"
          value={property.propertyType || "Propiedad"}
          hint="Clasificación comercial."
        />
        <MetricCard
          label="Amb / Dorm / Ba"
          value={`${property.rooms ?? "–"} / ${property.bedrooms ?? "–"} / ${property.bathrooms ?? "–"}`}
          hint="Ambientes, dormitorios y baños."
        />
        <MetricCard
          label="Superficie"
          value={property.surfaceM2 ? `${property.surfaceM2} m²` : "–"}
          hint="Superficie cubierta."
        />
      </section>

      {/* Edit form — all in one submit */}
      <form action={updatePropertyAction} className="space-y-6">
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="propertyId" value={property.id} />

        {/* Sección 1: Datos comerciales */}
        <SectionCard
          eyebrow="Datos comerciales"
          title="Precio, tipo y estado"
          description="Clasificación principal de la propiedad para el CRM y la publicación."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <label className={labelClass}>Título / Nombre comercial</label>
              <input
                required
                name="title"
                defaultValue={property.title}
                className={inputClass}
                placeholder="Ej. Departamento luminoso en Palermo"
              />
            </div>

            <div>
              <label className={labelClass}>Operación</label>
              <select name="operationType" defaultValue={property.operationType ?? ""} className={inputClass}>
                <option value="">Sin especificar</option>
                <option value="SALE">Venta</option>
                <option value="RENT">Alquiler</option>
                <option value="TEMPORARY">Alquiler temporario</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Tipo de propiedad</label>
              <input
                name="propertyType"
                defaultValue={property.propertyType ?? ""}
                className={inputClass}
                placeholder="Departamento, casa, terreno…"
              />
            </div>

            <div>
              <label className={labelClass}>Estado comercial</label>
              <select name="status" defaultValue={property.status} className={inputClass}>
                <option value="DRAFT">Borrador</option>
                <option value="AVAILABLE">Disponible</option>
                <option value="RESERVED">Reservada</option>
                <option value="SOLD">Vendida</option>
                <option value="RENTED">Alquilada</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Precio</label>
              <input
                name="priceCents"
                type="number"
                min="0"
                defaultValue={property.priceCents ?? ""}
                className={inputClass}
                placeholder="En centavos (ej. 15000000)"
              />
            </div>

            <div>
              <label className={labelClass}>Moneda</label>
              <select name="currency" defaultValue={property.currency ?? "USD"} className={inputClass}>
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Expensas (centavos)</label>
              <input
                name="expensesCents"
                type="number"
                min="0"
                defaultValue={property.expensesCents ?? ""}
                className={inputClass}
                placeholder="Ej. 5000000"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50">
                <input
                  name="publicVisible"
                  type="checkbox"
                  defaultChecked={property.publicVisible}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                />
                <div>
                  <span className="font-medium">Publicar esta propiedad</span>
                  <p className="text-xs text-slate-400 mt-0.5">Aparecerá en el mapa público y portales externos.</p>
                </div>
              </label>
            </div>
          </div>
        </SectionCard>

        {/* Sección 2: Ubicación */}
        <SectionCard
          eyebrow="Ubicación"
          title="Dirección y zona"
          description="Datos de ubicación para matching de leads y publicación."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Dirección</label>
              <input
                name="address"
                defaultValue={property.address ?? ""}
                className={inputClass}
                placeholder="Ej. Av. Santa Fe 1234, piso 3"
              />
            </div>
            <div>
              <label className={labelClass}>Barrio / Zona</label>
              <input
                name="neighborhood"
                defaultValue={property.neighborhood ?? ""}
                className={inputClass}
                placeholder="Ej. Palermo"
              />
            </div>
            <div>
              <label className={labelClass}>Ciudad</label>
              <input
                name="city"
                defaultValue={property.city ?? ""}
                className={inputClass}
                placeholder="Ej. Buenos Aires"
              />
            </div>
          </div>
        </SectionCard>

        {/* Sección 3: Características */}
        <SectionCard
          eyebrow="Características"
          title="Distribución y superficie"
          description="Datos para matching automático de leads y filtros de búsqueda."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Ambientes</label>
              <input
                name="rooms"
                type="number"
                min="0"
                defaultValue={property.rooms ?? ""}
                className={inputClass}
                placeholder="Ej. 3"
              />
            </div>
            <div>
              <label className={labelClass}>Dormitorios</label>
              <input
                name="bedrooms"
                type="number"
                min="0"
                defaultValue={property.bedrooms ?? ""}
                className={inputClass}
                placeholder="Ej. 2"
              />
            </div>
            <div>
              <label className={labelClass}>Baños</label>
              <input
                name="bathrooms"
                type="number"
                min="0"
                defaultValue={property.bathrooms ?? ""}
                className={inputClass}
                placeholder="Ej. 1"
              />
            </div>
            <div>
              <label className={labelClass}>Superficie (m²)</label>
              <input
                name="surfaceM2"
                type="number"
                min="0"
                defaultValue={property.surfaceM2 ?? ""}
                className={inputClass}
                placeholder="Ej. 65"
              />
            </div>
            <div>
              <label className={labelClass}>Cocheras</label>
              <input
                name="parkingSpots"
                type="number"
                min="0"
                defaultValue={property.parkingSpots ?? ""}
                className={inputClass}
                placeholder="Ej. 1"
              />
            </div>
          </div>
        </SectionCard>

        {/* Sección 4: Descripción y multimedia */}
        <SectionCard
          eyebrow="Descripción"
          title="Texto y multimedia"
          description="Descripción comercial, amenities y links externos."
        >
          <div className="grid gap-4">
            <div>
              <label className={labelClass}>Descripción larga</label>
              <textarea
                name="description"
                rows={5}
                defaultValue={property.description ?? ""}
                className={`${inputClass} resize-none`}
                placeholder="Describí la propiedad en detalle: características, estado, orientación, entorno…"
              />
            </div>
            <div>
              <label className={labelClass}>Amenities / Características destacadas</label>
              <input
                name="amenities"
                defaultValue={property.amenities ?? ""}
                className={inputClass}
                placeholder="Ej. Parrilla, Piscina, Seguridad 24hs, Gimnasio"
              />
              <p className="mt-1.5 text-xs text-slate-400">Separados por coma.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Link externo (portal)</label>
                <input
                  name="externalLink"
                  type="url"
                  defaultValue={property.externalLink ?? ""}
                  className={inputClass}
                  placeholder="https://zonaprop.com.ar/..."
                />
              </div>
              <div>
                <label className={labelClass}>Video / Tour virtual</label>
                <input
                  name="videoUrl"
                  type="url"
                  defaultValue={property.videoUrl ?? ""}
                  className={inputClass}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Submit button — bottom of form */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
          >
            Guardar propiedad
          </button>
        </div>
      </form>

      {/* Sección 5: Galería (client component — fuera del form) */}
      <SectionCard
        eyebrow="Galería"
        title="Imágenes"
        description="Subí fotos desde tu PC o celular, pegá URLs, o usá links de Google Drive. La primera imagen se marca como principal."
      >
        <PropertyImageGallery
          orgSlug={orgSlug}
          propertyId={property.id}
          images={property.images}
        />
      </SectionCard>

      {/* Video — upload directo o enlace externo */}
      <SectionCard
        eyebrow="Video"
        title="Tour virtual / Video"
        description="Subí un video desde tu PC o celular (MP4, MOV, WebM · máx. 128 MB). Para videos más pesados, pegá el link en el campo 'Video / Tour virtual' de la sección Descripción."
      >
        <PropertyVideoUpload
          orgSlug={orgSlug}
          propertyId={property.id}
          videoUrl={property.videoUrl}
        />
      </SectionCard>

      {/* CRM sections */}
      <section className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          eyebrow="Interesados"
          title="Leads vinculados"
          description="Contactos interesados en esta propiedad."
        >
          <div className="space-y-3">
            {property.interestedLeads.length ? (
              property.interestedLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <Link
                      href={`/${orgSlug}/leads/${lead.id}`}
                      className="font-semibold text-slate-950 hover:text-brand-600"
                    >
                      {lead.fullName}
                    </Link>
                    <p className="mt-0.5 text-sm text-slate-500">{lead.ownerName}</p>
                  </div>
                  <StatusBadge
                    label={lead.status}
                    tone={
                      lead.status === "VISIT"
                        ? "warning"
                        : lead.status === "CLOSED"
                          ? "success"
                          : "info"
                    }
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Sin leads vinculados todavía.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Visitas"
          title="Agenda de visitas"
          description="Visitas coordinadas para esta propiedad."
        >
          <div className="space-y-3">
            {property.visits.length ? (
              property.visits.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{visit.leadName}</p>
                    <StatusBadge label={visit.status} tone={getVisitStatusTone(visit.status)} />
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">{formatDate(visit.scheduledAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Sin visitas agendadas todavía.</p>
            )}
          </div>
        </SectionCard>
      </section>
    </>
  );
}
