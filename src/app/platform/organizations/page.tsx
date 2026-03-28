export const dynamic = "force-dynamic";

import { Search, SlidersHorizontal } from "lucide-react";

import { listOrganizationsForPlatform } from "@/modules/platform/service";
import { HealthBadge, WhatsAppStatus, formatRelativeTime } from "@/components/platform/platform-ui";
import { OnboardingControls } from "@/components/platform/onboarding-controls";

export default async function PlatformOrganizationsPage() {
  const orgs = await listOrganizationsForPlatform();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Clientes / Inmobiliarias
        </h1>
        <p className="text-sm text-slate-500">
          Listado de los {orgs.length} tenants registrados en la plataforma.
        </p>
      </div>

      {/* Toolbox (Search/Filters Mock) */}
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar inmobiliaria, ciudad o correo..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          Filtros
        </button>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3.5">Organización</th>
              <th className="px-5 py-3.5">Salud Sistémica</th>
              <th className="px-5 py-3.5">Canal WABA</th>
              <th className="px-5 py-3.5">Tráfico 7d</th>
              <th className="px-5 py-3.5 whitespace-nowrap">Última acción</th>
              <th className="px-5 py-3.5">Onboarding</th>
              <th className="px-3 py-3.5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orgs.map((org) => (
              <tr
                key={org.id}
                className={`transition hover:bg-slate-50/70 group ${!org.isActive ? "bg-slate-50 opacity-60 grayscale" : ""}`}
              >
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{org.name}</span>
                    <span className="mt-0.5 text-xs font-medium text-slate-500">{org.city || "Ciudad no especificada"}</span>
                  </div>
                </td>

                <td className="px-5 py-4 align-top">
                  <HealthBadge status={org.health} />
                </td>
                
                <td className="px-5 py-4 align-top">
                  <div className="max-w-[130px] truncate">
                    <WhatsAppStatus channel={org.whatsappChannel} />
                  </div>
                </td>
                
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col gap-1">
                     <span className={org.recentLeadCount > 0 ? "font-bold text-slate-900" : "font-medium text-slate-400"}>
                        {org.recentLeadCount} leads
                     </span>
                     <span className={`text-[10px] font-bold uppercase tracking-wider ${org.recentFailedDeliveries > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {org.recentFailedDeliveries} errs
                     </span>
                  </div>
                </td>

                <td className="px-5 py-4 align-top text-xs font-medium text-slate-600">
                  {org.lastActivityAt ? formatRelativeTime(org.lastActivityAt) : "—"}
                </td>

                <td className="px-5 py-4 align-top">
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold leading-none mb-1 ${
                      org.onboardingStatus === "Operativa" ? "text-emerald-700" : 
                      org.onboardingStatus === "Sin usuarios" ? "text-slate-400" : "text-amber-600"
                    }`}>
                      {org.onboardingStatus}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{org.memberCount} users</span>
                  </div>
                </td>

                <td className="px-3 py-4 align-top">
                  <div className="flex items-center justify-end">
                    <OnboardingControls
                    orgSlug={org.slug}
                    orgName={org.name}
                    hasUsers={org.memberCount > 0}
                    isActive={org.isActive}
                  />
                  </div>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <p className="text-base font-semibold text-slate-900">Sin clientes</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Aún no hay inmobiliarias registradas en la base de datos de plataforma.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
