export const dynamic = "force-dynamic";

import Link from "next/link";

import { formatRelativeTime } from "@/components/platform/platform-ui";
import { getPlatformActivationSnapshot } from "@/modules/platform/activation-service";

function getStageUi(stage: string) {
  if (stage === "ACTIVATED") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (stage === "FIRST_LEAD") {
    return "bg-brand-100 text-brand-900";
  }

  if (stage === "ONBOARDING_VIEWED") {
    return "bg-amber-100 text-amber-700";
  }

  if (stage === "SETUP_READY") {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-slate-100 text-slate-700";
}

function YesNoBadge({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {value ? "Si" : "No"}
    </span>
  );
}

export default async function PlatformActivationPage() {
  const snapshot = await getPlatformActivationSnapshot();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Activacion</h1>
        <p className="text-sm text-slate-500">
          Seguimiento real del paso de alta inicial a uso efectivo de la plataforma.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Organizaciones
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {snapshot.summary.totalOrganizations}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Onboarding visto
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {snapshot.summary.onboardingViewedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Con primer lead
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {snapshot.summary.firstLeadCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Con intervencion
          </p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {snapshot.summary.firstHumanInterventionCount}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Activadas
          </p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">
            {snapshot.summary.activatedCount}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold text-slate-900">Funnel de activacion</h2>
          <p className="text-sm text-slate-500">
            Vista simple para detectar rapido en que parte del recorrido se frenan las
            inmobiliarias.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {snapshot.funnel.map((item) => (
            <article
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <span className="text-sm font-bold text-slate-500">{item.percent}%</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                {item.count}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Organizaciones y adopcion real</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ordenadas para identificar primero las cuentas trabadas y las que necesitan
            acompanamiento.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Organizacion</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Onboarding</th>
                <th className="px-5 py-3.5">Primer lead</th>
                <th className="px-5 py-3.5">Intervencion</th>
                <th className="px-5 py-3.5">Ultima actividad</th>
                <th className="px-5 py-3.5">Tiempo a activacion</th>
                <th className="px-5 py-3.5">Siguiente accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshot.organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{org.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      /{org.slug}
                      {org.city ? ` - ${org.city}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStageUi(org.activationStage)}`}
                    >
                      {org.activationLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <YesNoBadge value={org.onboardingViewed} />
                  </td>
                  <td className="px-5 py-4">
                    <YesNoBadge value={org.firstLead} />
                  </td>
                  <td className="px-5 py-4">
                    <YesNoBadge value={org.firstHumanIntervention} />
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "Sin actividad"}
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">
                    {org.timeToActivationHours !== null
                      ? `${org.timeToActivationHours} h`
                      : "Sin dato"}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={org.actionHref}
                      className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {org.actionLabel}
                    </Link>
                  </td>
                </tr>
              ))}

              {snapshot.organizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      Sin organizaciones para analizar
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Cuando haya cuentas activas, esta vista va a mostrar su estado de activacion.
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
