import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getLeadSummary, listOrganizationLeads } from "@/modules/leads/service";
import {
  getOrganizationWorkspace,
  listWorkspaceNotifications,
} from "@/modules/organizations/service";
import { getPropertySummary, listOrganizationProperties } from "@/modules/properties/service";
import { getUserRoleBreakdown, listOrganizationUsers } from "@/modules/users/service";
import { getVisitSummary, listOrganizationVisits } from "@/modules/visits/service";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function OrganizationHomePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [
    organization,
    leads,
    leadSummary,
    properties,
    propertySummary,
    users,
    roleBreakdown,
    visits,
    visitSummary,
    notifications,
  ] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationLeads(orgSlug),
    getLeadSummary(orgSlug),
    listOrganizationProperties(orgSlug),
    getPropertySummary(orgSlug),
    listOrganizationUsers(orgSlug),
    getUserRoleBreakdown(orgSlug),
    listOrganizationVisits(orgSlug),
    getVisitSummary(orgSlug),
    listWorkspaceNotifications(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active leads"
          value={String(organization.activeLeadCount)}
          hint="Live prospects currently being worked by the commercial team."
        />
        <MetricCard
          label="Portfolio"
          value={String(organization.propertyCount)}
          hint={`${organization.availablePropertyCount} properties are immediately available.`}
        />
        <MetricCard
          label="Public listings"
          value={String(organization.publicPropertyCount)}
          hint="Ready to feed the future public map and listing pages."
        />
        <MetricCard
          label="Team members"
          value={String(organization.memberCount)}
          hint="Visible role ownership for the tenant workspace."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <SectionCard
          eyebrow="CRM pulse"
          title="Lead pipeline snapshot"
          description="A lean first look at lead ownership and stage distribution."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total leads</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{leadSummary.total}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">New this cycle</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{leadSummary.newCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Interested</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {leadSummary.interestedCount}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {leads.slice(0, 3).map((lead) => (
              <div
                key={lead.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-950">{lead.fullName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {lead.interestLabel} / {lead.ownerName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={lead.status.replaceAll("_", " ")}
                    tone={
                      lead.status === "VISIT"
                        ? "warning"
                        : lead.status === "CLOSED"
                          ? "success"
                          : "info"
                    }
                  />
                  <span className="text-sm text-slate-500">{lead.propertyTitle}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Workspace team"
          title="Roles and ownership"
          description="Users are already represented as organization-scoped members with explicit roles."
        >
          <div className="space-y-3">
            {roleBreakdown.map((item) => (
              <div
                key={item.role}
                className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
              >
                <p className="font-medium text-slate-700">{item.role}</p>
                <p className="text-lg font-semibold text-slate-950">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4">
            <p className="text-sm font-medium text-slate-700">Current member list</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {users.map((user) => user.fullName).join(", ")}.
            </p>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Portfolio pulse"
        title="Property readiness"
        description="Inventory is already separated from public visibility so publishing can remain deliberate."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Available now</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {propertySummary.availableCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Public-ready</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {propertySummary.publicCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Average ticket</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {formatCurrency(propertySummary.averageTicketCents, properties[0]?.currency ?? "USD")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {properties.slice(0, 2).map((property) => (
            <div key={property.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-950">{property.title}</p>
                <StatusBadge
                  label={property.publicVisible ? "Public" : "Private"}
                  tone={property.publicVisible ? "success" : "neutral"}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {property.neighborhood}, {property.city}
              </p>
              <p className="mt-4 text-sm text-slate-600">
                {property.bedrooms} bed / {property.bathrooms} bath / {property.surfaceM2} m2
              </p>
              <p className="mt-4 text-lg font-semibold text-slate-950">
                {formatCurrency(property.priceCents, property.currency)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Visit pipeline"
        title="Upcoming visits"
        description="Visits now connect the selected property and active lead in a single operational flow."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Scheduled</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{visitSummary.total}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {visitSummary.pendingCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Confirmed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {visitSummary.confirmedCount}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {visits.slice(0, 3).map((visit) => (
            <div
              key={visit.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-950">{visit.leadName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {visit.propertyTitle} / {visit.ownerName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  label={visit.status}
                  tone={visit.status === "CONFIRMED" ? "success" : "warning"}
                />
                <span className="text-sm text-slate-500">{formatDate(visit.scheduledAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Notifications"
        title="Recent internal events"
        description="Visit creation now lands in a lightweight workspace event feed so future automations have a reliable handoff surface."
      >
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-950">{notification.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
              </div>
              <div className="text-sm text-slate-500">{formatDateTime(notification.createdAt)}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
