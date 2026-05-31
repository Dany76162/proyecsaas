import "server-only";

import { PropertyStatus } from "@prisma/client";

import { prisma } from "@/server/db/prisma";

import type {
  PropertyDetail,
  PropertyListItem,
  PropertySummary,
  PublicCatalogProperty,
} from "@/modules/properties/types";

type PropertyFloorPlanRow = {
  floorPlanUrl: string | null;
};

type PropertyPanoramaRow = {
  id: string;
  url: string;
  label: string | null;
  direction: string | null;
  roomName: string | null;
  floor: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  connections: string | null;
  sortOrder: number;
  initialYaw: number;
  initialPitch: number;
  initialHfov: number;
  hotspotPitch: number | null;
  hotspotYaw: number | null;
};

type PropertyImageRow = {
  id: string;
  url: string;
  altText: string | null;
  category: "PANORAMA" | "REAL" | "RENDER" | "PROGRESS";
  sortOrder: number;
  isPrimary: boolean;
};

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
    select: {
      id: true,
      organizationId: true,
      title: true,
      description: true,
      address: true,
      city: true,
      neighborhood: true,
      propertyType: true,
      operationType: true,
      status: true,
      publicVisible: true,
      priceCents: true,
      currency: true,
      expensesCents: true,
      rooms: true,
      bedrooms: true,
      bathrooms: true,
      surfaceM2: true,
      parkingSpots: true,
      amenities: true,
      externalLink: true,
      videoUrl: true,
      latitude: true,
      longitude: true,
      organization: true,
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

  const [floorPlanUrl, imageRows, panoramaRows] = await Promise.all([
    getPropertyFloorPlanUrl(property.id),
    listPropertyImages(property.id, property.organizationId),
    listPropertyPanoramas(property.id, property.organizationId),
  ]);

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

  const images = imageRows.map((img) => ({
    id: img.id,
    url: img.url,
    altText: img.altText,
    category: img.category,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  }));

  const panoramas = panoramaRows.map((pan) => ({
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
    hotspotPitch: pan.hotspotPitch,
    hotspotYaw: pan.hotspotYaw,
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
    floorPlanUrl,
    latitude: property.latitude ? Number(property.latitude) : undefined,
    longitude: property.longitude ? Number(property.longitude) : undefined,
    interestedLeads,
    visits,
    images,
    panoramas,
    organizationSlug: property.organization.slug,
  };
}

async function listPropertyImages(
  propertyId: string,
  organizationId: string,
): Promise<PropertyImageRow[]> {
  try {
    return await prisma.$queryRaw<PropertyImageRow[]>`
      SELECT
        "id",
        "url",
        "altText",
        "category",
        "sortOrder",
        "isPrimary"
      FROM "PropertyImage"
      WHERE "propertyId" = ${propertyId}
        AND "organizationId" = ${organizationId}
      ORDER BY "isPrimary" DESC, "sortOrder" ASC, "createdAt" ASC
    `;
  } catch (error) {
    if (!isMissingSchemaFieldError(error)) {
      throw error;
    }

    return prisma.$queryRaw<PropertyImageRow[]>`
      SELECT
        "id",
        "url",
        "altText",
        'REAL' AS "category",
        "sortOrder",
        "isPrimary"
      FROM "PropertyImage"
      WHERE "propertyId" = ${propertyId}
        AND "organizationId" = ${organizationId}
      ORDER BY "isPrimary" DESC, "sortOrder" ASC, "createdAt" ASC
    `;
  }
}

async function getPropertyFloorPlanUrl(propertyId: string) {
  try {
    const [floorPlan] = await prisma.$queryRaw<PropertyFloorPlanRow[]>`
      SELECT "floorPlanUrl"
      FROM "Property"
      WHERE "id" = ${propertyId}
      LIMIT 1
    `;

    return floorPlan?.floorPlanUrl ?? null;
  } catch (error) {
    if (isMissingSchemaFieldError(error)) {
      return null;
    }

    throw error;
  }
}

async function listPropertyPanoramas(
  propertyId: string,
  organizationId: string,
): Promise<PropertyPanoramaRow[]> {
  try {
    return await prisma.$queryRaw<PropertyPanoramaRow[]>`
      SELECT
        "id",
        "url",
        "label",
        "direction",
        "roomName",
        "floor",
        "positionX",
        "positionY",
        "positionZ",
        "connections",
        "sortOrder",
        "initialYaw",
        "initialPitch",
        "initialHfov",
        "hotspotPitch",
        "hotspotYaw"
      FROM "PropertyPanorama"
      WHERE "propertyId" = ${propertyId}
        AND "organizationId" = ${organizationId}
      ORDER BY "sortOrder" ASC
    `;
  } catch (error) {
    if (isMissingSchemaFieldError(error)) {
      return [];
    }

    throw error;
  }
}

function isMissingSchemaFieldError(error: unknown) {
  const details = error instanceof Error ? error.message : String(error);

  return (
    details.includes("does not exist") ||
    details.includes("column") ||
    details.includes("relation")
  );
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

export async function listPublicPropertiesByOrgSlug(
  orgSlug: string,
): Promise<PublicCatalogProperty[]> {
  const properties = await prisma.property.findMany({
    where: {
      organization: {
        slug: orgSlug,
      },
      publicVisible: true,
      status: "AVAILABLE",
    },
    include: {
      images: {
        select: {
          id: true,
          url: true,
          isPrimary: true,
        },
      },
      panoramas: {
        select: {
          id: true,
          url: true,
          roomName: true,
          label: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
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
    images: property.images,
    panoramas: property.panoramas,
  }));
}

