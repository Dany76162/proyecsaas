import { prisma } from "@/server/db/prisma";
import { 
  ProspectStatus, 
  ProspectCompanyType, 
  ProspectActivityType,
  Prisma
} from "@prisma/client";
import { ProspectFilters } from "./types";

export async function getProspects(filters: ProspectFilters = {}) {
  const where: Prisma.CommercialProspectWhereInput = {};

  if (filters.search) {
    where.OR = [
      { companyName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { website: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type) {
    where.companyType = filters.type;
  }

  if (filters.country) {
    where.country = { contains: filters.country, mode: "insensitive" };
  }

  if (filters.hasEmail) {
    where.email = { not: null };
  }

  if (filters.hasWebsite) {
    where.website = { not: null };
  }

  if (filters.isDoNotContact !== undefined) {
    where.isDoNotContact = filters.isDoNotContact;
  }

  if (filters.manualStatus) {
    where.manualStatus = filters.manualStatus;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.manualRating) {
    where.manualRating = filters.manualRating;
  }

  return prisma.commercialProspect.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });
}

export async function getProspectById(id: string) {
  return prisma.commercialProspect.findUnique({
    where: { id },
    include: {
      activities: {
        orderBy: { createdAt: "desc" }
      },
      messageDrafts: {
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function createProspect(data: Prisma.CommercialProspectCreateInput, userId?: string) {
  const prospect = await prisma.commercialProspect.create({
    data
  });

  await logProspectActivity(prospect.id, "created", "Prospecto creado manualmente", userId);
  
  return prospect;
}

export async function updateProspect(id: string, data: Prisma.CommercialProspectUpdateInput, userId?: string) {
  const prospect = await prisma.commercialProspect.update({
    where: { id },
    data
  });

  await logProspectActivity(id, "note_added", "Datos del prospecto actualizados", userId);
  
  return prospect;
}

export async function logProspectActivity(
  prospectId: string, 
  type: ProspectActivityType, 
  message: string, 
  userId?: string,
  metadata?: any
) {
  return prisma.commercialProspectActivity.create({
    data: {
      prospectId,
      type,
      message,
      createdByUserId: userId,
      metadata: metadata || {}
    }
  });
}

export async function detectPotentialDuplicates(
  email?: string, 
  website?: string, 
  name?: string,
  placeId?: string,
  phone?: string
) {
  const potential: any[] = [];

  if (placeId) {
    const byPlaceId = await prisma.commercialProspect.findMany({
      where: { placeId }
    });
    potential.push(...byPlaceId);
  }

  if (email) {
    const byEmail = await prisma.commercialProspect.findMany({
      where: { email: { equals: email, mode: "insensitive" } }
    });
    potential.push(...byEmail);
  }

  if (website) {
    const byWeb = await prisma.commercialProspect.findMany({
      where: { website: { contains: website, mode: "insensitive" } }
    });
    potential.push(...byWeb);
  }
  
  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length > 5) {
      const byPhone = await prisma.commercialProspect.findMany({
        where: { 
          OR: [
            { phone: { contains: normalizedPhone } },
            { whatsapp: { contains: normalizedPhone } }
          ]
        }
      });
      potential.push(...byPhone);
    }
  }

  if (name) {
    const byName = await prisma.commercialProspect.findMany({
      where: { companyName: { equals: name, mode: "insensitive" } }
    });
    potential.push(...byName);
  }

  // Deduplicate by ID
  return Array.from(new Map(potential.map(item => [item.id, item])).values());
}

// ─── High-fit company types (core real estate industry) ─────────────────────
const HIGH_FIT_TYPES: ProspectCompanyType[] = [
  "REAL_ESTATE_AGENCY",
  "CONSTRUCTION_COMPANY",
  "DEVELOPER",
  "BROKER_AGENT",
  "LAND_DEVELOPER",
  "REAL_ESTATE_GROUP",
];

const MEDIUM_FIT_TYPES: ProspectCompanyType[] = [
  "PROPERTY_MANAGER",
  "REAL_ESTATE_INVESTOR",
];

// ─── Generic email domains that reduce confidence ───────────────────────────
const GENERIC_EMAIL_DOMAINS = [
  "gmail.com", "hotmail.com", "yahoo.com", "outlook.com",
  "live.com", "aol.com", "mail.com", "protonmail.com",
];

/**
 * Full 4-axis scoring for a prospect.
 * - qualityScore: completeness/richness of data
 * - fitScore: how well the prospect matches RaicesPilot's ideal customer
 * - confidenceScore: reliability of the data
 * - riskScore: potential problems (duplicates, blacklists, generic data)
 */
export async function calculateProspectScores(id: string) {
  const prospect = await prisma.commercialProspect.findUnique({ where: { id } });
  if (!prospect) return;

  // ── Quality Score ──────────────────────────────────────────────────────────
  let qualityScore = 0;
  if (prospect.email) qualityScore += 25;
  if (prospect.website) qualityScore += 20;
  if (prospect.phone || prospect.whatsapp) qualityScore += 15;
  if (prospect.country || prospect.city) qualityScore += 10;
  if (prospect.region) qualityScore += 5;
  if (prospect.instagramUrl || prospect.linkedinUrl || prospect.facebookUrl) qualityScore += 10;
  if (prospect.companyType !== "OTHER_REAL_ESTATE") qualityScore += 15;

  // ── Fit Score ─────────────────────────────────────────────────────────────
  let fitScore = 0;
  if (HIGH_FIT_TYPES.includes(prospect.companyType)) {
    fitScore = 90;
  } else if (MEDIUM_FIT_TYPES.includes(prospect.companyType)) {
    fitScore = 65;
  } else if (prospect.companyType === "ARCHITECTURE_STUDIO") {
    fitScore = 40;
  } else {
    fitScore = 20;
  }
  // Boost if in Argentina (primary market)
  if (prospect.country?.toLowerCase().includes("argentin")) fitScore = Math.min(100, fitScore + 10);

  // ── Confidence Score ──────────────────────────────────────────────────────
  let confidenceScore = 0;
  let confidenceFactors = 0;
  if (prospect.email) confidenceFactors++;
  if (prospect.website) confidenceFactors++;
  if (prospect.sourceUrl) confidenceFactors++;
  if (prospect.phone || prospect.whatsapp) confidenceFactors++;
  if (prospect.linkedinUrl) confidenceFactors++;

  if (confidenceFactors >= 4) confidenceScore = 90;
  else if (confidenceFactors === 3) confidenceScore = 75;
  else if (confidenceFactors === 2) confidenceScore = 55;
  else if (confidenceFactors === 1) confidenceScore = 30;
  else confidenceScore = 10;

  // Penalize generic emails
  if (prospect.email) {
    const domain = prospect.email.split("@")[1]?.toLowerCase();
    if (domain && GENERIC_EMAIL_DOMAINS.includes(domain)) {
      confidenceScore = Math.max(0, confidenceScore - 15);
    }
  }

  // ── Risk Score ────────────────────────────────────────────────────────────
  let riskScore = 0;

  // Check for duplicates
  const duplicates = await detectPotentialDuplicates(
    prospect.email || undefined,
    prospect.website || undefined
  );
  const otherDuplicates = duplicates.filter(d => d.id !== prospect.id);
  if (otherDuplicates.length > 0) riskScore += 30;

  // DO_NOT_CONTACT flag
  if (prospect.isDoNotContact) riskScore += 40;

  // Generic email
  if (prospect.email) {
    const domain = prospect.email.split("@")[1]?.toLowerCase();
    if (domain && GENERIC_EMAIL_DOMAINS.includes(domain)) riskScore += 15;
  }

  // No source
  if (!prospect.sourceUrl && !prospect.sourceName) riskScore += 10;

  // Already a customer
  if (prospect.status === "CUSTOMER") riskScore += 20;

  // Low data quality
  if (qualityScore < 30) riskScore += 10;

  riskScore = Math.min(100, riskScore);

  // ── Build AI notes ────────────────────────────────────────────────────────
  const notes: string[] = [];
  if (qualityScore >= 70) notes.push("Datos completos y de alta calidad.");
  else if (qualityScore >= 40) notes.push("Datos parciales, se recomienda completar.");
  else notes.push("Datos insuficientes para evaluación confiable.");

  if (fitScore >= 80) notes.push("Empresa del rubro inmobiliario core, alta compatibilidad con RaicesPilot.");
  else if (fitScore >= 50) notes.push("Rubro relacionado, compatibilidad media.");
  else notes.push("Rubro no principal, evaluar caso individual.");

  if (riskScore >= 50) notes.push("⚠ Riesgo elevado: revisar antes de cualquier contacto.");
  if (otherDuplicates.length > 0) notes.push(`Posible duplicado con ${otherDuplicates.length} registro(s).`);

  const aiScoringNotes = notes.join(" ");

  return prisma.commercialProspect.update({
    where: { id },
    data: {
      qualityScore,
      fitScore,
      confidenceScore,
      riskScore,
      aiScoringNotes,
    }
  });
}

/**
 * Returns true if the prospect is eligible for email generation based on
 * manual qualification rules.
 */
export function canGenerateEmail(prospect: {
  isDoNotContact: boolean;
  manualStatus: string | null;
  status: string;
}): { allowed: boolean; reason: string } {
  if (prospect.isDoNotContact) {
    return { allowed: false, reason: "Prospecto marcado como 'No contactar'" };
  }
  if (prospect.manualStatus === "NO_CONTACTAR") {
    return { allowed: false, reason: "Estado manual: No contactar" };
  }
  if (prospect.manualStatus === "DESCARTAR") {
    return { allowed: false, reason: "Prospecto descartado" };
  }
  if (prospect.manualStatus === "REVISAR") {
    return { allowed: false, reason: "Pendiente de revisión manual" };
  }
  if (prospect.status === "DISCARDED" || prospect.status === "DO_NOT_CONTACT") {
    return { allowed: false, reason: "Estado del prospecto no permite contacto" };
  }
  // Only APTO_CONTACTO, CONTACTAR_MAS_ADELANTE (if date passed), or no manual status with APPROVED/CONTACT_READY
  if (prospect.manualStatus === "APTO_CONTACTO") {
    return { allowed: true, reason: "" };
  }
  if (prospect.status === "APPROVED" || prospect.status === "CONTACT_READY") {
    return { allowed: true, reason: "" };
  }
  return { allowed: false, reason: "El prospecto debe ser aprobado manualmente antes de generar emails" };
}
