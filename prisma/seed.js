const {
  MembershipRole,
  PrismaClient,
  PropertyStatus,
  VisitStatus,
} = require("@prisma/client");

const prisma = new PrismaClient();

const organizations = [
  {
    id: "org_north",
    slug: "north-hill",
    name: "North Hill Realty",
    city: "Buenos Aires",
    planLabel: "Growth",
    marketFocus: "Residential sales and investor opportunities",
    description:
      "Internal workspace for brokers, lead qualification, and portfolio follow-up.",
    isActive: true,
  },
  {
    id: "org_river",
    slug: "river-gate",
    name: "River Gate Properties",
    city: "Cordoba",
    planLabel: "Starter",
    marketFocus: "Rental management and relocation pipeline",
    description:
      "Focused on fast response times, rental inventory, and broker coordination.",
    isActive: true,
  },
];

const users = [
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

const memberships = [
  { id: "m_1", organizationId: "org_north", userId: "user_1", role: MembershipRole.OWNER },
  { id: "m_2", organizationId: "org_north", userId: "user_2", role: MembershipRole.AGENT },
  { id: "m_3", organizationId: "org_north", userId: "user_3", role: MembershipRole.ASSISTANT },
  { id: "m_4", organizationId: "org_river", userId: "user_4", role: MembershipRole.OWNER },
  { id: "m_5", organizationId: "org_river", userId: "user_5", role: MembershipRole.AGENT },
];

const properties = [
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
    latitude: "-34.5884000",
    longitude: "-58.4301000",
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
    latitude: "-34.5628000",
    longitude: "-58.4564000",
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
    latitude: "-34.5891000",
    longitude: "-58.4278000",
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
    latitude: "-31.4236000",
    longitude: "-64.1880000",
  },
];

const leads = [
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
    lastContactAt: new Date("2026-03-20T13:30:00.000Z"),
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
    lastContactAt: new Date("2026-03-19T18:00:00.000Z"),
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
    lastContactAt: new Date("2026-03-18T15:45:00.000Z"),
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
    lastContactAt: new Date("2026-03-20T09:15:00.000Z"),
    budgetLabel: "ARS 850k / month",
  },
];

const visits = [
  {
    id: "visit_1",
    organizationId: "org_north",
    propertyId: "prop_1",
    leadId: "lead_1",
    createdById: "user_2",
    status: VisitStatus.PENDING,
    scheduledAt: new Date("2026-03-24T15:00:00.000Z"),
    notes: "First guided walkthrough with both decision makers attending.",
  },
  {
    id: "visit_2",
    organizationId: "org_north",
    propertyId: "prop_3",
    leadId: "lead_2",
    createdById: "user_1",
    status: VisitStatus.CONFIRMED,
    scheduledAt: new Date("2026-03-26T18:30:00.000Z"),
    notes: "Evening visit focused on investment assumptions and building amenities.",
  },
  {
    id: "visit_3",
    organizationId: "org_river",
    propertyId: "prop_4",
    leadId: "lead_4",
    createdById: "user_5",
    status: VisitStatus.PENDING,
    scheduledAt: new Date("2026-03-23T17:00:00.000Z"),
    notes: "Rental showing with same-day document checklist review.",
  },
];

async function main() {
  await prisma.visit.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.property.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  await prisma.organization.createMany({ data: organizations });
  await prisma.user.createMany({ data: users });
  await prisma.membership.createMany({ data: memberships });
  await prisma.property.createMany({ data: properties });
  await prisma.lead.createMany({ data: leads });
  await prisma.visit.createMany({ data: visits });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
