import "server-only";

import { PropertyStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

import type {
  PropertyDetail,
  PropertyListItem,
  PropertySummary,
} from "@/modules/properties/types";

export async function listOrganizationProperties(
  orgSlug: string,
): Promise<PropertyListItem[]> {
  const properties = await prisma.property.findMany({
    where: { organization: { slug: orgSlug } },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: [{ publicVisible: "desc" }, { createdAt: "desc" }],
    take: 400,
  });

  return properties.map((property) => ({
    id: property.id,
    title: property.title,
    address: property.address,
    city: property.city,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    operationType: property.operationType,
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents,
    currency: property.currency,
    expensesCents: property.expensesCents,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    surfaceM2: property.surfaceM2,
    parkingSpots: property.parkingSpots,
    thumbnailUrl: property.images[0]?.url ?? null,
  }));
}

export async function getPropertySummary(
  orgSlug: string,
): Promise<PropertySummary> {
  const orgWhere = { organization: { slug: orgSlug } };
  const [total, availableCount, publicCount, aggregate] = await Promise.all([
    prisma.property.count({ where: orgWhere }),
    prisma.property.count({ where: { ...orgWhere, status: PropertyStatus.AVAILABLE } }),
    prisma.property.count({ where: { ...orgWhere, publicVisible: true } }),
    prisma.property.aggregate({ where: orgWhere, _avg: { priceCents: true } }),
  ]);

  return {
    total,
    availableCount,
    publicCount,
    averageTicketCents: Math.round(aggregate._avg.priceCents ?? 0),
  };
}

export async function getPropertyDetail(
  orgSlug: string,
  propertyId: string,
): Promise<PropertyDetail | null> {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      organization: {
        slug: orgSlug,
      },
    },
    include: {
      organization: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
      interestedLeads: {
        include: {
          owner: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 50,
      },
      visits: {
        include: {
          lead: true,
        },
        orderBy: {
          scheduledAt: "asc",
        },
        take: 50,
      },
    },
  });

  if (!property) {
    return null;
  }

  const interestedLeads = property.interestedLeads.map((lead) => ({
    id: lead.id,
    fullName: lead.fullName,
    status: lead.status,
    ownerName: lead.owner?.fullName ?? "Sin asignar",
  }));

  const visits = property.visits.map((visit) => ({
    id: visit.id,
    scheduledAt: visit.scheduledAt.toISOString(),
    status: visit.status,
    leadName: visit.lead?.fullName ?? "Lead desconocido",
  }));

  const images = property.images.map((img) => ({
    id: img.id,
    url: img.url,
    altText: img.altText,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  }));

  return {
    id: property.id,
    title: property.title,
    description: property.description,
    address: property.address,
    city: property.city,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    operationType: property.operationType,
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents,
    currency: property.currency,
    expensesCents: property.expensesCents,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    surfaceM2: property.surfaceM2,
    parkingSpots: property.parkingSpots,
    amenities: property.amenities,
    externalLink: property.externalLink,
    videoUrl: property.videoUrl,
    latitude: property.latitude ? Number(property.latitude) : undefined,
    longitude: property.longitude ? Number(property.longitude) : undefined,
    interestedLeads,
    visits,
    images,
    organizationSlug: property.organization.slug,
  };
}

export async function listPublicProperties(q?: string) {
  const properties = await prisma.property.findMany({
    where: {
      publicVisible: true,
      ...(q
        ? {
            OR: [
              { city: { contains: q, mode: "insensitive" } },
              { neighborhood: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: [{ organizationId: "asc" }, { createdAt: "desc" }],
    take: 400,
  });

  return properties.map((property) => ({
    id: property.id,
    title: property.title,
    address: property.address,
    city: property.city,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    operationType: property.operationType,
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents,
    currency: property.currency,
    expensesCents: property.expensesCents,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    surfaceM2: property.surfaceM2,
    parkingSpots: property.parkingSpots,
    thumbnailUrl: property.images[0]?.url ?? null,
  }));
}

export async function getPublicOrgForCatalog(orgSlug: string) {
  return prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, name: true, slug: true },
  });
}

export async function listPublicPropertiesByOrg(orgSlug: string, q?: string) {
  const properties = await prisma.property.findMany({
    where: {
      publicVisible: true,
      organization: { slug: orgSlug },
      ...(q
        ? {
            OR: [
              { city: { contains: q, mode: "insensitive" } },
              { neighborhood: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 400,
  });

  return properties.map((property) => ({
    id: property.id,
    title: property.title,
    address: property.address,
    city: property.city,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    operationType: property.operationType,
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents,
    currency: property.currency,
    expensesCents: property.expensesCents,
    rooms: property.rooms,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    surfaceM2: property.surfaceM2,
    parkingSpots: property.parkingSpots,
    thumbnailUrl: property.images[0]?.url ?? null,
  }));
}

export async function getPublicPropertyDetail(propertyId: string): Promise<PropertyDetail | null> {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      publicVisible: true,
    },
    select: {
      id: true,
      organization: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!property) {
    return null;
  }

  return getPropertyDetail(property.organization.slug, property.id);
}
