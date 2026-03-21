import "server-only";

import {
  MembershipRole,
  PropertyStatus,
  VisitStatus,
} from "@prisma/client";
import type { LeadStage } from "@/modules/leads/types";

type DemoOrganization = {
  id: string;
  slug: string;
  name: string;
  city: string;
  planLabel: string;
  marketFocus: string;
  description: string;
};

type DemoUser = {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  isActive: boolean;
};

type DemoMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
};

type DemoLead = {
  id: string;
  organizationId: string;
  ownerId: string;
  propertyId?: string;
  fullName: string;
  email: string;
  phone: string;
  status: LeadStage;
  source: string;
  notes: string;
  interestLabel: string;
  lastContactAt: string;
  budgetLabel: string;
};

type DemoLeadActivity = {
  id: string;
  organizationId: string;
  leadId: string;
  title: string;
  description: string;
  happenedAt: string;
};

type DemoProperty = {
  id: string;
  organizationId: string;
  title: string;
  address: string;
  city: string;
  neighborhood: string;
  propertyType: string;
  status: PropertyStatus;
  publicVisible: boolean;
  priceCents: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  surfaceM2: number;
  latitude: number;
  longitude: number;
};

type DemoVisit = {
  id: string;
  organizationId: string;
  propertyId: string;
  leadId: string;
  createdById: string;
  status: VisitStatus;
  scheduledAt: string;
  notes: string;
};

type DemoWorkspaceState = {
  organizations: DemoOrganization[];
  users: DemoUser[];
  memberships: DemoMembership[];
  properties: DemoProperty[];
  leads: DemoLead[];
  leadActivities: DemoLeadActivity[];
  visits: DemoVisit[];
};

declare global {
  var demoWorkspaceState: DemoWorkspaceState | undefined;
}

const initialOrganizations: DemoOrganization[] = [
  {
    id: "org_north",
    slug: "north-hill",
    name: "North Hill Realty",
    city: "Buenos Aires",
    planLabel: "Growth",
    marketFocus: "Residential sales and investor opportunities",
    description: "Internal workspace for brokers, lead qualification, and portfolio follow-up.",
  },
  {
    id: "org_river",
    slug: "river-gate",
    name: "River Gate Properties",
    city: "Cordoba",
    planLabel: "Starter",
    marketFocus: "Rental management and relocation pipeline",
    description: "Focused on fast response times, rental inventory, and broker coordination.",
  },
];

const initialUsers: DemoUser[] = [
  {
    id: "user_1",
    fullName: "Camila Ortega",
    email: "camila@northhill.example",
    jobTitle: "Sales Director",
    isActive: true,
  },
  {
    id: "user_2",
    fullName: "Martin Vega",
    email: "martin@northhill.example",
    jobTitle: "Senior Agent",
    isActive: true,
  },
  {
    id: "user_3",
    fullName: "Lucia Perez",
    email: "lucia@northhill.example",
    jobTitle: "Operations Assistant",
    isActive: true,
  },
  {
    id: "user_4",
    fullName: "Sofia Rojas",
    email: "sofia@rivergate.example",
    jobTitle: "Broker Owner",
    isActive: true,
  },
  {
    id: "user_5",
    fullName: "Nicolas Acosta",
    email: "nicolas@rivergate.example",
    jobTitle: "Leasing Agent",
    isActive: true,
  },
];

const initialMemberships: DemoMembership[] = [
  { id: "m_1", organizationId: "org_north", userId: "user_1", role: MembershipRole.OWNER },
  { id: "m_2", organizationId: "org_north", userId: "user_2", role: MembershipRole.AGENT },
  { id: "m_3", organizationId: "org_north", userId: "user_3", role: MembershipRole.ASSISTANT },
  { id: "m_4", organizationId: "org_river", userId: "user_4", role: MembershipRole.OWNER },
  { id: "m_5", organizationId: "org_river", userId: "user_5", role: MembershipRole.AGENT },
];

