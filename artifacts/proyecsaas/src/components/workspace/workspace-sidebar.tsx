"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  X,
  LayoutDashboard,
  Rocket,
  Megaphone,
  BookOpen,
  Users,
  MessageSquare,
  Calendar,
  Building2,
  Bot,
  Zap,
  Radio,
  Users2,
  Settings,
  Smartphone,
} from "lucide-react";
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
  { label: "Inicio",         path: "",              icon: LayoutDashboard },
  { label: "Bienvenida",     path: "/onboarding",   icon: Rocket },
  { label: "Captación",      path: "/captacion",    icon: Megaphone },
  { label: "Prospectos",     path: "/leads",        icon: Users },
  { label: "Conversaciones", path: "/conversations",icon: MessageSquare },
  { label: "Visitas",        path: "/visits",       icon: Calendar },
  { label: "Propiedades",    path: "/properties",   icon: Building2 },
] as const;

const AUTOMATION_NAV = [
  { label: "Agentes IA",       path: "/agents",      icon: Bot },
  { label: "Automatizaciones", path: "/automations", icon: Zap },
] as const;

const MANAGEMENT_NAV = [
  { label: "WhatsApp",       path: "/settings/integrations/whatsapp", icon: Smartphone },
  { label: "Disponibilidad", path: "/settings/availability",          icon: Radio },
  { label: "Equipo",         path: "/settings/users",                 icon: Users2 },
  { label: "Organización",   path: "/settings/organization",          icon: Settings },
] as const;

const HELP_NAV = [
  { label: "Soporte Técnico", href: "https://wa.me/5491161630205", icon: MessageSquare },
  { label: "Manual de Uso",   path: "/manual-uso",             icon: BookOpen },
] as const;

const ROLE_MAP = {
  OWNER:     { label: "Titular",           copy: "Acceso total" },
  ADMIN:     { label: "Administrador",     copy: "Gestión y operación" },
  AGENT:     { label: "Agente de ventas",  copy: "Operación comercial" },
  ASSISTANT: { label: "Asistente",         copy: "Soporte operativo" },
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
        "fixed bottom-0 left-0 top-0 z-50 flex h-screen h-[100dvh] w-64 flex-col print:hidden",
        "bg-[#0f1117] border-r border-white/[0.06]",
        "transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Mobile close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-white/8 hover:text-slate-300 lg:hidden"
        aria-label="Cerrar menu"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Brand header */}
      <Link
        href={`/${organization.slug}`}
        onClick={onClose}
        className="group m-3 flex shrink-0 items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3.5 py-3 transition-all duration-150 hover:bg-white/[0.07]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md">
          <img
            src="/brand/Logo%20minimalista%20de%20crecimiento%20inmobiliario.png"
            alt="Logo"
            className="h-12 w-12 max-w-none object-contain brightness-0 invert opacity-90"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-700">
            RaicesPilot
          </p>
          <h2 className="mt-0.5 truncate text-sm font-semibold leading-tight text-white/90">
            {organization.name}
          </h2>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-5">
        {/* Operacion */}
        <div>
          <p className="mb-2 px-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
            Operación
          </p>
          <div className="space-y-0.5">
            {OPERATION_NAV.map((item) => {
              const active = isActive(organization.slug, item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={`/${organization.slug}${item.path}`}
                  onClick={onClose}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold transition-all duration-150",
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200",
                  )}
                >
                  {/* Active accent */}
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-400" />
                  )}
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-colors duration-150",
                      active ? "text-brand-400" : "text-slate-600 group-hover:text-slate-400",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Automatizacion */}
        {isAdminOrOwner(role) && (
          <div>
            <p className="mb-2 px-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
              Automatización
            </p>
            <div className="space-y-0.5">
              {AUTOMATION_NAV.map((item) => {
                const active = isActive(organization.slug, item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={`/${organization.slug}${item.path}`}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-400" />
                    )}
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors duration-150",
                        active ? "text-brand-400" : "text-slate-600 group-hover:text-slate-400",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Administracion */}
        {isAdminOrOwner(role) && (
          <div>
            <p className="mb-2 px-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
              Administración
            </p>
            <div className="space-y-0.5">
              {MANAGEMENT_NAV.map((item) => {
                const active = isActive(organization.slug, item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={`/${organization.slug}${item.path}`}
                    onClick={onClose}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-400" />
                    )}
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors duration-150",
                        active ? "text-brand-400" : "text-slate-600 group-hover:text-slate-400",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        {/* Centro de Ayuda */}
        <div>
          <p className="mb-2 px-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-600">
            Centro de Ayuda
          </p>
          <div className="space-y-0.5">
            {HELP_NAV.map((item) => {
              const Icon = item.icon;
              if ("href" in item) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-white/[0.05] hover:text-slate-200"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 transition-colors duration-150 text-slate-600 group-hover:text-slate-400" />
                    {item.label}
                  </a>
                );
              }
              const active = isActive(organization.slug, item.path);
              return (
                <Link
                  key={item.path}
                  href={`/${organization.slug}${item.path}`}
                  onClick={onClose}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-400" />
                  )}
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors duration-150",
                      active ? "text-brand-400" : "text-slate-600 group-hover:text-slate-400",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-white/[0.06] p-3 space-y-1">
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-slate-400 ring-1 ring-white/10">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-slate-300">{userName}</p>
            <p className="text-xs text-slate-600">{roleDisplay.label}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold text-slate-600 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4.5 w-4.5 transition-colors duration-150 group-hover:text-red-400" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
