import "server-only";

import { PropertyStatus } from "@prisma/client";

import {
  getDemoOrganizationBySlug,
  listDemoPropertiesByOrganization,
  listDemoPublicProperties,
} from "@/server/demo/workspace-store";

import type { PropertyListItem, PropertySummary } from "@/modules/properties/types";

export async function listOrganizationProperties(
  orgSlug: string,
): Promise<PropertyListItem[]> {
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return [];
  }

  return listDemoPropertiesByOrganization(organization.id).map((property) => ({
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

export async function listPublicProperties() {
  return listDemoPublicProperties();
}