const initialProperties: DemoProperty[] = [
  {
    id: "prop_1",
    organizationId: "org_north",
    title: "Bright 2BR apartment",
    address: "Costa Rica 4210",
    city: "Buenos Aires",
    neighborhood: "Palermo",
    propertyType: "Apartment",
    status: PropertyStatus.AVAILABLE,
    publicVisible: true,
    priceCents: 21500000,
    currency: "USD",
    bedrooms: 2,
    bathrooms: 2,
    surfaceM2: 84,
    latitude: -34.5884,
    longitude: -58.4301,
  },
  {
    id: "prop_2",
    organizationId: "org_north",
    title: "Renovated townhouse",
    address: "Amenabar 2531",
    city: "Buenos Aires",
    neighborhood: "Belgrano",
    propertyType: "Townhouse",
    status: PropertyStatus.RESERVED,
    publicVisible: false,
    priceCents: 36500000,
    currency: "USD",
    bedrooms: 3,
    bathrooms: 3,
    surfaceM2: 156,
    latitude: -34.5628,
    longitude: -58.4564,
  },
  {
    id: "prop_3",
    organizationId: "org_north",
    title: "Investor-ready studio",
    address: "Gurruchaga 1755",
    city: "Buenos Aires",
    neighborhood: "Palermo Soho",
    propertyType: "Studio",
    status: PropertyStatus.AVAILABLE,
    publicVisible: true,
    priceCents: 11800000,
    currency: "USD",
    bedrooms: 1,
    bathrooms: 1,
    surfaceM2: 38,
    latitude: -34.5891,
    longitude: -58.4278,
  },
  {
    id: "prop_4",
    organizationId: "org_river",
    title: "Furnished rental loft",
    address: "Obispo Trejo 941",
    city: "Cordoba",
    neighborhood: "Nueva Cordoba",
    propertyType: "Loft",
    status: PropertyStatus.AVAILABLE,
    publicVisible: true,
    priceCents: 92000000,
    currency: "ARS",
    bedrooms: 1,
    bathrooms: 1,
    surfaceM2: 46,
    latitude: -31.4236,
    longitude: -64.188,
  },
];

const initialLeads: DemoLead[] = [
  {
    id: "lead_1",
    organizationId: "org_north",
    ownerId: "user_2",
    propertyId: "prop_1",
    fullName: "Valentina Molina",
    email: "valentina@example.com",
    phone: "+54 11 5555 1201",
    status: "INTERESTED",
    source: "Website form",
    notes: "Looking for a 2-bedroom apartment near Palermo.",
    interestLabel: "Apartment purchase",
    lastContactAt: "2026-03-20T13:30:00.000Z",
    budgetLabel: "USD 180k - 230k",
  },
  {
    id: "lead_2",
    organizationId: "org_north",
    ownerId: "user_1",
    propertyId: "prop_3",
    fullName: "Diego Fernandez",
    email: "diego@example.com",
    phone: "+54 11 5555 1202",
    status: "VISIT",
    source: "Referral",
    notes: "Investor evaluating 3 units for medium-term rentals.",
    interestLabel: "Investment portfolio",
    lastContactAt: "2026-03-19T18:00:00.000Z",
    budgetLabel: "USD 400k+",
  },
  {
    id: "lead_3",
    organizationId: "org_north",
    ownerId: "user_2",
    propertyId: "prop_2",
    fullName: "Mariana Sucre",
    email: "mariana@example.com",
    phone: "+54 11 5555 1203",
    status: "CONTACTED",
    source: "Instagram campaign",
    notes: "Needs financing guidance before scheduling visits.",
    interestLabel: "First-home purchase",
    lastContactAt: "2026-03-18T15:45:00.000Z",
    budgetLabel: "USD 120k - 150k",
  },
  {
    id: "lead_4",
    organizationId: "org_river",
    ownerId: "user_5",
    propertyId: "prop_4",
    fullName: "Agustin Quiroga",
    email: "agustin@example.com",
    phone: "+54 351 555 2001",
    status: "NEW",
    source: "Property portal",
    notes: "Interested in a furnished rental close to Nueva Cordoba.",
    interestLabel: "Apartment rental",
    lastContactAt: "2026-03-20T09:15:00.000Z",
    budgetLabel: "ARS 850k / month",
  },
];

