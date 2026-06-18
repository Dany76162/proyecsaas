export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Plus, MapPin, Layers } from "lucide-react";

import { requireOrganizationMembership } from "@/server/auth/access";
import { listOrganizationDevelopments } from "@/modules/developments/service";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  SOLD_OUT: "Agotado",
  PAUSED: "Pausado",
  CANCELLED: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SOLD_OUT: "bg-blue-100 text-blue-700",
  PAUSED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function DevelopmentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await requireOrganizationMembership(orgSlug);

  const [organization, developments] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationDevelopments(orgSlug),
  ]);

  if (!organization) notFound();

  return (
    <>
      <WorkspaceHeader organization={organization}>
        <Button asChild>
          <Link href={`/${orgSlug}/developments/new`}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo desarrollo
          </Link>
        </Button>
      </WorkspaceHeader>

      <div className="p-6 space-y-4">
        {developments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-base font-semibold text-slate-700">Sin desarrollos todavía</h3>
            <p className="mt-1 text-sm text-slate-400">
              Creá tu primer desarrollo para gestionar lotes y masterplan.
            </p>
            <Button asChild className="mt-6">
              <Link href={`/${orgSlug}/developments/new`}>
                <Plus className="mr-1.5 h-4 w-4" />
                Crear desarrollo
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {developments.map((dev) => {
              const theme = dev.themeColor || "#0D9488";
              const soldPct =
                dev.lotCount > 0
                  ? Math.round(((dev.lotCount - dev.availableCount) / dev.lotCount) * 100)
                  : 0;
              return (
                <Link
                  key={dev.id}
                  href={`/${orgSlug}/developments/${dev.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-300"
                >
                  {/* Cabecera con color de marca + logo */}
                  <div
                    className="relative flex h-28 items-center justify-center overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${theme} 0%, ${theme}cc 60%, ${theme}99 100%)` }}
                  >
                    {dev.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dev.logoUrl}
                        alt={dev.name}
                        className="max-h-16 max-w-[70%] object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <Building2 className="h-10 w-10 text-white/85" />
                    )}
                    <span className={`absolute top-3 right-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${STATUS_COLOR[dev.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {STATUS_LABEL[dev.status] ?? dev.status}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition leading-snug">
                      {dev.name}
                    </h3>
                    {dev.city && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3.5 w-3.5" />
                        {dev.city}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {dev.lotCount} lotes
                      </span>
                      <span className="text-emerald-600">{dev.availableCount} disponibles</span>
                    </div>

                    {/* Barra de progreso vendido/reservado */}
                    <div className="mt-auto pt-4">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-medium text-slate-400">Vendido / Reservado</span>
                        <span className="font-bold text-slate-600 tabular-nums">{soldPct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${soldPct}%`, background: theme }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
