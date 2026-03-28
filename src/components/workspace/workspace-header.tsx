import Link from "next/link";

import type { OrganizationWorkspace } from "@/modules/organizations/types";
import { StatusBadge } from "@/components/workspace/status-badge";

type WorkspaceHeaderProps = {
  organization: OrganizationWorkspace;
  children?: React.ReactNode;
};

export function WorkspaceHeader({ organization, children }: WorkspaceHeaderProps) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={organization.planLabel} tone="info" />
            {organization.city && (
              <StatusBadge label={organization.city} />
            )}
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Panel de Inmobiliaria
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              {organization.name}
            </h1>
          </div>
          {organization.description && (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {organization.description}
              {organization.marketFocus ? ` · ${organization.marketFocus}` : ""}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 items-center">
          {children}
          <Link
            href={`/${organization.slug}/leads`}
            className="rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Ver pipeline
          </Link>
          <Link
            href={`/${organization.slug}/properties`}
            className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Ver propiedades
          </Link>
        </div>
      </div>
    </section>
  );
}