const initialLeadActivities: DemoLeadActivity[] = [
  {
    id: "act_1",
    organizationId: "org_north",
    leadId: "lead_1",
    title: "Inbound lead captured",
    description: "Lead submitted a website form for the Palermo apartment.",
    happenedAt: "2026-03-19T14:10:00.000Z",
  },
  {
    id: "act_2",
    organizationId: "org_north",
    leadId: "lead_1",
    title: "Broker qualification call",
    description: "Martin confirmed budget, neighborhood preference, and timing.",
    happenedAt: "2026-03-20T13:30:00.000Z",
  },
  {
    id: "act_3",
    organizationId: "org_north",
    leadId: "lead_2",
    title: "Investment brief shared",
    description: "Lead received ROI summary for the studio listing.",
    happenedAt: "2026-03-18T16:20:00.000Z",
  },
  {
    id: "act_4",
    organizationId: "org_north",
    leadId: "lead_2",
    title: "Visit requested",
    description: "Lead asked for an in-person visit next week.",
    happenedAt: "2026-03-19T18:00:00.000Z",
  },
  {
    id: "act_5",
    organizationId: "org_river",
    leadId: "lead_4",
    title: "Portal inquiry received",
    description: "Lead wants a fast viewing for the Nueva Cordoba loft.",
    happenedAt: "2026-03-20T09:15:00.000Z",
  },
];

const initialVisits: DemoVisit[] = [
  {
    id: "visit_1",
    organizationId: "org_north",
    propertyId: "prop_1",
    leadId: "lead_1",
    createdById: "user_2",
    status: VisitStatus.PENDING,
    scheduledAt: "2026-03-24T15:00:00.000Z",
    notes: "First guided walkthrough with both decision makers attending.",
  },
  {
    id: "visit_2",
    organizationId: "org_north",
    propertyId: "prop_3",
    leadId: "lead_2",
    createdById: "user_1",
    status: VisitStatus.CONFIRMED,
    scheduledAt: "2026-03-26T18:30:00.000Z",
    notes: "Evening visit focused on investment assumptions and building amenities.",
  },
  {
    id: "visit_3",
    organizationId: "org_river",
    propertyId: "prop_4",
    leadId: "lead_4",
    createdById: "user_5",
    status: VisitStatus.PENDING,
    scheduledAt: "2026-03-23T17:00:00.000Z",
    notes: "Rental showing with same-day document checklist review.",
  },
];

const state =
  globalThis.demoWorkspaceState ??
  {
    organizations: structuredClone(initialOrganizations),
    users: structuredClone(initialUsers),
    memberships: structuredClone(initialMemberships),
    properties: structuredClone(initialProperties),
    leads: structuredClone(initialLeads),
    leadActivities: structuredClone(initialLeadActivities),
    visits: structuredClone(initialVisits),
  };

if (!globalThis.demoWorkspaceState) {
  globalThis.demoWorkspaceState = state;
}

const {
  organizations,
  users,
  memberships,
  properties,
  leads,
  leadActivities,
  visits,
} = state;

function createDemoId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function pushLeadActivity(
  organizationId: string,
  leadId: string,
  title: string,
  description: string,
) {
  leadActivities.unshift({
    id: createDemoId("act"),
    organizationId,
    leadId,
    title,
    description,
    happenedAt: new Date().toISOString(),
  });
}

export function listDemoOrganizations() {
  return organizations;
}

export function getDemoOrganizationBySlug(orgSlug: string) {
  return organizations.find((organization) => organization.slug === orgSlug) ?? null;
}

export function getDemoOrganizationById(organizationId: string) {
  return organizations.find((organization) => organization.id === organizationId) ?? null;
}

export function listDemoMembershipsByOrganization(organizationId: string) {
  return memberships.filter((membership) => membership.organizationId === organizationId);
}

export function listDemoUsersByOrganization(organizationId: string) {
  return listDemoMembershipsByOrganization(organizationId)
    .map((membership) => {
      const user = users.find((candidate) => candidate.id === membership.userId);

      if (!user) {
        return null;
      }

      return {
        ...user,
        membershipId: membership.id,
        role: membership.role,
      };
    })
    .filter((user): user is NonNullable<typeof user> => Boolean(user));
}

