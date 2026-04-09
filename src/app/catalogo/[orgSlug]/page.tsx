export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

import { StatusBadge } from "@/components/workspace/status-badge";
import { getPublicOrgForCatalog, listPublicPropertiesByOrg } from "@/modules/properties/service";
import { formatCurrency } from "@/lib/utils";

export default async function OrgCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { orgSlug } = await params;
  const { q } = await searchParams;
  const query = q?.trim() || undefined;

  const [organization, properties] = await Promise.all([
    getPublicOrgForCatalog(orgSlug),
    listPublicPropertiesByOrg(orgSlug, query),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {organization.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {properties.length} propiedad{properties.length !== 1 ? "es" : ""} disponible{properties.length !== 1 ? "s" : ""}
          {query ? ` para "${query}"` : ""}
        </p>
      </div>

      {/* Filter */}
      <form method="GET" className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Buscar por ciudad, barrio o dirección..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Buscar
          </button>
          {query && (
            <Link
              href={`/catalogo/${orgSlug}`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {/* Property grid */}
      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <p className="text-sm text-slate-500">
            No se encontraron propiedades{query ? ` para "${query}"` : ""}.
          </p>
          {query && (
            <Link
              href={`/catalogo/${orgSlug}`}
              className="mt-3 inline-block text-sm font-medium text-slate-700 underline underline-offset-2"
            >
              Ver todas las propiedades
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/catalogo/${orgSlug}/${property.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Thumbnail */}
              {property.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={property.thumbnailUrl}
                  alt={property.title}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-slate-100">
                  <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 19.5h18M3.75 4.5h16.5A.75.75 0 0121 5.25v13.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 18.75V5.25A.75.75 0 013.75 4.5z" />
                  </svg>
                </div>
              )}

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 flex-1 font-semibold leading-snug text-slate-950">
                    {property.title}
                  </p>
                  <StatusBadge label={property.status} tone="success" />
                </div>

                {(property.neighborhood || property.city) && (
                  <p className="mt-1.5 line-clamp-1 text-sm text-slate-500">
                    {[property.neighborhood, property.city].filter(Boolean).join(", ")}
                  </p>
                )}

                <p className="mt-1.5 text-sm text-slate-400">
                  {[
                    property.bedrooms != null && `${property.bedrooms} dorm`,
                    property.bathrooms != null && `${property.bathrooms} ba`,
                    property.surfaceM2 != null && `${property.surfaceM2} m²`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <p className="mt-auto pt-3 text-lg font-semibold text-slate-950">
                  {property.priceCents != null
                    ? formatCurrency(property.priceCents, property.currency ?? "USD")
                    : "Precio a consultar"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
