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

  return (
    <aside className="flex h-full flex-col rounded-[1.75rem] bg-slate-950 p-5 text-slate-100 shadow-soft">
      <Link
        href="/"
        className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          RaicesPilot
        </p>
        <h2 className="mt-2 text-lg font-semibold">{organization.name}</h2>
        <p className="mt-1 text-sm text-slate-400">{organization.city}</p>
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
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            {role}
          </p>
        </div>
      </div>
    </aside>
  );
}