export function getDemoUserById(userId: string) {
  return users.find((user) => user.id === userId) ?? null;
}

export function listDemoLeadsByOrganization(organizationId: string) {
  return leads.filter((lead) => lead.organizationId === organizationId);
}

export function getDemoLeadById(organizationId: string, leadId: string) {
  return leads.find(
    (lead) => lead.organizationId === organizationId && lead.id === leadId,
  ) ?? null;
}

export function listDemoLeadActivities(organizationId: string, leadId: string) {
  return leadActivities.filter(
    (activity) => activity.organizationId === organizationId && activity.leadId === leadId,
  );
}

export function listDemoPropertiesByOrganization(organizationId: string) {
  return properties.filter((property) => property.organizationId === organizationId);
}

export function getDemoPropertyById(organizationId: string, propertyId: string) {
  return properties.find(
    (property) => property.organizationId === organizationId && property.id === propertyId,
  ) ?? null;
}

export function listDemoPublicProperties() {
  return properties.filter((property) => property.publicVisible);
}

export function getDemoPublicPropertyById(propertyId: string) {
  return properties.find((property) => property.publicVisible && property.id === propertyId) ?? null;
}

export function listDemoVisitsByOrganization(organizationId: string) {
  return visits.filter((visit) => visit.organizationId === organizationId);
}

export function listDemoVisitsByLead(organizationId: string, leadId: string) {
  return visits.filter(
    (visit) => visit.organizationId === organizationId && visit.leadId === leadId,
  );
}

export function listDemoVisitsByProperty(organizationId: string, propertyId: string) {
  return visits.filter(
    (visit) => visit.organizationId === organizationId && visit.propertyId === propertyId,
  );
}

export function createDemoLead(input: {
  organizationId: string;
  fullName: string;
  phone: string;
  email?: string;
}) {
  const defaultOwner = listDemoUsersByOrganization(input.organizationId)[0];
  const lead: DemoLead = {
    id: createDemoId("lead"),
    organizationId: input.organizationId,
    ownerId: defaultOwner?.id ?? "",
    fullName: input.fullName,
    email: input.email ?? "",
    phone: input.phone,
    status: "NEW",
    source: "Manual entry",
    notes: "Created manually from the CRM workspace.",
    interestLabel: "New inquiry",
    lastContactAt: new Date().toISOString(),
    budgetLabel: "Pending qualification",
  };

  leads.unshift(lead);
  pushLeadActivity(
    input.organizationId,
    lead.id,
    "Lead created",
    "Lead was added manually from the CRM workspace.",
  );

  return lead;
}

export function updateDemoLead(input: {
  organizationId: string;
  leadId: string;
  fullName: string;
  phone: string;
  email?: string;
  status: LeadStage;
  propertyId?: string;
}) {
  const lead = getDemoLeadById(input.organizationId, input.leadId);

  if (!lead) {
    return null;
  }

  lead.fullName = input.fullName;
  lead.phone = input.phone;
  lead.email = input.email ?? "";
  lead.status = input.status;
  lead.propertyId = input.propertyId || undefined;
  lead.lastContactAt = new Date().toISOString();

  pushLeadActivity(
    input.organizationId,
    lead.id,
    "Lead updated",
    "Core lead details, stage, or property assignment were updated.",
  );

  return lead;
}

export function createDemoVisit(input: {
  organizationId: string;
  leadId: string;
  propertyId: string;
  createdById: string;
  scheduledAt: string;
  status: VisitStatus;
}) {
  const visit: DemoVisit = {
    id: createDemoId("visit"),
    organizationId: input.organizationId,
    propertyId: input.propertyId,
    leadId: input.leadId,
    createdById: input.createdById,
    scheduledAt: input.scheduledAt,
    status: input.status,
    notes: "Visit created directly from lead detail.",
  };

  visits.unshift(visit);
  const lead = getDemoLeadById(input.organizationId, input.leadId);

  if (lead) {
    lead.status = "VISIT";
    lead.lastContactAt = new Date().toISOString();
  }

  pushLeadActivity(
    input.organizationId,
    input.leadId,
    "Visit scheduled",
    "A visit was created directly from the lead detail screen.",
  );

  return visit;
}
