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
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents,
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    surfaceM2: property.surfaceM2,
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
      ownerName: lead.owner?.fullName ?? "Unassigned",
    }));
  const visits = property.visits.map((visit) => ({
    id: visit.id,
    scheduledAt: visit.scheduledAt.toISOString(),
    status: visit.status,
    leadName: visit.lead?.fullName ?? "Unknown lead",
  }));

  return {
    id: property.id,
    title: property.title,
    address: property.address,
    city: property.city,
    neighborhood: property.neighborhood,
    propertyType: property.propertyType,
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents,
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    surfaceM2: property.surfaceM2,
    latitude: property.latitude ? Number(property.latitude) : undefined,
    longitude: property.longitude ? Number(property.longitude) : undefined,
    interestedLeads,
    visits,
    organizationSlug: property.organization.slug,
  };
}

export async function listPublicProperties() {
  return prisma.property.findMany({
    where: {
      publicVisible: true,
    },
    orderBy: [{ organizationId: "asc" }, { createdAt: "desc" }],
    take: 400,
  }).then((properties) =>
    properties.map((property) => ({
      id: property.id,
      title: property.title,
      address: property.address,
      city: property.city,
      neighborhood: property.neighborhood,
      propertyType: property.propertyType,
      status: property.status,
      publicVisible: property.publicVisible,
      priceCents: property.priceCents,
      currency: property.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      surfaceM2: property.surfaceM2,
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
