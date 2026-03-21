import "server-only";

import {
  LeadStatus,
  MembershipRole,
  PropertyStatus,
} from "@prisma/client";

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
  fullName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  notes: string;
  interestLabel: string;
  lastContactAt: string;
  budgetLabel: string;
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

const organizations: DemoOrganization[] = [
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

const users: DemoUser[] = [
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

const memberships: DemoMembership[] = [
  { id: "m_1", organizationId: "org_north", userId: "user_1", role: MembershipRole.OWNER },
  { id: "m_2", organizationId: "org_north", userId: "user_2", role: MembershipRole.AGENT },
  { id: "m_3", organizationId: "org_north", userId: "user_3", role: MembershipRole.ASSISTANT },
  { id: "m_4", organizationId: "org_river", userId: "user_4", role: MembershipRole.OWNER },
  { id: "m_5", organizationId: "org_river", userId: "user_5", role: MembershipRole.AGENT },
];

const leads: DemoLead[] = [
  {
    id: "lead_1",
    organizationId: "org_north",
    ownerId: "user_2",
    fullName: "Valentina Molina",
    email: "valentina@example.com",
    phone: "+54 11 5555 1201",
    status: LeadStatus.NEW,
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
    fullName: "Diego Fernandez",
    email: "diego@example.com",
    phone: "+54 11 5555 1202",
    status: LeadStatus.QUALIFIED,
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
    fullName: "Mariana Sucre",
    email: "mariana@example.com",
    phone: "+54 11 5555 1203",
    status: LeadStatus.CONTACTED,
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
    fullName: "Agustin Quiroga",
    email: "agustin@example.com",
    phone: "+54 351 555 2001",
    status: LeadStatus.NEW,
    source: "Property portal",
    notes: "Interested in a furnished rental close to Nueva Cordoba.",
    interestLabel: "Apartment rental",
    lastContactAt: "2026-03-20T09:15:00.000Z",
    budgetLabel: "ARS 850k / month",
  },
];

const properties: DemoProperty[] = [
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

export function listDemoOrganizations() {
  return organizations;
}

export function getDemoOrganizationBySlug(orgSlug: string) {
  return organizations.find((organization) => organization.slug === orgSlug) ?? null;
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

export function listDemoLeadsByOrganization(organizationId: string) {
  return leads.filter((lead) => lead.organizationId === organizationId);
}

export function listDemoPropertiesByOrganization(organizationId: string) {
  return properties.filter((property) => property.organizationId === organizationId);
}

export function listDemoPublicProperties() {
  return properties.filter((property) => property.publicVisible);
}
