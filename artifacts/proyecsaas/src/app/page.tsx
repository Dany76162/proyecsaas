export const dynamic = "force-dynamic";
import Link from "next/link";
import { cookies } from "next/headers";

export default async function HomePage() {
  // Check session purely via cookie presence — no Prisma import at module level
  let isLoggedIn = false;
  try {
    const cookieStore = await cookies();
    isLoggedIn = cookieStore.has("proyecsaas_session");
  } catch {
    isLoggedIn = false;
  }

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
              RaicesPilot es el entorno de trabajo donde tu equipo inmobiliario
              centraliza operaciones: desde el alta de inventario y calificación
              de leads, hasta el cruce inteligente de propiedades y coordinación
              de visitas.
            </p>
            <div className="flex flex-wrap gap-3">
              {isLoggedIn ? (
                <Link
                  href="/platform"
                  className="rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Ingresar a tu área de trabajo
                </Link>
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
                  description:
                    "Entornos aislados por equipo con métricas de rendimiento en tiempo real.",
                },
                {
                  title: "Roles y permisos",
                  description:
                    "Directorio de agentes con asignación clara de responsabilidades operativas.",
                },
                {
                  title: "Propiedades y Leads",
                  description:
                    "Vistas operativas profesionales diseñadas para la gestión diaria del inventario.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.25rem] border border-white/10 bg-white/10 p-5 backdrop-blur"
                >
                  <h2 className="text-lg font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {item.description}
                  </p>
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
              Acceso
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {isLoggedIn ? "Sesión activa" : "Acceso restringido"}
            </h2>
          </div>
        </div>
        <div className="mt-6 rounded-[1.5rem] border bg-white p-6 shadow-soft">
          <p className="text-sm leading-7 text-slate-600">
            {isLoggedIn
              ? "Tu sesión está activa. Accedé al área de trabajo desde el botón de arriba."
              : "El acceso a RaicesPilot requiere autenticación e invitación previa a una organización válida."}
          </p>
        </div>
      </section>
    </main>
  );
}
