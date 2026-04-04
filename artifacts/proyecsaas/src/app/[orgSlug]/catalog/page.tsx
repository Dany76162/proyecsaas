import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";

function formatPrice(cents: number | null, currency: string | null): string {
  if (!cents) return "Consultar precio";
  const amount = cents / 100;
  const cur = currency ?? "USD";
  if (cur === "USD") return `USD ${amount.toLocaleString("es-AR")}`;
  return `$ ${amount.toLocaleString("es-AR")}`;
}

export default async function PublicCatalogPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug: orgSlug, isActive: true },
    select: {
      name: true,
      description: true,
      contactWhatsapp: true,
      contactEmail: true,
      contactPhone: true,
    },
  });

  if (!org) notFound();

  const properties = await prisma.property.findMany({
    where: {
      organization: { slug: orgSlug },
      status: "AVAILABLE",
      publicVisible: true,
    },
    orderBy: [{ operationType: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
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
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
  });

  const whatsappBase = org.contactWhatsapp
    ? `https://wa.me/${org.contactWhatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
          {org.description && (
            <p className="mt-1 text-slate-500 text-sm">{org.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            {whatsappBase && (
              <a
                href={`${whatsappBase}?text=Hola! Vi su catálogo de propiedades y quisiera consultar.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Consultar por WhatsApp
              </a>
            )}
            {org.contactEmail && (
              <a
                href={`mailto:${org.contactEmail}`}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                {org.contactEmail}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {properties.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-4xl mb-3">🏘️</p>
            <p className="text-lg font-medium">No hay propiedades disponibles por el momento</p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-slate-500">
              {properties.length} {properties.length === 1 ? "propiedad disponible" : "propiedades disponibles"}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((prop) => {
                const image = prop.images[0]?.url;
                const details = [
                  prop.bedrooms ? `${prop.bedrooms} dorm.` : null,
                  prop.bathrooms ? `${prop.bathrooms} baños` : null,
                  prop.surfaceM2 ? `${prop.surfaceM2}m²` : null,
                ].filter(Boolean);

                const contactMsg = `Hola! Me interesa la propiedad: ${prop.title}${prop.address ? ` (${prop.address})` : ""}. ¿Podría darme más información?`;

                return (
                  <div
                    key={prop.id}
                    className="rounded-2xl border bg-white shadow-sm overflow-hidden flex flex-col"
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={prop.title}
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="h-44 bg-slate-100 flex items-center justify-center text-slate-300 text-4xl">
                        🏠
                      </div>
                    )}

                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-1.5 mb-2">
                        {prop.operationType && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            prop.operationType === "Venta"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {prop.operationType}
                          </span>
                        )}
                        {prop.propertyType && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {prop.propertyType}
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-slate-900 text-sm leading-tight line-clamp-2">
                        {prop.title}
                      </h3>

                      {(prop.neighborhood || prop.city) && (
                        <p className="mt-1 text-xs text-slate-400">
                          📍 {[prop.neighborhood, prop.city].filter(Boolean).join(", ")}
                        </p>
                      )}

                      {details.length > 0 && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          {details.join(" · ")}
                        </p>
                      )}

                      {prop.description && (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                          {prop.description}
                        </p>
                      )}

                      <div className="mt-auto pt-3">
                        <p className="text-base font-bold text-slate-900">
                          {formatPrice(prop.priceCents, prop.currency)}
                        </p>

                        <div className="mt-2 flex gap-2">
                          {whatsappBase && (
                            <a
                              href={`${whatsappBase}?text=${encodeURIComponent(contactMsg)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition"
                            >
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              Consultar
                            </a>
                          )}
                          {prop.externalLink && (
                            <a
                              href={prop.externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center rounded-xl border py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                            >
                              Ver más
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="text-center py-8 text-xs text-slate-300">
        Catálogo generado con RaicesPilot
      </div>
    </div>
  );
}
