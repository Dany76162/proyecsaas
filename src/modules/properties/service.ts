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
  });

  return properties.map((property) => ({
    id: property.id,
    title: property.title,
    address: property.address ?? "Address pending",
    city: property.city ?? "Unknown city",
    neighborhood: property.neighborhood ?? "Area pending",
    propertyType: property.propertyType ?? "Property",
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents ?? 0,
    currency: property.currency ?? "USD",
    bedrooms: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    surfaceM2: property.surfaceM2 ?? 0,
  }));
}

export async function getPropertySummary(
  orgSlug: string,
): Promise<PropertySummary> {
  const properties = await listOrganizationProperties(orgSlug);
  const totalTicket = properties.reduce((sum, property) => sum + property.priceCents, 0);

  return {
    total: properties.length,
    availableCount: properties.filter((property) => property.status === PropertyStatus.AVAILABLE)
      .length,
    publicCount: properties.filter((property) => property.publicVisible).length,
    averageTicketCents: properties.length ? Math.round(totalTicket / properties.length) : 0,
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
      },
      visits: {
        include: {
          lead: true,
        },
        orderBy: {
          scheduledAt: "asc",
        },
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
    address: property.address ?? "Address pending",
    city: property.city ?? "Unknown city",
    neighborhood: property.neighborhood ?? "Area pending",
    propertyType: property.propertyType ?? "Property",
    status: property.status,
    publicVisible: property.publicVisible,
    priceCents: property.priceCents ?? 0,
    currency: property.currency ?? "USD",
    bedrooms: property.bedrooms ?? 0,
    bathrooms: property.bathrooms ?? 0,
    surfaceM2: property.surfaceM2 ?? 0,
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
  }).then((properties) =>
    properties.map((property) => ({
      id: property.id,
      title: property.title,
      address: property.address ?? "Address pending",
      city: property.city ?? "Unknown city",
      neighborhood: property.neighborhood ?? "Area pending",
      propertyType: property.propertyType ?? "Property",
      status: property.status,
      publicVisible: property.publicVisible,
      priceCents: property.priceCents ?? 0,
      currency: property.currency ?? "USD",
      bedrooms: property.bedrooms ?? 0,
      bathrooms: property.bathrooms ?? 0,
      surfaceM2: property.surfaceM2 ?? 0,
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
