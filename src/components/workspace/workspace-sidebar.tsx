"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { OrganizationSummary } from "@/modules/organizations/types";
import { modules } from "@/config/modules";
import { cn } from "@/lib/utils";

type WorkspaceSidebarProps = {
  organization: OrganizationSummary;
};

const primaryModuleKeys = new Set(["organizations", "users", "leads", "properties", "visits"]);

export function WorkspaceSidebar({
  organization,
}: WorkspaceSidebarProps) {
  const currentPath = usePathname();
  const primaryModules = modules.filter((module) => primaryModuleKeys.has(module.key));
  const laterModules = modules.filter(
    (module) => module.workspacePath && !primaryModuleKeys.has(module.key),
  );

  return (
    <aside className="flex h-full flex-col rounded-[1.75rem] bg-slate-950 p-5 text-slate-100 shadow-soft">
      <Link href="/" className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          ProyecSaaS
        </p>
        <h2 className="mt-2 text-lg font-semibold">{organization.name}</h2>
        <p className="mt-1 text-sm text-slate-400">{organization.city}</p>
      </Link>

      <div className="mt-6 space-y-2">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Core workspace
        </p>
        <Link
          href={`/${organization.slug}`}
          className={cn(
            "block rounded-xl px-3 py-2 text-sm transition",
            currentPath === `/${organization.slug}`
              ? "bg-white text-slate-950"
              : "text-slate-300 hover:bg-white/10 hover:text-white",
          )}
        >
          Overview
        </Link>
        {primaryModules.map((module) => (
          <Link
            key={module.key}
            href={`/${organization.slug}${module.workspacePath ?? ""}`}
            className={cn(
              "block rounded-xl px-3 py-2 text-sm transition",
              currentPath === `/${organization.slug}${module.workspacePath ?? ""}`
                ? "bg-white text-slate-950"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            {module.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Later phases
        </p>
        {laterModules.map((module) => (
          <Link
            key={module.key}
            href={`/${organization.slug}${module.workspacePath ?? ""}`}
            className="block rounded-xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            {module.label}
          </Link>
        ))}
      </div>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold">Workspace readiness</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Core CRM and portfolio foundations are active. Visits, conversations, and automations stay parked for the next phase.
        </p>
      </div>
    </aside>
  );
}
