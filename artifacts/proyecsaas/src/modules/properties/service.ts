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
    where: {
      organization: {
        slug: orgSlug,
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
      panoramas: {
        orderBy: { sortOrder: "asc" },
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
    category: img.category,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  }));

  const panoramas = property.panoramas.map((pan) => ({
    id: pan.id,
    url: pan.url,
    label: pan.label,
    direction: pan.direction,
    roomName: pan.roomName,
    floor: pan.floor,
    positionX: pan.positionX,
    positionY: pan.positionY,
    positionZ: pan.positionZ,
    connections: parsePanoramaConnections(pan.connections),
    sortOrder: pan.sortOrder,
    initialYaw: pan.initialYaw,
    initialPitch: pan.initialPitch,
    initialHfov: pan.initialHfov,
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
    panoramas,
    organizationSlug: property.organization.slug,
  };
}

function parsePanoramaConnections(value: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function listPublicProperties() {
  return prisma.property
    .findMany({
      where: {
        publicVisible: true,
      },
      orderBy: [{ organizationId: "asc" }, { createdAt: "desc" }],
      take: 400,
    })
    .then((properties) =>
      properties.map((property) => ({
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
      })),
    );
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
