import Link from "next/link";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getPropertyDetail } from "@/modules/properties/service";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; propertyId: string }>;
}) {
  const { orgSlug, propertyId } = await params;
  const [organization, property] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    getPropertyDetail(orgSlug, propertyId),
  ]);

  if (!organization || !property) {
    notFound();
  }

  return (
    <>
      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge label={property.status} tone={property.status === "AVAILABLE" ? "success" : "warning"} />
              <StatusBadge label={property.publicVisible ? "Public listing" : "Internal only"} tone={property.publicVisible ? "info" : "neutral"} />
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {property.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {property.address}, {property.neighborhood}, {property.city}
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
        <MetricCard label="Price" value={formatCurrency(property.priceCents, property.currency)} hint="Current asking price." />
        <MetricCard label="Type" value={property.propertyType} hint="Commercial classification." />
        <MetricCard label="Layout" value={`${property.bedrooms} / ${property.bathrooms}`} hint="Bedrooms and bathrooms." />
        <MetricCard label="Surface" value={`${property.surfaceM2} m2`} hint="Useful for matching and map presentation." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
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
                      tone={visit.status === "CONFIRMED" ? "success" : "warning"}
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
