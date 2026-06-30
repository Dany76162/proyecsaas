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
    name: "Martínez & Asociados Inmobiliaria",
    city: "Buenos Aires",
    planLabel: "Growth",
    marketFocus: "Venta y alquiler residencial, inversores",
    description: "Inmobiliaria tradicional con equipo de 6 asesores. Opera en zona norte de CABA y GBA. Matrícula CUCICBA.",
  },
  {
    id: "org_river",
    slug: "river-gate",
    name: "Terraviña Desarrollos",
    city: "Córdoba",
    planLabel: "Starter",
    marketFocus: "Loteos y desarrollos urbanísticos",
    description: "Desarrolladora con 2 barrios en comercialización. Masterplan activo con lotes, manzanas y etapas.",
  },
];

const initialUsers: DemoUser[] = [
  {
    id: "user_1",
    fullName: "Camila Ortega",
    email: "camila@martinezinmo.example",
    jobTitle: "Directora Comercial",
    isActive: true,
  },
  {
    id: "user_2",
    fullName: "Martín Vega",
    email: "martin@martinezinmo.example",
    jobTitle: "Asesor Inmobiliario",
    isActive: true,
  },
  {
    id: "user_3",
    fullName: "Lucía Pérez",
    email: "lucia@martinezinmo.example",
    jobTitle: "Asistente de Operaciones",
    isActive: true,
  },
  {
    id: "user_4",
    fullName: "Sofía Rojas",
    email: "sofia@terravina.example",
    jobTitle: "Gerente Comercial",
    isActive: true,
  },
  {
    id: "user_5",
    fullName: "Nicolás Acosta",
    email: "nicolas@terravina.example",
    jobTitle: "Asesor de Ventas",
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
    title: "Departamento 3 ambientes luminoso con balcón",
    address: "Costa Rica 4210",
    city: "Buenos Aires",
    neighborhood: "Palermo",
    propertyType: "Departamento",
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
    title: "PH reciclado en duplex con patio",
    address: "Amenábar 2531",
    city: "Buenos Aires",
    neighborhood: "Belgrano",
    propertyType: "PH",
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
    title: "Monoambiente apto profesional, ideal inversión",
    address: "Gurruchaga 1755",
    city: "Buenos Aires",
    neighborhood: "Palermo Soho",
    propertyType: "Monoambiente",
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
    title: "Lote 480m² en Barrio Terraviña Etapa 1",
    address: "Manzana 12, Lote 8",
    city: "Córdoba",
    neighborhood: "Villa Allende",
    propertyType: "Terreno",
    status: PropertyStatus.AVAILABLE,
    publicVisible: true,
    priceCents: 1870000,
    currency: "USD",
    bedrooms: 0,
    bathrooms: 0,
    surfaceM2: 480,
    latitude: -31.2936,
    longitude: -64.2950,
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
    source: "WhatsApp",
    notes: "Busca 2 ambientes en Palermo, cerca del subte. Consulta por expensas.",
    interestLabel: "Compra de departamento",
    lastContactAt: "2026-03-20T13:30:00.000Z",
    budgetLabel: "USD 180k - 230k",
  },
  {
    id: "lead_2",
    organizationId: "org_north",
    ownerId: "user_1",
    propertyId: "prop_3",
    fullName: "Diego Fernández",
    email: "diego@example.com",
    phone: "+54 11 5555 1202",
    status: "VISIT",
    source: "Referido",
    notes: "Inversor evaluando 3 unidades para renta temporaria (Airbnb). Preguntó por reglamento de consorcio.",
    interestLabel: "Inversión en pozo y usados",
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
    source: "Campaña Instagram",
    notes: "Primera vivienda, consulta por crédito UVA y si el PH califica. Necesita orientación financiera.",
    interestLabel: "Primera vivienda con crédito",
    lastContactAt: "2026-03-18T15:45:00.000Z",
    budgetLabel: "USD 120k - 150k",
  },
  {
    id: "lead_4",
    organizationId: "org_river",
    ownerId: "user_5",
    propertyId: "prop_4",
    fullName: "Agustín Quiroga",
    email: "agustin@example.com",
    phone: "+54 351 555 2001",
    status: "NEW",
    source: "ZonaProp",
    notes: "Consulta por lote en Etapa 1. Preguntó servicios (agua, luz, gas) y si se puede escriturar.",
    interestLabel: "Compra de lote para construir",
    lastContactAt: "2026-03-20T09:15:00.000Z",
    budgetLabel: "USD 15k - 25k",
  },
];

const initialLeadActivities: DemoLeadActivity[] = [
  {
    id: "act_1",
    organizationId: "org_north",
    leadId: "lead_1",
    title: "Consulta recibida por WhatsApp",
    description: "La clienta consultó por el 3 ambientes de Palermo. El agente IA respondió con ficha y precio.",
    happenedAt: "2026-03-19T14:10:00.000Z",
  },
  {
    id: "act_2",
    organizationId: "org_north",
    leadId: "lead_1",
    title: "Calificación del asesor",
    description: "Martín confirmó presupuesto, preferencia de barrio y urgencia. Lead calificado como WARM.",
    happenedAt: "2026-03-20T13:30:00.000Z",
  },
  {
    id: "act_3",
    organizationId: "org_north",
    leadId: "lead_2",
    title: "Envío de análisis de inversión",
    description: "Se compartió resumen de rentabilidad estimada para el monoambiente de Palermo Soho.",
    happenedAt: "2026-03-18T16:20:00.000Z",
  },
  {
    id: "act_4",
    organizationId: "org_north",
    leadId: "lead_2",
    title: "Visita solicitada",
    description: "El inversor pidió visitar el monoambiente la semana que viene. Se coordinó con el equipo.",
    happenedAt: "2026-03-19T18:00:00.000Z",
  },
  {
    id: "act_5",
    organizationId: "org_river",
    leadId: "lead_4",
    title: "Consulta desde ZonaProp",
    description: "Consulta por lote en Etapa 1: servicios disponibles, posibilidad de escriturar y financiación.",
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
    notes: "Visita guiada con matrimonio. Consultar por expensas y cochera disponible.",
  },
  {
    id: "visit_2",
    organizationId: "org_north",
    propertyId: "prop_3",
    leadId: "lead_2",
    createdById: "user_1",
    status: VisitStatus.CONFIRMED,
    scheduledAt: "2026-03-26T18:30:00.000Z",
    notes: "Visita vespertina con inversor. Foco en rentabilidad, reglamento de consorcio y amenities del edificio.",
  },
  {
    id: "visit_3",
    organizationId: "org_river",
    propertyId: "prop_4",
    leadId: "lead_4",
    createdById: "user_5",
    status: VisitStatus.PENDING,
    scheduledAt: "2026-03-23T17:00:00.000Z",
    notes: "Recorrida por el loteo Etapa 1. Mostrar accesos, servicios y lotes disponibles en manzana 12.",
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
