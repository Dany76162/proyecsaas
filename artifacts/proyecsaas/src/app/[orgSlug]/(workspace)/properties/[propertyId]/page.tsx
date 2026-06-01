export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ArrowLeft } from "lucide-react";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { MediaManager } from "@/components/properties/media-manager";
import { CatalogSharingActions } from "@/components/properties/catalog-sharing-actions";
import { CoordinatesFields } from "@/components/properties/coordinates-fields";
import { PropertyCharacteristicsSection } from "@/components/properties/property-characteristics-section";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { updatePropertyAction } from "@/modules/properties/actions";
import { getPropertyDetail } from "@/modules/properties/service";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  AVAILABLE: "Disponible",
  RESERVED: "Reservada",
  SOLD: "Vendida",
  RENTED: "Alquilada",
};

const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  INTERESTED: "Interesado",
  VISIT: "En visita",
  CLOSED: "Cerrado",
};

const VISIT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELED: "Cancelada",
};

const OPERATION_TYPE_LABEL: Record<string, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Temporario",
  EMPRENDIMIENTO: "Emprendimiento",
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
    return (
      <div className="mx-auto max-w-lg text-center py-20 px-6 space-y-8 bg-white border border-slate-200/60 rounded-3xl shadow-soft">
        <div className="relative mx-auto w-24 h-24 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-center group transition-transform hover:scale-105 duration-500">
          <Building2 className="h-10 w-10 text-slate-400" />
          <div className="absolute -top-1 -right-1 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
            404
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Propiedad no encontrada</h2>
          <p className="text-slate-500 max-w-sm mx-auto text-[15px] leading-relaxed font-medium">
            La propiedad que estás buscando no existe en este espacio de trabajo o ha sido retirada.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={`/${orgSlug}/properties`}
            className="inline-flex items-center gap-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition h-12 px-6 shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Propiedades
          </Link>
        </div>
      </div>
    );
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
          <div className="flex flex-wrap items-center gap-3">
            <CatalogSharingActions orgSlug={orgSlug} orgName={organization.name} />
            {property.publicVisible && (
              <Link
                href={`/map/${property.id}`}
                className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Ver publicación
              </Link>
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
      <section className="grid gap-6 md:grid-cols-4">
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
              <label className={labelClass}>Tipo de operación</label>
              <select name="operationType" defaultValue={property.operationType ?? ""} className={inputClass}>
                <option value="">Sin especificar</option>
                <option value="RENT">Alquiler</option>
                <option value="SALE">Venta</option>
                <option value="TEMPORARY">Temporario</option>
                <option value="EMPRENDIMIENTO">Emprendimiento</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Tipo de propiedad</label>
              <select id="property-type-select" name="propertyType" defaultValue={property.propertyType ?? ""} className={inputClass}>
                <option value="">Sin especificar</option>
                <option value="Departamento">Departamento</option>
                <option value="Casa">Casa</option>
                <option value="PH">PH</option>
                <option value="Terreno">Terreno</option>
                <option value="Local comercial">Local comercial</option>
                <option value="Campo">Campo</option>
                <option value="Quinta vacacional">Quinta vacacional</option>
                <option value="Oficina comercial">Oficina comercial</option>
                <option value="Garage">Garage</option>
                <option value="Bodega-Galpón">Bodega-Galpón</option>
                <option value="Fondo de comercio">Fondo de comercio</option>
                <option value="Hotel">Hotel</option>
                <option value="Depósito">Depósito</option>
                <option value="Bóveda, nicho o parcela">Bóveda, nicho o parcela</option>
                <option value="Cama náutica">Cama náutica</option>
                <option value="Consultorio">Consultorio</option>
                <option value="Edificio">Edificio</option>
                <option value="Desarrollo horizontal">Desarrollo horizontal</option>
                <option value="Desarrollo vertical">Desarrollo vertical</option>
              </select>
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
                defaultValue={property.priceCents != null ? property.priceCents / 100 : ""}
                className={inputClass}
                placeholder="Ej: 150000"
              />
            </div>

            <div>
              <label className={labelClass}>Moneda</label>
              <select name="currency" defaultValue={property.currency ?? "USD"} className={inputClass}>
                <option value="USD">USD — Dólar</option>
                <option value="ARS">ARS — Peso argentino</option>
                <option value="MXN">MXN — Peso mexicano</option>
                <option value="CLP">CLP — Peso chileno</option>
                <option value="COP">COP — Peso colombiano</option>
                <option value="UYU">UYU — Peso uruguayo</option>
                <option value="PEN">PEN — Sol peruano</option>
                <option value="BOB">BOB — Boliviano</option>
                <option value="PYG">PYG — Guaraní paraguayo</option>
                <option value="DOP">DOP — Peso dominicano</option>
                <option value="BRL">BRL — Real brasileño</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Expensas</label>
              <input
                name="expensesCents"
                type="number"
                min="0"
                defaultValue={property.expensesCents != null ? property.expensesCents / 100 : ""}
                className={inputClass}
                placeholder="Ej: 5000"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 grid gap-4 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50">
                <input
                  name="publicVisible"
                  type="checkbox"
                  defaultChecked={property.publicVisible}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                />
                <div>
                  <span className="font-medium">Publicar esta propiedad</span>
                  <p className="text-xs text-slate-400 mt-0.5">Aparecerá en el catálogo público y mapa.</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50">
                <input
                  name="isFeatured"
                  type="checkbox"
                  defaultChecked={property.isFeatured}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-500"
                />
                <div>
                  <span className="font-medium">Propiedad destacada</span>
                  <p className="text-xs text-slate-400 mt-0.5">Se mostrará prioritariamente en portales.</p>
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
            <div>
              <label className={labelClass}>Provincia</label>
              <input
                name="province"
                defaultValue={property.province ?? ""}
                className={inputClass}
                placeholder="Ej. Buenos Aires"
              />
            </div>
            <div>
              <label className={labelClass}>País</label>
              <input
                name="country"
                defaultValue={property.country ?? "Argentina"}
                className={inputClass}
                placeholder="Ej. Argentina"
              />
            </div>
          </div>
        </SectionCard>

        {/* Sección: Ubicación y privacidad del mapa */}
        <SectionCard
          eyebrow="Mapa"
          title="Ubicación y privacidad del mapa"
          description="Estos datos preparan la propiedad para el futuro mapa público de Raíces Pilot. Si ocultás la ubicación exacta, el portal mostrará una zona aproximada para proteger la operación inmobiliaria."
        >
          <CoordinatesFields
            initialLatitude={property.latitude?.toString() ?? null}
            initialLongitude={property.longitude?.toString() ?? null}
            initialShowExactLocation={property.showExactLocation}
          />
        </SectionCard>

        {/* Sección 3: Características — Client Component reactivo al tipo de propiedad */}
        <SectionCard
          eyebrow="Características"
          title="Distribución y superficie"
          description="Datos para matching automático de leads y filtros de búsqueda."
        >
          <PropertyCharacteristicsSection
            initialPropertyType={property.propertyType ?? ""}
            rooms={property.rooms ?? null}
            bedrooms={property.bedrooms ?? null}
            bathrooms={property.bathrooms ?? null}
            surfaceM2={property.surfaceM2 ?? null}
            coveredSurfaceM2={property.coveredSurfaceM2 ?? null}
            totalSurfaceM2={property.totalSurfaceM2 ?? null}
            parkingSpots={property.parkingSpots ?? null}
            yearBuilt={property.yearBuilt ?? null}
            petsAllowed={property.petsAllowed ?? true}
            professionalApt={property.professionalApt ?? false}
            creditApt={property.creditApt ?? false}
            condition={(property as any).condition ?? null}
            inputClass={inputClass}
            labelClass={labelClass}
          />
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

      {/* Gestor unificado de medios */}
      <MediaManager
        orgSlug={orgSlug}
        propertyId={property.id}
        images={property.images}
        panoramas={property.panoramas}
        floorPlanUrl={property.floorPlanUrl}
      />

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
                    label={LEAD_STATUS_LABEL[lead.status] ?? lead.status}
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
                    <StatusBadge label={VISIT_STATUS_LABEL[visit.status] ?? visit.status} tone={getVisitStatusTone(visit.status)} />
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
