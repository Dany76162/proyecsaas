"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  UserPlus,
  TrendingUp,
  ActivitySquare,
  BookOpen,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  X,
  Bot,
  Megaphone,
  Network,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/auth/actions";

const PLATFORM_NAV = [
  { name: "Resumen", href: "/platform", icon: LayoutDashboard, exact: true },
  { name: "AgentOS", href: "/platform/agents", icon: Bot, exclude: ["/platform/agents/canvas", "/platform/agents/automations"] },
  { name: "Automatizaciones", href: "/platform/agents/automations", icon: Zap },
  { name: "Canvas", href: "/platform/agents/canvas", icon: Network },
  { name: "Clientes", href: "/platform/organizations", icon: Building2 },
  { name: "Atención a Clientes", href: "/platform/support", icon: MessageSquare },
  { name: "Captación", href: "/platform/captacion", icon: Megaphone },
  { name: "Onboarding", href: "/platform/onboarding", icon: UserPlus },
  { name: "Activación", href: "/platform/activation", icon: TrendingUp },
  { name: "Salud del sistema", href: "/platform/health", icon: ActivitySquare },
  { name: "Manual Vivo", href: "/platform/manual-operativo", icon: BookOpen },
  { name: "Manual Maestro", href: "/platform/master-manual", icon: BookOpen },
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
        "fixed bottom-0 left-0 top-0 z-50 w-72 flex flex-col bg-slate-900 overflow-y-auto print:hidden",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 transition lg:hidden"
        aria-label="Cerrar menu"
      >
        <X className="h-4 w-4" />
      </button>

      <Link
        href="/platform"
        onClick={onClose}
        className="m-4 flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:bg-white/[0.08] group"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
            RaicesPilot
          </p>
          <h2 className="mt-1 text-base font-bold tracking-tight text-white leading-tight">
            Superadmin
          </h2>
          <div className="mt-2 inline-block rounded bg-brand-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-300">
            Plataforma
          </div>
        </div>
        <div className="relative h-12 w-12 shrink-0">
          <img
            src="/brand/Logo%20minimalista%20de%20crecimiento%20inmobiliario.png"
            alt="Logo"
            className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 max-w-none object-contain transition-transform group-hover:scale-105"
          />
        </div>
      </Link>

      <nav className="flex-1 px-4 pb-4">
        <p className="mb-3 px-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
          Administración
        </p>
        <ul className="space-y-0.5">
          {PLATFORM_NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href) &&
                !item.exclude?.some((excludedPath) => pathname.startsWith(excludedPath));

            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-[15px] font-semibold transition-all duration-200",
                    isActive
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive
                        ? "text-white"
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

      <div className="p-4 border-t border-white/5">
        <form action={logoutAction}>
          <button
            type="submit"
            className="group flex w-full items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-[15px] font-semibold text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
