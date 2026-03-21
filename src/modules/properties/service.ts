import "server-only";

import { PropertyStatus } from "@prisma/client";

import {
  getDemoOrganizationById,
  getDemoOrganizationBySlug,
  getDemoPropertyById,
  getDemoPublicPropertyById,
  listDemoLeadsByOrganization,
  listDemoPropertiesByOrganization,
  listDemoPublicProperties,
  listDemoUsersByOrganization,
  listDemoVisitsByProperty,
} from "@/server/demo/workspace-store";

import type {
  PropertyDetail,
  PropertyListItem,
  PropertySummary,
} from "@/modules/properties/types";

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

export async function getPropertyDetail(
  orgSlug: string,
  propertyId: string,
): Promise<PropertyDetail | null> {
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return null;
  }

  const property = getDemoPropertyById(organization.id, propertyId);

  if (!property) {
    return null;
  }

  const users = listDemoUsersByOrganization(organization.id);
  const interestedLeads = listDemoLeadsByOrganization(organization.id)
    .filter((lead) => lead.propertyId === property.id)
    .map((lead) => ({
      id: lead.id,
      fullName: lead.fullName,
      status: lead.status,
      ownerName:
        users.find((user) => user.id === lead.ownerId)?.fullName ?? "Unassigned",
    }));
  const visits = listDemoVisitsByProperty(organization.id, property.id).map((visit) => ({
    id: visit.id,
    scheduledAt: visit.scheduledAt,
    status: visit.status,
    leadName:
      listDemoLeadsByOrganization(organization.id).find((lead) => lead.id === visit.leadId)
        ?.fullName ?? "Unknown lead",
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
    latitude: property.latitude,
    longitude: property.longitude,
    interestedLeads,
    visits,
    organizationSlug: organization.slug,
  };
}

export async function listPublicProperties() {
  return listDemoPublicProperties();
}

export async function getPublicPropertyDetail(propertyId: string): Promise<PropertyDetail | null> {
  const property = getDemoPublicPropertyById(propertyId);

  if (!property) {
    return null;
  }

  const organization = getDemoOrganizationById(property.organizationId);

  if (!organization) {
    return null;
  }

  return getPropertyDetail(organization.slug, property.id);
}
