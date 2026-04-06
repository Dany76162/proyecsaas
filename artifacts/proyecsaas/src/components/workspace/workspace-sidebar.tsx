"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { MembershipRole } from "@prisma/client";

import type { OrganizationSummary } from "@/modules/organizations/types";
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
        "fixed bottom-0 left-0 top-0 z-50 w-72 flex flex-col bg-slate-950 overflow-y-auto",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Close button — mobile only */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 transition lg:hidden"
        aria-label="Cerrar menú"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Brand card */}
      <Link
        href="/"
        onClick={onClose}
        className="m-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 group"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            RaicesPilot
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-white truncate">{organization.name}</h2>
          <div className="mt-2 inline-block rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
            Panel de Inmobiliaria
          </div>
        </div>
        <img
          src="/brand/Logo%20minimalista%20de%20crecimiento%20inmobiliario.png"
          alt="Logo"
          className="h-16 w-16 shrink-0 object-contain group-hover:scale-105 transition-transform"
        />
      </Link>

      {/* Operación */}
      <div className="px-4 space-y-1">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Operación
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
      </div>

      {/* Automatización — solo ADMIN / OWNER */}
      {isAdminOrOwner(role) && (
        <div className="mt-6 px-4 space-y-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Automatización
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

      {/* Administración — solo ADMIN / OWNER */}
      {isAdminOrOwner(role) && (
        <div className="mt-6 px-4 space-y-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Configuración
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

      {/* Footer — user + role */}
      <div className="mt-auto p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-400">{roleDisplay.label}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
