import Link from "next/link";

import type { OrganizationWorkspace } from "@/modules/organizations/types";
import { StatusBadge } from "@/components/workspace/status-badge";

type WorkspaceHeaderProps = {
  organization: OrganizationWorkspace;
  children?: React.ReactNode;
};

export function WorkspaceHeader({ organization, children }: WorkspaceHeaderProps) {
  return (
    <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={organization.planLabel} tone="info" />
            <StatusBadge label={`${organization.city} workspace`} />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            {organization.name}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {organization.description} Market focus: {organization.marketFocus}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {children}
          <Link
            href={`/${organization.slug}/leads`}
            className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Review pipeline
          </Link>
          <Link
            href={`/${organization.slug}/properties`}
            className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Review inventory
          </Link>
        </div>
      </div>
    </section>
  );
}
