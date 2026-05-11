const {
  ConversationStatus,
  MembershipRole,
  MessageDirection,
  NotificationType,
  PrismaClient,
  PropertyStatus,
  VisitStatus,
  AgentScope,
  AgentType,
} = require("@prisma/client");
const { randomBytes, scrypt } = require("node:crypto");
const { promisify } = require("node:util");

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64");
  const buf = await scryptAsync(password, salt, 64);
  return `${salt}:${buf.toString("base64")}`;
}

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
    id: "user_platform_admin",
    fullName: "Admin RaicesPilot",
    email: "admin@raicespilot.local",
    jobTitle: "Superadmin",
    isActive: true,
    isPlatformAdmin: true,
  },
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

const conversations = [
  {
    id: "conv_1",
    organizationId: "org_north",
    leadId: "lead_1",
    propertyId: "prop_1",
    channel: "WHATSAPP",
    status: ConversationStatus.QUALIFIED,
    participantName: "Valentina Molina",
    participantPhone: "+54 11 5555 1201",
    propertyContextNote: "Lead asked specifically about the Palermo 2BR apartment.",
    subject: "Property inquiry",
    lastMessageAt: new Date("2026-03-20T13:28:00.000Z"),
  },
  {
    id: "conv_2",
    organizationId: "org_north",
    leadId: "lead_2",
    propertyId: "prop_3",
    channel: "WHATSAPP",
    status: ConversationStatus.OPEN,
    participantName: "Diego Fernandez",
    participantPhone: "+54 11 5555 1202",
    propertyContextNote: "Conversation references the investor-ready studio listing.",
    subject: "Investment follow-up",
    lastMessageAt: new Date("2026-03-19T17:55:00.000Z"),
  },
  {
    id: "conv_3",
    organizationId: "org_river",
    leadId: "lead_4",
    propertyId: "prop_4",
    channel: "WHATSAPP",
    status: ConversationStatus.OPEN,
    participantName: "Agustin Quiroga",
    participantPhone: "+54 351 555 2001",
    propertyContextNote: "Rental inquiry matched to the furnished loft in Nueva Cordoba.",
    subject: "Rental inquiry",
    lastMessageAt: new Date("2026-03-20T09:12:00.000Z"),
  },
];

const messages = [
  {
    organizationId: "org_north",
    conversationId: "conv_1",
    direction: MessageDirection.INBOUND,
    body: "Hi, is the Palermo apartment still available this week?",
    senderName: "Valentina Molina",
    senderPhone: "+54 11 5555 1201",
    sentAt: new Date("2026-03-20T13:18:00.000Z"),
  },
  {
    organizationId: "org_north",
    conversationId: "conv_1",
    direction: MessageDirection.OUTBOUND,
    body: "Yes, it is available. I can share details and schedule a visit.",
    senderName: "Martin Vega",
    senderPhone: "+54 11 5555 1201",
    sentAt: new Date("2026-03-20T13:21:00.000Z"),
  },
  {
    organizationId: "org_north",
    conversationId: "conv_1",
    direction: MessageDirection.INBOUND,
    body: "Great, I prefer late afternoons and I am interested in the 2-bedroom layout.",
    senderName: "Valentina Molina",
    senderPhone: "+54 11 5555 1201",
    sentAt: new Date("2026-03-20T13:28:00.000Z"),
  },
  {
    organizationId: "org_north",
    conversationId: "conv_2",
    direction: MessageDirection.INBOUND,
    body: "Can you share ROI assumptions for the studio?",
    senderName: "Diego Fernandez",
    senderPhone: "+54 11 5555 1202",
    sentAt: new Date("2026-03-19T17:48:00.000Z"),
  },
  {
    organizationId: "org_north",
    conversationId: "conv_2",
    direction: MessageDirection.OUTBOUND,
    body: "I sent a short investment brief and can walk you through it on a visit.",
    senderName: "Camila Ortega",
    senderPhone: "+54 11 5555 1202",
    sentAt: new Date("2026-03-19T17:55:00.000Z"),
  },
  {
    organizationId: "org_river",
    conversationId: "conv_3",
    direction: MessageDirection.INBOUND,
    body: "I saw the furnished loft and want to know if I can visit after work.",
    senderName: "Agustin Quiroga",
    senderPhone: "+54 351 555 2001",
    sentAt: new Date("2026-03-20T09:12:00.000Z"),
  },
];

const availabilitySlots = [
  {
    organizationId: "org_north",
    propertyId: "prop_1",
    userId: "user_2",
    label: "Palermo afternoon visits",
    weekday: 1,
    startMinute: 900,
    endMinute: 1080,
    timezone: "America/Buenos_Aires",
    isActive: true,
  },
  {
    organizationId: "org_north",
    propertyId: "prop_1",
    userId: "user_2",
    label: "Palermo afternoon visits",
    weekday: 3,
    startMinute: 900,
    endMinute: 1080,
    timezone: "America/Buenos_Aires",
    isActive: true,
  },
  {
    organizationId: "org_north",
    propertyId: "prop_3",
    userId: "user_1",
    label: "Studio investor slot",
    weekday: 4,
    startMinute: 1080,
    endMinute: 1200,
    timezone: "America/Buenos_Aires",
    isActive: true,
  },
  {
    organizationId: "org_river",
    propertyId: "prop_4",
    userId: "user_5",
    label: "Rental showing window",
    weekday: 2,
    startMinute: 960,
    endMinute: 1140,
    timezone: "America/Buenos_Aires",
    isActive: true,
  },
];

