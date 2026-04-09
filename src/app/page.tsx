export const dynamic = "force-dynamic";
import Link from "next/link";

import { logoutAction } from "@/server/auth/actions";
import { getSessionUser } from "@/server/auth/session";
import { listOrganizationsForUser } from "@/modules/organizations/service";

export default async function HomePage() {
  const sessionUser = await getSessionUser();
  const organizations = sessionUser ? await listOrganizationsForUser(sessionUser.id) : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-8 shadow-soft backdrop-blur md:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-900">
              Plataforma Operativa Inmobiliaria
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              Control centralizado de propiedades, prospectos y gestión comercial.
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              RaicesPilot es el entorno de trabajo donde tu equipo inmobiliario centraliza operaciones: desde el alta de inventario y calificación de leads, hasta el cruce inteligente de propiedades y coordinación de visitas.
            </p>
            <div className="flex flex-wrap gap-3">
              {sessionUser ? (
                <>
                  <Link
                    href={organizations[0] ? `/${organizations[0].slug}` : sessionUser?.isPlatformAdmin ? "/platform" : "/map"}
                    className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Ingresar a tu área de trabajo
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Cerrar sesión
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/map"
                    className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Ver mapa público
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border bg-slate-950 p-6 text-slate-50">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Módulos principales
            </p>
            <div className="mt-5 grid gap-3">
              {[
                {
                  title: "Gestión multi-sucursal",
                  description: "Entornos aislados por equipo con métricas de rendimiento en tiempo real.",
                },
                {
                  title: "Roles y permisos",
                  description: "Directorio de agentes con asignación clara de responsabilidades operativas.",
                },
                {
                  title: "Propiedades y Leads",
                  description: "Vistas operativas profesionales diseñadas para la gestión diaria del inventario.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.25rem] border border-white/10 bg-white/10 p-5 backdrop-blur"
                >
                  <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Organizaciones
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {sessionUser ? "Tus inmobiliarias" : "Acceso restringido"}
            </h2>
          </div>
        </div>

        {sessionUser ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {organizations.map((organization) => (
              <Link
                key={organization.id}
                href={`/${organization.slug}`}
                className="rounded-[1.5rem] border bg-white p-6 shadow-soft transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-950">{organization.name}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {organization.planLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{organization.city}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {organization.marketFocus}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>{organization.memberCount} miembros</span>
                  <span>{organization.leadCount} leads</span>
                  <span>{organization.propertyCount} propiedades</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border bg-white p-6 shadow-soft">
            <p className="text-sm leading-7 text-slate-600">
              El acceso a RaicesPilot requiere autenticación e invitación previa a una organización válida.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
