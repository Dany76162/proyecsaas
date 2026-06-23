import "server-only";

// Demo.1 — Adaptador READ-ONLY para el Modo Demo (/demo).
// Usa el dataset existente `workspace-store.ts` (solo getters de lectura) y lo
// mapea a español LATAM para la UI. Agrega bloques demo que el store no tiene
// (Inbox IA y un desarrollo) como contenido de ejemplo claramente ficticio.
// NO escribe en DB, NO usa los mutadores del store, NO toca worker/WhatsApp/pagos.
import {
  getDemoOrganizationBySlug,
  listDemoLeadsByOrganization,
  listDemoPropertiesByOrganization,
  listDemoVisitsByOrganization,
} from "@/server/demo/workspace-store";

const SHOWCASE_ORG_SLUG = "north-hill";

const LEAD_STAGE_ES: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  INTERESTED: "Interesado",
  VISIT: "En visita",
  NEGOTIATION: "Negociación",
  WON: "Ganado",
  LOST: "Perdido",
};

const PROPERTY_STATUS_ES: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  DRAFT: "Borrador",
  ARCHIVED: "Archivado",
};

const VISIT_STATUS_ES: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELED: "Cancelada",
  COMPLETED: "Realizada",
};

// Traducciones puntuales del contenido en inglés del dataset (showcase fijo).
// Si un valor no está mapeado, cae al original (fallback honesto).
const TEXT_ES: Record<string, string> = {
  // propiedades
  "Bright 2BR apartment": "Departamento luminoso de 2 ambientes",
  "Renovated townhouse": "Casa reciclada en dúplex",
  "Investor-ready studio": "Monoambiente apto inversión",
  Apartment: "Departamento",
  Townhouse: "Dúplex",
  Studio: "Monoambiente",
  // leads — source
  "Website form": "Formulario del sitio",
  Referral: "Referido",
  "Instagram campaign": "Campaña de Instagram",
  // leads — interés
  "Apartment purchase": "Compra de departamento",
  "Investment portfolio": "Cartera de inversión",
  "First-home purchase": "Primera vivienda",
  // leads — notas
  "Looking for a 2-bedroom apartment near Palermo.":
    "Busca un departamento de 2 dormitorios cerca de Palermo.",
  "Investor evaluating 3 units for medium-term rentals.":
    "Inversor evaluando 3 unidades para alquiler de mediano plazo.",
  "Needs financing guidance before scheduling visits.":
    "Necesita asesoramiento de financiación antes de coordinar visitas.",
};

const es = (value: string) => TEXT_ES[value] ?? value;

function formatPrice(priceCents: number, currency: string) {
  const amount = Math.round(priceCents / 100);
  return `${currency} ${amount.toLocaleString("es-AR")}`;
}

export type DemoShowcase = ReturnType<typeof getDemoShowcase>;

export function getDemoShowcase() {
  const org = getDemoOrganizationBySlug(SHOWCASE_ORG_SLUG);
  const orgId = org?.id ?? "org_north";

  const rawLeads = listDemoLeadsByOrganization(orgId);
  const rawProps = listDemoPropertiesByOrganization(orgId);
  const rawVisits = listDemoVisitsByOrganization(orgId);

  const leads = rawLeads.map((l) => ({
    id: l.id,
    fullName: l.fullName,
    statusEs: LEAD_STAGE_ES[l.status] ?? l.status,
    sourceEs: es(l.source),
    interestEs: es(l.interestLabel),
    notesEs: es(l.notes),
    budgetLabel: l.budgetLabel,
    lastContactAt: l.lastContactAt,
  }));

  const properties = rawProps.map((p) => ({
    id: p.id,
    titleEs: es(p.title),
    typeEs: es(p.propertyType),
    neighborhood: p.neighborhood,
    city: p.city,
    statusEs: PROPERTY_STATUS_ES[p.status] ?? p.status,
    publicVisible: p.publicVisible,
    priceLabel: formatPrice(p.priceCents, p.currency),
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    surfaceM2: p.surfaceM2,
  }));

  const visits = rawVisits.map((v) => ({
    id: v.id,
    statusEs: VISIT_STATUS_ES[v.status] ?? v.status,
    scheduledAt: v.scheduledAt,
  }));

  const kpis = {
    opportunities: leads.length,
    aiConversations: DEMO_INBOX.length,
    activeProperties: properties.filter((p) => p.statusEs === "Disponible").length,
    visits: visits.length,
    lots: DEMO_DEVELOPMENT.totalLots,
  };

  return {
    org: {
      name: org?.name ?? "North Hill Realty",
      city: org?.city ?? "Buenos Aires",
      planLabel: "Crecimiento",
    },
    kpis,
    leads,
    properties,
    visits,
    inbox: DEMO_INBOX,
    development: DEMO_DEVELOPMENT,
  };
}

// ── Extras demo en español (el store no tiene Inbox IA ni desarrollos) ──
const DEMO_INBOX = [
  {
    id: "conv_1",
    contact: "Valentina Molina",
    clientMessage: "Hola, vi el depto de 2 ambientes en Palermo. ¿Sigue disponible?",
    aiReply:
      "¡Hola, Valentina! Sí, sigue disponible. Son 84 m², 2 dormitorios y 2 baños. ¿Querés que coordinemos una visita esta semana?",
    interestEs: "Caliente",
    linkedOpportunity: "Compra de departamento",
  },
  {
    id: "conv_2",
    contact: "Diego Fernández",
    clientMessage: "Busco unidades para invertir y alquilar. ¿Qué ROI manejan?",
    aiReply:
      "Te paso 3 opciones aptas inversión con su renta estimada. ¿Preferís zona Palermo o Belgrano? Coordino una llamada con un asesor si querés afinar números.",
    interestEs: "Tibio",
    linkedOpportunity: "Cartera de inversión",
  },
  {
    id: "conv_3",
    contact: "Mariana Sucre",
    clientMessage: "Es mi primera compra y necesito ayuda con la financiación.",
    aiReply:
      "Te entiendo, Mariana. Trabajamos con créditos hipotecarios y te puedo orientar con los requisitos. ¿Tenés un presupuesto aproximado en mente?",
    interestEs: "Tibio",
    linkedOpportunity: "Primera vivienda",
  },
];

const DEMO_DEVELOPMENT = {
  name: "Valles del Pino",
  description:
    "Loteo residencial con servicios completos. La IA ofrece los lotes disponibles, responde por servicios y coordina visitas según la disponibilidad del desarrollo.",
  totalLots: 48,
  available: 31,
  reserved: 9,
  sold: 8,
};
