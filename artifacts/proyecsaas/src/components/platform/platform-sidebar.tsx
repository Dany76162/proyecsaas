"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  UserPlus,
  ActivitySquare,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/auth/actions";

const PLATFORM_NAV = [
  { name: "Resumen", href: "/platform", icon: LayoutDashboard, exact: true },
  { name: "Clientes", href: "/platform/organizations", icon: Building2 },
  { name: "Atención a Clientes", href: "/platform/support", icon: MessageSquare },
  { name: "Onboarding", href: "/platform/onboarding", icon: UserPlus },
  { name: "Salud del sistema", href: "/platform/health", icon: ActivitySquare },
  { name: "Comercial", href: "/platform/billing", icon: CreditCard },
  { name: "Configuración", href: "/platform/settings", icon: Settings },
];

type PlatformSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function PlatformSidebar({ isOpen, onClose }: PlatformSidebarProps) {
  const pathname = usePathname();

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

      {/* Brand card — mismo patrón que el sidebar de inmobiliaria */}
      <Link
        href="/platform"
        onClick={onClose}
        className="m-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10 group"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            RaicesPilot
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-white leading-tight">Superadmin</h2>
          <div className="mt-2.5 inline-block rounded bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
            Plataforma
          </div>
        </div>
        <img
          src="/brand/raices_pilot_logo_clean.png"
          alt="Logo"
          className="h-16 w-16 shrink-0 object-contain group-hover:scale-105 transition-transform"
        />
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Administración
        </p>
        <ul className="space-y-1">
          {PLATFORM_NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-white text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-slate-900"
                        : "text-slate-500 group-hover:text-slate-300",
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-white/10">
        <form action={logoutAction}>
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
