"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import type { MembershipRole } from "@prisma/client";

import type { OrganizationSummary } from "@/modules/organizations/types";
import { logoutAction } from "@/server/auth/actions";
import { cn } from "@/lib/utils";

type WorkspaceSidebarProps = {
  organization: OrganizationSummary;
  role: MembershipRole;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
};

const OPERATION_NAV = [
  { label: "Inicio", path: "" },
  { label: "Onboarding", path: "/onboarding" },
  { label: "Captacion", path: "/captacion" },
  { label: "Manual de uso", path: "/manual-uso" },
  { label: "Leads", path: "/leads" },
  { label: "Conversaciones", path: "/conversations" },
  { label: "Visitas", path: "/visits" },
  { label: "Propiedades", path: "/properties" },
] as const;

const AUTOMATION_NAV = [
  { label: "Agentes IA", path: "/agents" },
  { label: "Automatizaciones", path: "/automations" },
] as const;

const MANAGEMENT_NAV = [
  { label: "Disponibilidad", path: "/settings/availability" },
  { label: "Equipo", path: "/settings/users" },
  { label: "Organizacion", path: "/settings/organization" },
] as const;

const ROLE_MAP = {
  OWNER: { label: "Titular", copy: "Acceso total" },
  ADMIN: { label: "Administrador", copy: "Gestion y operacion" },
  AGENT: { label: "Agente de ventas", copy: "Operacion comercial" },
  ASSISTANT: { label: "Asistente", copy: "Soporte operativo" },
} as const;

function isAdminOrOwner(role: MembershipRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function WorkspaceSidebar({
  organization,
  role,
  userName,
  isOpen,
  onClose,
}: WorkspaceSidebarProps) {
  const currentPath = usePathname();

  function isActive(orgSlug: string, path: string): boolean {
    const href = `/${orgSlug}${path}`;
    if (path === "") return currentPath === href;
    return currentPath === href || currentPath.startsWith(href + "/");
  }

  const roleDisplay = ROLE_MAP[role] ?? { label: role, copy: "" };

  return (
    <aside
      className={cn(
        "fixed bottom-0 left-0 top-0 z-50 flex h-screen h-[100dvh] w-72 flex-col bg-slate-950 print:hidden",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 lg:hidden"
        aria-label="Cerrar menu"
      >
        <X className="h-4 w-4" />
      </button>

      <Link
        href={`/${organization.slug}`}
        onClick={onClose}
        className="m-4 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 group"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            RaicesPilot
          </p>
          <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-white">
            {organization.name}
          </h2>
          <div className="mt-2.5 inline-block rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
            Panel de inmobiliaria
          </div>
        </div>
        <div className="relative h-16 w-16 shrink-0">
          <img
            src="/brand/Logo%20minimalista%20de%20crecimiento%20inmobiliario.png"
            alt="Logo"
            className="absolute left-1/2 top-1/2 h-28 w-28 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain transition-transform group-hover:scale-110"
          />
        </div>
      </Link>

      <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-2">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Operacion
        </p>
        {OPERATION_NAV.map((item) => (
          <Link
            key={item.path}
            href={`/${organization.slug}${item.path}`}
            onClick={onClose}
            className={cn(
              "block rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive(organization.slug, item.path)
                ? "bg-white text-slate-950"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}

        {isAdminOrOwner(role) && (
          <div className="mt-6 space-y-1">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Automatizacion
            </p>
            {AUTOMATION_NAV.map((item) => (
              <Link
                key={item.path}
                href={`/${organization.slug}${item.path}`}
                onClick={onClose}
                className={cn(
                  "block rounded-xl px-3 py-2.5 text-sm font-medium transition",
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

        {isAdminOrOwner(role) && (
          <div className="mt-6 space-y-1">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Administracion
            </p>
            {MANAGEMENT_NAV.map((item) => (
              <Link
                key={item.path}
                href={`/${organization.slug}${item.path}`}
                onClick={onClose}
                className={cn(
                  "block rounded-xl px-3 py-2.5 text-sm font-medium transition",
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
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold leading-tight text-white">{userName}</p>
            <p className="text-[10px] text-slate-400">{roleDisplay.label}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </form>
      </div>
    </aside>
  );
}
