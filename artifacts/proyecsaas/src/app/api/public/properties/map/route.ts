import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

// Deterministic ofuscation helper to prevent markers from "jumping" on every request
function getDeterministicOffset(id: string): { offsetLat: number; offsetLng: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Angle in radians (0 to 2*PI)
  const angle = Math.abs(hash % 360) * (Math.PI / 180);
  
  // Distance in meters between 100m and 250m
  const distanceMeters = 100 + (Math.abs(hash >> 8) % 150);
  
  // Offset calculations based on 111,111m per degree latitude
  const offsetLat = (distanceMeters * Math.cos(angle)) / 111111;
  const offsetLng = (distanceMeters * Math.sin(angle)) / (111111 * Math.cos(-34.6 * Math.PI / 180));
  
  return { offsetLat, offsetLng };
}

// Build standard Prisma filters from URL search params
function buildFilters(searchParams: URLSearchParams) {
  const filters: any = {
    publicVisible: true,
    status: "AVAILABLE",
    latitude: { not: null },
    longitude: { not: null },
  };

  // Operation Type
  const operation = searchParams.get("operation");
  if (operation) {
    filters.operationType = operation;
  }

  // Property Type
  const propertyType = searchParams.get("propertyType");
  if (propertyType) {
    filters.propertyType = {
      contains: propertyType,
      mode: "insensitive",
    };
  }

  // Price Filters (in Cents)
  const minPrice = searchParams.get("minPrice");
  if (minPrice) {
    const minCents = parseFloat(minPrice) * 100;
    if (!isNaN(minCents)) {
      filters.priceCents = { ...filters.priceCents, gte: Math.round(minCents) };
    }
  }
  const maxPrice = searchParams.get("maxPrice");
  if (maxPrice) {
    const maxCents = parseFloat(maxPrice) * 100;
    if (!isNaN(maxCents)) {
      filters.priceCents = { ...filters.priceCents, lte: Math.round(maxCents) };
    }
  }

  // Bedrooms & Bathrooms
  const bedrooms = searchParams.get("bedrooms");
  if (bedrooms) {
    const bedsNum = parseInt(bedrooms, 10);
    if (!isNaN(bedsNum)) {
      filters.bedrooms = { gte: bedsNum };
    }
  }
  const bathrooms = searchParams.get("bathrooms");
  if (bathrooms) {
    const bathsNum = parseInt(bathrooms, 10);
    if (!isNaN(bathsNum)) {
      filters.bathrooms = { gte: bathsNum };
    }
  }

  // Tour 360
  const tour360 = searchParams.get("tour360");
  if (tour360 === "true") {
    filters.panoramas = {
      some: {},
    };
  }

  // Org Slug
  const orgSlug = searchParams.get("orgSlug");
  if (orgSlug) {
    filters.organization = {
      slug: orgSlug,
    };
  }

  // Viewport Bounding Box: swLng,swLat,neLng,neLat
  const bounds = searchParams.get("bounds");
  if (bounds) {
    const coords = bounds.split(",").map(Number);
    if (coords.length === 4 && coords.every((c) => !isNaN(c))) {
      const [swLng, swLat, neLng, neLat] = coords;
      filters.latitude = {
        ...filters.latitude,
        gte: swLat,
        lte: neLat,
      };
      filters.longitude = {
        ...filters.longitude,
        gte: swLng,
        lte: neLng,
      };
    }
  }

  return filters;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = buildFilters(searchParams);

    // Select legacy-safe. Evita P2022 en DB Railway legacy.
    // showExactLocation y province no existen en la DB legacy — se omiten del select.
    // showExact siempre false (ver mapeo abajo) → coordenadas siempre ofuscadas.
    const rawProperties = await prisma.property.findMany({
      where: filters,
      select: {
        id: true,
        title: true,
        priceCents: true,
        currency: true,
        operationType: true,
        propertyType: true,
        bedrooms: true,
        bathrooms: true,
        surfaceM2: true,
        latitude: true,
        longitude: true,
        neighborhood: true,
        city: true,
        organization: {
          select: {
            slug: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        panoramas: {
          take: 1,
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Format properties and apply geo-privacy rules
    const markers = rawProperties.map((prop) => {
      // Safe checks for arrays
      const primaryImage = prop.images && prop.images[0] ? prop.images[0].url : null;
      const hasTour360 = prop.panoramas && prop.panoramas.length > 0;
      
      // showExactLocation no existe en DB Railway legacy → siempre ofuscado.
      const realLat = Number(prop.latitude);
      const realLng = Number(prop.longitude);

      const { offsetLat, offsetLng } = getDeterministicOffset(prop.id);
      const lat = Number((realLat + offsetLat).toFixed(6));
      const lng = Number((realLng + offsetLng).toFixed(6));

      const generalParts = [prop.neighborhood, prop.city].filter(Boolean);
      const locationLabel = generalParts.length > 0
        ? `Zona aproximada en ${generalParts.join(", ")}`
        : "Zona aproximada";

      return {
        id: prop.id,
        orgSlug: prop.organization.slug,
        title: prop.title,
        priceCents: prop.priceCents,
        currency: prop.currency ?? "USD",
        operationType: prop.operationType,
        propertyType: prop.propertyType,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        surfaceM2: prop.surfaceM2,
        hasTour360,
        approximate: true,
        latitude: lat,
        longitude: lng,
        locationLabel,
        imageUrl: primaryImage,
        url: `/cat/${prop.organization.slug}/${prop.id}`,
      };
    });

    return NextResponse.json(markers);
  } catch (error: any) {
    console.error("[api/public/properties/map] Error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al cargar los marcadores." },
      { status: 500 }
    );
  }
}
