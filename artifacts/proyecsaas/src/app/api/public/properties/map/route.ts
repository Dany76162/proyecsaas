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

// Default map center coordinates set by schema — developments at exactly these
// coordinates have never had their location explicitly set by a user.
const DEFAULT_CENTER_LAT = -34.6037;
const DEFAULT_CENTER_LNG = -58.3816;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = buildFilters(searchParams);
    const orgSlug = searchParams.get("orgSlug");

    // showExactLocation ya existe en producción tras la migración
    // 20260614120000_reconcile_property_phase3_columns: se selecciona para
    // decidir entre coordenada exacta y zona aproximada (ver mapeo abajo).
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
        showExactLocation: true,
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

      // showExactLocation === true → coordenada exacta sin offset.
      // false/null → zona aproximada con offset determinístico (privacidad por defecto).
      const realLat = Number(prop.latitude);
      const realLng = Number(prop.longitude);
      const exact = prop.showExactLocation === true;

      let lat: number;
      let lng: number;
      let locationLabel: string;
      const generalParts = [prop.neighborhood, prop.city].filter(Boolean);

      if (exact) {
        lat = Number(realLat.toFixed(6));
        lng = Number(realLng.toFixed(6));
        locationLabel = generalParts.length > 0 ? generalParts.join(", ") : "Ubicación exacta";
      } else {
        const { offsetLat, offsetLng } = getDeterministicOffset(prop.id);
        lat = Number((realLat + offsetLat).toFixed(6));
        lng = Number((realLng + offsetLng).toFixed(6));
        locationLabel = generalParts.length > 0
          ? `Zona aproximada en ${generalParts.join(", ")}`
          : "Zona aproximada";
      }

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
        approximate: !exact,
        latitude: lat,
        longitude: lng,
        locationLabel,
        imageUrl: primaryImage,
        url: `/cat/${prop.organization.slug}/${prop.id}`,
      };
    });

    // ── Development markers ─────────────────────────────────────────────────
    // Include developments that have had their location explicitly set:
    //   • latitude IS NOT NULL → set via the PATCH endpoint (current or future saves)
    //   • OR mapCenterLat differs from schema default → set by user in Paso 5 before
    //     the PATCH endpoint mirrored it to latitude/longitude (existing developments)
    const devWhere: any = {
      status: "ACTIVE",
      publicVisible: true,
      OR: [
        { latitude: { not: null } },
        { mapCenterLat: { not: DEFAULT_CENTER_LAT } },
      ],
    };
    if (orgSlug) {
      devWhere.Organization = { slug: orgSlug };
    }

    const rawDevelopments = await prisma.development.findMany({
      where: devWhere,
      select: {
        id: true,
        name: true,
        city: true,
        province: true,
        latitude: true,
        longitude: true,
        mapCenterLat: true,
        mapCenterLng: true,
        logoUrl: true,
        Organization: { select: { slug: true, name: true } },
      },
      take: 50,
    });

    // Development markers are NOT filtered by viewport bounds.
    // Unlike properties (which can number in the hundreds), there are typically very few
    // developments (≤50). MapLibre places their markers at the exact coordinates and
    // renders them naturally as the user pans — no "Buscar en esta zona" click required.
    // Filtering by bounds here would hide them from the initial load, causing them to
    // never appear until an explicit search action.
    const devMarkers = rawDevelopments
      .map((dev) => {
        // Prefer explicit latitude/longitude (Decimal); fall back to mapCenter
        const lat = dev.latitude != null ? Number(dev.latitude) : (dev.mapCenterLat ?? null);
        const lng = dev.longitude != null ? Number(dev.longitude) : (dev.mapCenterLng ?? null);
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const locationParts = [dev.city, dev.province].filter(Boolean);
        const locationLabel = locationParts.length > 0 ? locationParts.join(", ") : "";

        return {
          id: dev.id,
          orgSlug: dev.Organization.slug,
          title: dev.name,
          priceCents: null as null,
          currency: "USD",
          operationType: "EMPRENDIMIENTO",
          propertyType: "emprendimiento",
          bedrooms: null as null,
          bathrooms: null as null,
          surfaceM2: null as null,
          hasTour360: false,
          // Developments have public general locations — no geo-privacy offset
          approximate: false,
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          locationLabel,
          imageUrl: dev.logoUrl ?? null,
          url: `/cat/${dev.Organization.slug}/developments/${dev.id}`,
          markerKind: "development" as const,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);

    return NextResponse.json([...markers, ...devMarkers]);
  } catch (error: any) {
    console.error("[api/public/properties/map] Error:", error);
    return NextResponse.json(
      { error: "Ocurrió un error inesperado al cargar los marcadores." },
      { status: 500 }
    );
  }
}
