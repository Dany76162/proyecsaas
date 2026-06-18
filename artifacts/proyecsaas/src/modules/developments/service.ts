import "server-only";

import { prisma } from "@/server/db/prisma";
import type { DevelopmentListItem, DevelopmentDetail } from "./types";

export async function listOrganizationDevelopments(
  orgSlug: string,
): Promise<DevelopmentListItem[]> {
  const rows = await prisma.development.findMany({
    where: { Organization: { slug: orgSlug } },
    select: {
      id: true,
      name: true,
      description: true,
      city: true,
      status: true,
      publicVisible: true,
      logoUrl: true,
      themeColor: true,
      createdAt: true,
      _count: { select: { DevelopmentLot: true } },
      DevelopmentLot: {
        where: { status: "AVAILABLE" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    city: r.city,
    status: r.status,
    publicVisible: r.publicVisible,
    lotCount: r._count.DevelopmentLot,
    availableCount: r.DevelopmentLot.length,
    logoUrl: r.logoUrl,
    themeColor: r.themeColor,
    createdAt: r.createdAt,
  }));
}

export async function getDevelopmentDetail(
  orgSlug: string,
  developmentId: string,
): Promise<DevelopmentDetail | null> {
  const dev = await prisma.development.findFirst({
    where: {
      id: developmentId,
      Organization: { slug: orgSlug },
    },
    include: {
      DevelopmentLot: {
        orderBy: { lotNumber: "asc" },
        select: {
          id: true,
          lotNumber: true,
          status: true,
          pathData: true,
          centerX: true,
          centerY: true,
          areaSqm: true,
          priceCents: true,
          currency: true,
        },
      },
    },
  });

  if (!dev) return null;

  return {
    id: dev.id,
    organizationId: dev.organizationId,
    name: dev.name,
    description: dev.description,
    address: dev.address,
    city: dev.city,
    province: dev.province,
    country: dev.country,
    status: dev.status,
    publicVisible: dev.publicVisible,
    masterplanSVG: dev.masterplanSVG,
    masterplanSourceUrl: dev.masterplanSourceUrl,
    masterplanSourceKind: dev.masterplanSourceKind,
    latitude: dev.latitude ? Number(dev.latitude) : null,
    longitude: dev.longitude ? Number(dev.longitude) : null,
    lots: dev.DevelopmentLot.map((lot) => ({
      id: lot.id,
      lotNumber: lot.lotNumber,
      status: lot.status,
      pathData: lot.pathData,
      centerX: lot.centerX,
      centerY: lot.centerY,
      areaSqm: lot.areaSqm,
      priceCents: lot.priceCents,
      currency: lot.currency,
    })),
    createdAt: dev.createdAt,
    updatedAt: dev.updatedAt,
  };
}
