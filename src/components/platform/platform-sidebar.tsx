"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Building2, 
  UserPlus, 
  ActivitySquare, 
  CreditCard,
  Settings,
  LogOut
} from "lucide-react";
import { logoutAction } from "@/server/auth/actions";

const PLATFORM_NAV = [
  { name: "Resumen", href: "/platform", icon: LayoutDashboard, exact: true },
  { name: "Clientes", href: "/platform/organizations", icon: Building2 },
  { name: "Onboarding", href: "/platform/onboarding", icon: UserPlus },
  { name: "Salud del sistema", href: "/platform/health", icon: ActivitySquare },
  { name: "Comercial", href: "/platform/billing", icon: CreditCard },
  { name: "Configuración", href: "/platform/settings", icon: Settings },
];

export function PlatformSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-0 left-0 top-0 w-64 flex flex-col border-r bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/platform" className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-slate-900">
            RaicesPilot
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Plataforma
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
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
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive 
                      ? "bg-slate-100 text-slate-900" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-500"}`} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / User Profile */}
      <div className="border-t p-4">
        <form action={logoutAction}>
          <button 
            type="submit"
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-500" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
