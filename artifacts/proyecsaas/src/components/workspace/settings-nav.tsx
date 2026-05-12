"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type SettingsNavProps = {
  orgSlug: string;
};

const NAV_ITEMS = [
  { label: "OrganizaciÃ³n", path: "/settings/organization" },
  { label: "Disponibilidad", path: "/settings/availability" },
  { label: "Usuarios", path: "/settings/users" },
  { label: "Integraciones", path: "/settings/integrations" },
] as const;

export function SettingsNav({ orgSlug }: SettingsNavProps) {
  const currentPath = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 rounded-2xl bg-white p-1.5 shadow-soft ring-1 ring-slate-100">
      {NAV_ITEMS.map((item) => {
        const href = `/${orgSlug}${item.path}`;
        const isActive = currentPath.startsWith(href);

        return (
          <Link
            key={item.path}
            href={href}
            className={cn(
              "flex-1 rounded-xl px-4 py-2 text-center text-sm font-medium transition-colors whitespace-nowrap",
              isActive
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
