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

export async function detectPotentialDuplicates(email?: string, website?: string, name?: string) {
  const potential: any[] = [];

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

  // Deduplicate by ID
  return Array.from(new Map(potential.map(item => [item.id, item])).values());
}

export async function calculateProspectScores(id: string) {
  const prospect = await prisma.commercialProspect.findUnique({ where: { id } });
  if (!prospect) return;

  let qualityScore = 0;
  
  if (prospect.email) qualityScore += 25;
  if (prospect.website) qualityScore += 20;
  if (prospect.phone || prospect.whatsapp) qualityScore += 15;
  if (prospect.country || prospect.city) qualityScore += 15;
  if (prospect.instagramUrl || prospect.linkedinUrl) qualityScore += 10;
  if (prospect.companyType !== "OTHER_REAL_ESTATE") qualityScore += 15;

  let confidenceScore = 0;
  if (prospect.email && prospect.website && prospect.sourceUrl) confidenceScore = 90;
  else if (prospect.website || prospect.phone) confidenceScore = 60;
  else confidenceScore = 30;

  return prisma.commercialProspect.update({
    where: { id },
    data: {
      qualityScore,
      confidenceScore
    }
  });
}
