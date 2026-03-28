"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MembershipRole } from "@prisma/client";

import type { OrganizationSummary } from "@/modules/organizations/types";
import { cn } from "@/lib/utils";

type WorkspaceSidebarProps = {
  organization: OrganizationSummary;
  role: MembershipRole;
};

const OPERATION_NAV = [
  { label: "Inicio", path: "" },
  { label: "Leads", path: "/leads" },
  { label: "Conversaciones", path: "/conversations" },
  { label: "Visitas", path: "/visits" },
  { label: "Propiedades", path: "/properties" },
] as const;

const MANAGEMENT_NAV = [
  { label: "Equipo", path: "/settings/users" },
  { label: "Organización", path: "/settings/organization" },
] as const;

const ROLE_MAP = {
  OWNER: { label: "Titular", copy: "Acceso total" },
  ADMIN: { label: "Administrador", copy: "Gestión y operación" },
  AGENT: { label: "Agente de ventas", copy: "Operación comercial" },
  ASSISTANT: { label: "Asistente", copy: "Soporte operativo" },
} as const;

function isAdminOrOwner(role: MembershipRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function WorkspaceSidebar({ organization, role }: WorkspaceSidebarProps) {
  const currentPath = usePathname();

  function isActive(orgSlug: string, path: string): boolean {
    const href = `/${orgSlug}${path}`;
    if (path === "") return currentPath === href;
    return currentPath === href || currentPath.startsWith(href + "/");
  }

  const roleDisplay = ROLE_MAP[role] ?? { label: role, copy: "" };

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col bg-slate-950 p-5 text-slate-100 shadow-xl overflow-y-auto">
      <Link
        href="/"
        className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          RaicesPilot
        </p>
        <h2 className="mt-2 text-lg font-bold tracking-tight text-white">{organization.name}</h2>
        <div className="mt-2.5 inline-block rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
          Panel de Inmobiliaria
        </div>
      </Link>

      <div className="mt-6 space-y-1">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Operación
        </p>
        {OPERATION_NAV.map((item) => (
          <Link
            key={item.path}
            href={`/${organization.slug}${item.path}`}
            className={cn(
              "block rounded-xl px-3 py-2 text-sm transition",
              isActive(organization.slug, item.path)
                ? "bg-white text-slate-950"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {isAdminOrOwner(role) && (
        <div className="mt-6 space-y-1">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Administración
          </p>
          {MANAGEMENT_NAV.map((item) => (
            <Link
              key={item.path || "overview"}
              href={`/${organization.slug}${item.path}`}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm transition",
                isActive(organization.slug, item.path)
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-auto pt-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
            {roleDisplay.label.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-tight">
              {roleDisplay.label}
            </p>
            {roleDisplay.copy && (
              <p className="text-[10px] text-slate-400">{roleDisplay.copy}</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
