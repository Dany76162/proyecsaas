export const dynamic = "force-dynamic";


import { listOrganizationsForPlatform } from "@/modules/platform/service";
import { HealthBadge, WhatsAppStatus, formatRelativeTime } from "@/components/platform/platform-ui";
import { OnboardingControls } from "@/components/platform/onboarding-controls";
import { CreateOrgDialog } from "@/components/platform/create-org-dialog";

export default async function PlatformOrganizationsPage() {
  const orgs = await listOrganizationsForPlatform();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Clientes / Inmobiliarias
        </h1>
        <p className="text-sm text-slate-500">
          {orgs.length} inmobiliaria{orgs.length !== 1 ? "s" : ""} activa{orgs.length !== 1 ? "s" : ""} registrada{orgs.length !== 1 ? "s" : ""} en la plataforma.
        </p>
      </div>

      {/* Toolbox */}
      <div className="flex items-center justify-end w-full">
        <CreateOrgDialog />
      </div>

      {/* Main Table — overflow-x-auto para mobile/tablet */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3.5">Organización</th>
              <th className="px-5 py-3.5">Salud Sistémica</th>
              <th className="px-5 py-3.5">Canal WABA</th>
              <th className="px-5 py-3.5">Tráfico 7d</th>
              <th className="px-5 py-3.5 whitespace-nowrap">Última acción</th>
              <th className="px-5 py-3.5">Onboarding</th>
              <th className="px-5 py-3.5 text-right">Acciones</th>
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
                  <WhatsAppStatus channel={org.whatsappChannel} />
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

                <td className="px-5 py-4 align-top">
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
                  <p className="text-base font-semibold text-slate-900">Sin inmobiliarias activas</p>
                  <p className="mt-1 text-sm text-slate-500">
                    No hay organizaciones activas en este momento. Las dadas de baja no aparecen en este panel.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
