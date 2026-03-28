import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { updatePropertyAction } from "@/modules/properties/actions";
import { getPropertyDetail } from "@/modules/properties/service";
import { formatCurrency, formatDate } from "@/lib/utils";

function getPropertyStatusTone(status: string) {
  if (status === "AVAILABLE") {
    return "success" as const;
  }

  if (status === "DRAFT") {
    return "neutral" as const;
  }

  return "warning" as const;
}

function getVisitStatusTone(status: string) {
  if (status === "CONFIRMED" || status === "COMPLETED") {
    return "success" as const;
  }

  if (status === "CANCELED") {
    return "neutral" as const;
  }

  return "warning" as const;
}

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
    success === "property-updated" ? "Property updated successfully." : null;
  const errorMessage =
    error === "invalid-property"
      ? "Property data is invalid. Review the fields and try again."
      : error === "property-not-found"
        ? "That property no longer exists in this workspace."
        : null;

  return (
    <>
      {successMessage ? (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-soft">
          {successMessage}
        </section>
      ) : null}
      {errorMessage ? (
        <section className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800 shadow-soft">
          {errorMessage}
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge label={property.status} tone={getPropertyStatusTone(property.status)} />
              <StatusBadge label={property.publicVisible ? "Public listing" : "Internal only"} tone={property.publicVisible ? "info" : "neutral"} />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {property.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {[property.address, property.neighborhood, property.city].filter(Boolean).join(", ") || "Location details pending"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/map/${property.id}`}
              className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Open public listing
            </Link>
            <Link
              href={`/${orgSlug}/leads`}
              className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Review linked leads
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Price" value={property.priceCents != null ? formatCurrency(property.priceCents, property.currency ?? "USD") : "Price on request"} hint="Current asking price." />
        <MetricCard label="Type" value={property.propertyType || "Property"} hint="Commercial classification." />
        <MetricCard label="Layout" value={`${property.bedrooms ?? 0} / ${property.bathrooms ?? 0}`} hint="Bedrooms and bathrooms." />
        <MetricCard label="Surface" value={`${property.surfaceM2 ?? 0} m2`} hint="Useful for matching and map presentation." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          eyebrow="Edit"
          title="Property details"
          description="Keep the inventory current without leaving the workspace or touching the database."
        >
          <form action={updatePropertyAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <input type="hidden" name="propertyId" value={property.id} />

            <label className="space-y-2 text-sm text-slate-600">
              <span>Title</span>
              <input
                name="title"
                required
                defaultValue={property.title}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Property type</span>
              <input
                name="propertyType"
                defaultValue={property.propertyType ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
                placeholder="Apartment, house, lot..."
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span>Address</span>
              <input
                name="address"
                defaultValue={property.address ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>City</span>
              <input
                name="city"
                defaultValue={property.city ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Neighborhood</span>
              <input
                name="neighborhood"
                defaultValue={property.neighborhood ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Price (cents)</span>
              <input
                name="priceCents"
                type="number"
                min="0"
                defaultValue={property.priceCents ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Currency</span>
              <input
                name="currency"
                defaultValue={property.currency ?? "USD"}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Bedrooms</span>
              <input
                name="bedrooms"
                type="number"
                min="0"
                defaultValue={property.bedrooms ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Bathrooms</span>
              <input
                name="bathrooms"
                type="number"
                min="0"
                defaultValue={property.bathrooms ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Surface (m2)</span>
              <input
                name="surfaceM2"
                type="number"
                min="0"
                defaultValue={property.surfaceM2 ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span>Status</span>
              <select
                name="status"
                defaultValue={property.status}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="RESERVED">RESERVED</option>
                <option value="SOLD">SOLD</option>
                <option value="RENTED">RENTED</option>
              </select>
            </label>

            <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                name="publicVisible"
                type="checkbox"
                defaultChecked={property.publicVisible}
                className="h-4 w-4 rounded border-slate-300"
              />
              <span>Expose this property on the public map/listing surfaces</span>
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Save property
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Interest"
          title="Linked leads"
          description="This is where the property turns into CRM opportunity."
        >
          <div className="space-y-4">
            {property.interestedLeads.length ? (
              property.interestedLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <Link href={`/${orgSlug}/leads/${lead.id}`} className="font-semibold text-slate-950 hover:text-brand-600">
                      {lead.fullName}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">{lead.ownerName}</p>
                  </div>
                  <StatusBadge label={lead.status} tone={lead.status === "VISIT" ? "warning" : lead.status === "CLOSED" ? "success" : "info"} />
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No leads linked to this property yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Visits"
          title="Visit schedule"
          description="Simple scheduling view without overbuilding a calendar system."
        >
          <div className="space-y-4">
            {property.visits.length ? (
              property.visits.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{visit.leadName}</p>
                    <StatusBadge
                      label={visit.status}
                      tone={getVisitStatusTone(visit.status)}
                    />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{formatDate(visit.scheduledAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No visits scheduled yet.</p>
            )}
          </div>
        </SectionCard>
      </section>
    </>
  );
}