const notifications = [
  {
    organizationId: "org_north",
    type: NotificationType.VISIT_CREATED,
    title: "Visit scheduled for Valentina Molina",
    body: "Bright 2BR apartment visit booked for 24 Mar at 15:00.",
    link: "/north-hill/visits",
    entityType: "visit",
    entityId: "visit_1",
    createdAt: new Date("2026-03-20T13:31:00.000Z"),
  },
  {
    organizationId: "org_north",
    type: NotificationType.VISIT_CREATED,
    title: "Visit confirmed for Diego Fernandez",
    body: "Investor-ready studio visit booked for 26 Mar at 18:30.",
    link: "/north-hill/visits",
    entityType: "visit",
    entityId: "visit_2",
    createdAt: new Date("2026-03-19T18:03:00.000Z"),
  },
  {
    organizationId: "org_river",
    type: NotificationType.VISIT_CREATED,
    title: "Visit scheduled for Agustin Quiroga",
    body: "Furnished rental loft visit booked for 23 Mar at 17:00.",
    link: "/river-gate/visits",
    entityType: "visit",
    entityId: "visit_3",
    createdAt: new Date("2026-03-20T09:16:00.000Z"),
  },
];

// ─── Plan catalog ──────────────────────────────────────────────────────────
// Plans are catalog data: upserted first, never deleted by re-seed.
// The id is a stable slug referenced directly by application code.

const plans = [
  {
    id: "piloto",
    name: "Piloto",
    description: "Período de evaluación. Acceso limitado para explorar la plataforma antes de contratar.",
    sortOrder: 0,
    isActive: true,
    maxUsers: 2,
    maxProperties: 15,
    maxAiAgents: null,
    maxWhatsAppChannels: 1,
    canUseAiAgents: false,
    canUseAutomations: false,
    canUsePropertySync: false,
    canExportData: false,
    canUseMultipleWhatsAppChannels: false,
  },
  {
    id: "starter",
    name: "Starter",
    description: "Para inmobiliarias en operación. CRM completo, un agente IA y hasta 100 propiedades.",
    sortOrder: 1,
    isActive: true,
    maxUsers: 5,
    maxProperties: 100,
    maxAiAgents: 1,
    maxWhatsAppChannels: 1,
    canUseAiAgents: true,
    canUseAutomations: false,
    canUsePropertySync: false,
    canExportData: false,
    canUseMultipleWhatsAppChannels: false,
  },
  {
    id: "growth",
    name: "Growth",
    description: "Para equipos en crecimiento. Propiedades ilimitadas, hasta 5 agentes IA y todas las integraciones.",
    sortOrder: 2,
    isActive: true,
    maxUsers: 20,
    maxProperties: null,
    maxAiAgents: 5,
    maxWhatsAppChannels: 3,
    canUseAiAgents: true,
    canUseAutomations: true,
    canUsePropertySync: true,
    canExportData: true,
    canUseMultipleWhatsAppChannels: true,
  },
];

async function main() {
  // Upsert plans first — catalog data survives re-seeds
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }

  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.property.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.automationRule.deleteMany();

  // Delete AgentOS tables
  await prisma.agentLog.deleteMany();
  await prisma.agentApproval.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.contentDraft.deleteMany();
  await prisma.agentTask.deleteMany();
  await prisma.agent.deleteMany();

  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const platformAdminPasswordHash = await hashPassword("123456");

  await prisma.organization.createMany({ data: organizations });
  await prisma.user.createMany({
    data: users.map((user) =>
      user.email === "admin@raicespilot.local"
        ? { ...user, passwordHash: platformAdminPasswordHash }
        : user,
    ),
  });
  await prisma.membership.createMany({ data: memberships });
  await prisma.property.createMany({ data: properties });
  await prisma.lead.createMany({ data: leads });
  await prisma.conversation.createMany({ data: conversations });
  await prisma.message.createMany({ data: messages });
  await prisma.availabilitySlot.createMany({ data: availabilitySlots });
  await prisma.visit.createMany({ data: visits });
  await prisma.notification.createMany({ data: notifications });

  // Seed AgentOS agents
  const existingAgents = await prisma.agent.count({
    where: { scope: AgentScope.PLATFORM }
  });

  if (existingAgents === 0) {
    console.log("Creating AgentOS agents...");

    await prisma.agent.create({
      data: {
        scope: AgentScope.PLATFORM,
        organizationId: null,
        name: "Director Operativo IA",
        type: AgentType.ORCHESTRATOR,
        isActive: true,
        config: {
          description: "Agente principal que coordina y asigna tareas a otros agentes especializados",
          capabilities: ["task_assignment", "workflow_orchestration", "quality_control"],
          tone: "professional"
        }
      }
    });

    await prisma.agent.create({
      data: {
        scope: AgentScope.PLATFORM,
        organizationId: null,
        name: "Agente de Marketing",
        type: AgentType.MARKETING,
        isActive: true,
        config: {
          description: "Especialista en creacion de contenido para redes sociales y marketing digital",
          capabilities: ["content_creation", "social_media_strategy", "brand_voice"],
          platforms: ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "WHATSAPP_BUSINESS"],
          tone: "professional",
          language: "Spanish",
          target_audience: "real_estate_professionals"
        }
      }
    });

    console.log("AgentOS agents created successfully");
  } else {
    console.log("AgentOS agents already exist, skipping creation");
  }
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
