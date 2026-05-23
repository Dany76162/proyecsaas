export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
 
const WA_SVG = (
  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
 
function formatPrice(cents: number | null, currency: string | null): string {
  if (!cents) return "Consultar precio";
  const amount = cents / 100;
  const cur = currency ?? "USD";
  if (cur === "USD") return `USD ${amount.toLocaleString("es-AR")}`;
  return `$ ${amount.toLocaleString("es-AR")}`;
}
 
export default async function PublicCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ op?: string; tour?: string }>;
}) {
  const { orgSlug } = await params;
  const { op, tour } = await searchParams;
 
  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, isActive: true },
    select: {
      name: true,
      description: true,
      contactWhatsapp: true,
      contactEmail: true,
    },
  });
  if (!org) notFound();
 
  const properties = await prisma.property.findMany({
    where: {
      organization: { slug: orgSlug },
      status: "AVAILABLE",
      publicVisible: true,
      ...(op ? { operationType: op } : {}),
      ...(tour === "1" ? { panoramas: { some: {} } } : {}),
    },
    orderBy: [{ operationType: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      address: true,
      neighborhood: true,
      city: true,
      propertyType: true,
      operationType: true,
      priceCents: true,
      currency: true,
      bedrooms: true,
      bathrooms: true,
      surfaceM2: true,
      externalLink: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      _count: { select: { panoramas: true } },
    },
  });
 
  const whatsappBase = org.contactWhatsapp
    ? `https://wa.me/${org.contactWhatsapp.replace(/\D/g, "")}`
    : null;
 
  const filterLink = (params: Record<string, string>) => {
    const q = new URLSearchParams(params).toString();
    return `/${orgSlug}/catalog${q ? `?${q}` : ""}`;
  };
 
  const chip = (active: boolean, color: "white" | "blue" | "emerald" | "indigo") => {
    const base = "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border";
    const colors = {
      white: active ? "bg-white/10 text-white border-white/20" : "text-white/40 border-transparent hover:text-white/60",
      blue: active ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "text-white/40 border-transparent hover:text-white/60",
      emerald: active ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "text-white/40 border-transparent hover:text-white/60",
      indigo: active ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" : "text-white/40 border-transparent hover:text-white/60",
    };
    return `${base} ${colors[color]}`;
  };
 
  return (
    <div className="min-h-screen bg-[#07070E] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-7 sm:px-10">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">
          Catálogo de propiedades
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{org.name}</h1>
        {org.description && (
          <p className="mt-1.5 max-w-xl text-sm text-white/40">{org.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2.5">
          {whatsappBase && (
            <a
              href={`${whatsappBase}?text=${encodeURIComponent("Hola! Vi su catálogo de propiedades y quisiera consultar.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              {WA_SVG}
              Consultar por WhatsApp
            </a>
          )}
          {org.contactEmail && (
            <a
              href={`mailto:${org.contactEmail}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10"
            >
              {org.contactEmail}
            </a>
          )}
        </div>
      </div>
 
      {/* Filter bar */}
      <div className="border-b border-white/[0.06] px-6 py-3 sm:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <a href={filterLink({})} className={chip(!op && !tour, "white")}>Todas</a>
          <a href={filterLink({ op: "Venta" })} className={chip(op === "Venta", "blue")}>Venta</a>
          <a href={filterLink({ op: "Alquiler" })} className={chip(op === "Alquiler", "emerald")}>Alquiler</a>
          <a href={filterLink({ tour: "1" })} className={`${chip(tour === "1", "indigo")} flex items-center gap-1.5`}>
            <span>🔄</span> Con Tour 360°
          </a>
          <span className="ml-auto text-xs text-white/25">
            {properties.length} {properties.length === 1 ? "propiedad" : "propiedades"}
          </span>
        </div>
      </div>
 
      {/* Grid */}
      <div className="px-6 py-7 sm:px-10">
        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <p className="mb-4 text-5xl">🏘️</p>
            <p className="text-base font-semibold">No hay propiedades disponibles</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((prop) => {
              const image = prop.images[0]?.url;
              const hasTour = prop._count.panoramas > 0;
              const details = [
                prop.bedrooms ? `${prop.bedrooms} dorm.` : null,
                prop.bathrooms ? `${prop.bathrooms} baños` : null,
                prop.surfaceM2 ? `${prop.surfaceM2} m²` : null,
              ].filter(Boolean);
              const contactMsg = `Hola! Me interesa la propiedad: ${prop.title}${prop.address ? ` (${prop.address})` : ""}. ¿Pueden darme más información?`;
 
              return (
                <div
                  key={prop.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.03] transition-colors hover:border-white/[0.14]"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-white/[0.04]">
                    {image ? (
                      <img
                        src={image}
                        alt={prop.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl text-white/10">🏠</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {hasTour && (
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-300 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Tour 360°
                      </div>
                    )}
                    {prop.operationType && (
                      <div className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm ${prop.operationType === "Venta" ? "border border-blue-500/30 bg-blue-500/20 text-blue-300" : "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300"}`}>
                        {prop.operationType}
                      </div>
                    )}
                  </div>
 
                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {prop.propertyType && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{prop.propertyType}</p>
                    )}
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">{prop.title}</h3>
                    {(prop.neighborhood || prop.city) && (
                      <p className="flex items-center gap-1 text-xs text-white/35">
                        📍 {[prop.neighborhood, prop.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {details.length > 0 && (
                      <p className="text-xs text-white/30">{details.join(" · ")}</p>
                    )}
                    <p className="mt-auto pt-2 text-lg font-semibold text-white">
                      {formatPrice(prop.priceCents, prop.currency)}
                    </p>
                  </div>
 
                  {/* Actions */}
                  <div className="flex gap-2 border-t border-white/[0.06] p-3">
                    {whatsappBase && (
                      <a
                        href={`${whatsappBase}?text=${encodeURIComponent(contactMsg)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400"
                      >
                        {WA_SVG} Consultar
                      </a>
                    )}
                    {hasTour && (
                      <a
                        href={`/map/${prop.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/20 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/30"
                      >
                        🔄 Ver Tour
                      </a>
                    )}
                    {prop.externalLink && (
                      <a
                        href={prop.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center rounded-lg border border-white/10 py-2 text-xs text-white/50 transition hover:bg-white/5"
                      >
                        Ver más
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
 
      <div className="py-8 text-center text-[11px] text-white/15">
        Catálogo generado con RaicesPilot
      </div>
    </div>
  );
}
