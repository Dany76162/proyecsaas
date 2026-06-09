export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  Globe,
  Navigation2,
} from "lucide-react";

import { prisma } from "@/server/db/prisma";
import MasterplanCanvas from "@/components/public/masterplan-canvas";
import LocationShareButton from "@/components/public/location-share-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; developmentId: string }>;
}) {
  const { orgSlug, developmentId } = await params;

  try {
    const dev = await prisma.development.findFirst({
      where: {
        id: developmentId,
        Organization: { slug: orgSlug },
        status: "ACTIVE",
        publicVisible: true,
      },
      select: {
        name: true,
        description: true,
      },
    });

    if (!dev) {
      return { title: "Proyecto — Catálogo" };
    }

    return {
      title: `${dev.name} — Masterplan Interactivo`,
      description:
        dev.description ?? "Explorá la disponibilidad de lotes en tiempo real.",
    };
  } catch (error) {
    console.error(
      "[generateMetadata] Failed to fetch development metadata safely:",
      error
    );
    return { title: "Proyecto — Catálogo" };
  }
}

export default async function PublicDevelopmentDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; developmentId: string }>;
}) {
  const { orgSlug, developmentId } = await params;

  const developmentRaw = await (prisma as any).development.findFirst({
    where: {
      id: developmentId,
      Organization: { slug: orgSlug },
    },
    include: {
      DevelopmentLot: {
        orderBy: { lotNumber: "asc" },
      },
      DevelopmentDrawableLayer: {
        where: { visible: true },
        orderBy: [{ orden: "asc" }, { creadoEn: "asc" }],
      },
    },
  });

  if (
    !developmentRaw ||
    developmentRaw.status !== "ACTIVE" ||
    !developmentRaw.publicVisible
  ) {
    notFound();
  }

  const development = {
    ...developmentRaw,
    lots: developmentRaw.DevelopmentLot,
  };

  const drawableLayers = developmentRaw.DevelopmentDrawableLayer.map((layer: any) => ({
    id: layer.id,
    developmentId: layer.developmentId,
    nombre: layer.nombre,
    tipo: layer.tipo as any,
    orden: layer.orden,
    visible: layer.visible,
    bloqueada: layer.bloqueada,
    geometria: layer.geometria,
    colorRelleno: layer.colorRelleno,
    colorBorde: layer.colorBorde,
    opacidad: layer.opacidad,
    grosorBorde: layer.grosorBorde,
    creadoEn: layer.creadoEn.toISOString(),
    actualizadoEn: layer.actualizadoEn.toISOString(),
  }));

  const organization = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: {
      name: true,
      contactWhatsapp: true,
      contactPhone: true,
      contactEmail: true,
    },
  });

  if (!organization) {
    notFound();
  }

  // Datos de contacto: desarrollo primero, organización como fallback
  const displayPhone = development.contactPhone || organization.contactPhone;
  const displayWeb = development.contactWeb || null;
  const displayAddress = development.contactAddress || null;
  const displayWhatsapp = organization.contactWhatsapp || null;
  const displayEmail = organization.contactEmail || null;

  // Enlace a Google Maps
  let mapsUrl: string | null = null;
  if (development.mapCenterLat && development.mapCenterLng) {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${development.mapCenterLat},${development.mapCenterLng}`;
  } else if (development.city || development.province) {
    const query = [development.city, development.province, development.country]
      .filter(Boolean)
      .join(", ");
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const STATUS_DB_TO_UI: Record<string, string> = {
    AVAILABLE: "DISPONIBLE",
    BLOCKED: "BLOQUEADO",
    RESERVED: "RESERVADA",
    RESERVED_PENDING: "RESERVADA",
    SOLD: "VENDIDA",
  };

  // Resolve stage number for reservation amount lookup
  function getStageNumber(etapaNombre: string | null | undefined): number | null {
    if (!etapaNombre) return null;
    const matchDigit = etapaNombre.match(/[1-5]/);
    if (matchDigit) return parseInt(matchDigit[0], 10);
    const clean = etapaNombre.toUpperCase();
    if (/\bV\b/.test(clean)) return 5;
    if (/\bIV\b/.test(clean)) return 4;
    if (/\bIII\b/.test(clean)) return 3;
    if (/\bII\b/.test(clean)) return 2;
    if (/\bI\b/.test(clean)) return 1;
    return null;
  }

  const stageAmountCentsMap: Record<number, number | null | undefined> = {
    1: development.reservationAmountStage1Cents,
    2: development.reservationAmountStage2Cents,
    3: development.reservationAmountStage3Cents,
    4: development.reservationAmountStage4Cents,
    5: development.reservationAmountStage5Cents,
  };

  const mappedUnits = development.lots.map((lot: any) => ({
    id: lot.id,
    numero: lot.lotNumber,
    superficie: lot.areaSqm,
    frente: null,
    fondo: null,
    precio: lot.priceCents ? lot.priceCents / 100 : null,
    moneda: lot.currency || "USD",
    estado: (STATUS_DB_TO_UI[lot.status] || "DISPONIBLE") as any,
    path: lot.pathData || undefined,
    cx: lot.centerX || undefined,
    cy: lot.centerY || undefined,
    esEsquina: false,
    orientacion: null,
    tipo: "LOTE",
    tour360Url: null,
    manzana: {
      id: "default",
      nombre: lot.manzana || "Sin manzana",
      etapa: {
        id: "default",
        nombre: lot.etapaNombre || "Sin etapa",
      },
    },
    reservationCurrency: development.reservationCurrency ?? null,
    reservationAmountCents: (() => {
      const stage = getStageNumber(lot.etapaNombre);
      return stage != null ? (stageAmountCentsMap[stage] ?? null) : null;
    })(),
  }));

  const hasMap = !!development.overlayBounds;
  const hasTour360 = false;

  // Parse overlay geo-transform for public polygon rendering.
  // The overlay API requires auth — read directly from DB here and pass as a prop
  // so MasterplanMap can draw polygons without calling the auth-gated endpoint.
  type LatLngTuple = [number, number];
  function parsePublicOverlayBounds(raw: string | null) {
    if (!raw) return { bounds: null, corners: null };
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 2 && Array.isArray(parsed[0])) {
        return { bounds: parsed as [LatLngTuple, LatLngTuple], corners: null };
      }
      if (parsed && typeof parsed === "object") {
        return {
          bounds: Array.isArray(parsed.bounds) ? (parsed.bounds as [LatLngTuple, LatLngTuple]) : null,
          corners: Array.isArray(parsed.corners)
            ? (parsed.corners as [LatLngTuple, LatLngTuple, LatLngTuple, LatLngTuple])
            : null,
        };
      }
    } catch {}
    return { bounds: null, corners: null };
  }

  // Extract SVG viewBox with regex (server-safe: no DOMParser).
  // Admin uses this exact viewBox from the blueprint API to normalize SVG coordinates.
  // Public must use the same value or the geo-projection will be displaced.
  function extractSvgViewBoxServer(svgString: string | null): { x: number; y: number; w: number; h: number } | null {
    if (!svgString) return null;
    const m = svgString.match(/\bviewBox=["']([^"']+)["']/);
    if (!m) return null;
    const parts = m[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || parts.some((v) => !isFinite(v))) return null;
    const [x, y, w, h] = parts;
    if (w <= 0 || h <= 0) return null;
    return { x, y, w, h };
  }

  const { bounds: overlayBounds, corners: overlayCorners } = parsePublicOverlayBounds(development.overlayBounds);
  const publicOverlayConfig = overlayBounds
    ? {
        bounds: overlayBounds,
        corners: overlayCorners,
        rotation: development.overlayRotation ?? 0,
        svgViewBox: extractSvgViewBoxServer(development.masterplanSVG),
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#090d1a] via-[#0f172a] to-[#1e293b] px-6 py-10 text-white sm:px-12 shadow-lg border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-7xl w-full px-4 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link
              href={`/cat/${orgSlug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition bg-slate-800/40 border border-slate-700/50 px-3.5 py-1.5 rounded-full backdrop-blur-md"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Ver Catálogo
            </Link>
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-400 backdrop-blur-md flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
              Masterplan Interactivo
            </span>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3 max-w-3xl">
              {/* Logos del desarrollo */}
              {(development.logoUrl || development.companyLogoUrl) && (
                <div className="flex items-center gap-3">
                  {development.logoUrl && (
                    <img
                      src={development.logoUrl}
                      alt={`Logo ${development.name}`}
                      className="h-12 w-auto max-w-[120px] object-contain rounded-lg"
                    />
                  )}
                  {development.companyLogoUrl && (
                    <img
                      src={development.companyLogoUrl}
                      alt={`Logo empresa ${organization.name}`}
                      className="h-10 w-auto max-w-[100px] object-contain rounded-lg opacity-80"
                    />
                  )}
                </div>
              )}

              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 leading-none">
                {organization.name}
              </span>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                {development.name}
              </h1>
              {development.description && (
                <p className="text-sm md:text-base leading-relaxed text-slate-300 font-medium">
                  {development.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {(development.city || development.province) && (
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    {[development.city, development.province]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full"
                  >
                    <Navigation2 className="h-3.5 w-3.5" />
                    Cómo llegar
                  </a>
                )}
                {mapsUrl && (
                  <LocationShareButton
                    url={mapsUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition bg-slate-700/60 border border-slate-600/50 px-3 py-1.5 rounded-full"
                  />
                )}
              </div>
            </div>

            {/* Tarjeta de contacto */}
            <div className="shrink-0 rounded-3xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-md space-y-3.5 w-full max-w-sm shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Consultas &amp; Reservas
              </p>
              <div className="space-y-2.5 text-xs">
                {/* WhatsApp — solo de la organización */}
                {displayWhatsapp && (
                  <a
                    href={`https://wa.me/${displayWhatsapp.replace(/\D/g, "")}?text=Hola!%20Me%20interesa%20el%20desarrollo%20${encodeURIComponent(development.name)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-slate-200 hover:text-white font-bold transition duration-300"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </div>
                    WhatsApp Contacto
                  </a>
                )}

                {/* Teléfono: desarrollo primero, org como fallback */}
                {displayPhone && (
                  <a
                    href={`tel:${displayPhone.replace(/\s/g, "")}`}
                    className="flex items-center gap-3 text-slate-300 hover:text-white font-semibold transition duration-300"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    {displayPhone}
                  </a>
                )}

                {/* Email — de la organización */}
                {displayEmail && (
                  <a
                    href={`mailto:${displayEmail}`}
                    className="flex items-center gap-3 text-slate-300 hover:text-white font-semibold truncate transition duration-300"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    {displayEmail}
                  </a>
                )}

                {/* Sitio web — solo del desarrollo */}
                {displayWeb && (
                  <a
                    href={
                      displayWeb.startsWith("http")
                        ? displayWeb
                        : `https://${displayWeb}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-slate-300 hover:text-white font-semibold truncate transition duration-300"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                      <Globe className="h-3.5 w-3.5" />
                    </div>
                    {displayWeb.replace(/^https?:\/\//, "")}
                  </a>
                )}

                {/* Dirección — solo del desarrollo */}
                {displayAddress && (
                  <div className="flex items-start gap-3 text-slate-400 font-semibold">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 shrink-0">
                      <MapPin className="h-3.5 w-3.5" />
                    </div>
                    <span className="leading-snug">{displayAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Masterplan interactivo */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <MasterplanCanvas
          proyectoId={development.id}
          units={mappedUnits}
          planAsset={development.masterplanSVG}
          mapCenterLat={development.mapCenterLat}
          mapCenterLng={development.mapCenterLng}
          mapZoom={development.mapZoom}
          hasMap={hasMap}
          hasTour360={hasTour360}
          slug={development.id}
          initialOverlayConfig={publicOverlayConfig}
          initialDrawableLayers={drawableLayers}
        />
      </main>
    </div>
  );
}
