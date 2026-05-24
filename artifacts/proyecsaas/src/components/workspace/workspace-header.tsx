import Link from "next/link";

import type { OrganizationWorkspace } from "@/modules/organizations/types";
import { StatusBadge } from "@/components/workspace/status-badge";

type WorkspaceHeaderProps = {
  organization: OrganizationWorkspace;
  children?: React.ReactNode;
  onboardingIncomplete?: boolean;
  onboardingProgressLabel?: string;
  onboardingNextHref?: string | null;
};

export function WorkspaceHeader({
  organization,
  children,
  onboardingIncomplete = false,
  onboardingProgressLabel,
  onboardingNextHref,
}: WorkspaceHeaderProps) {
  return (
    <section className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-enterprise">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={organization.planLabel} tone="info" />
            {organization.city && (
              <StatusBadge label={organization.city} />
            )}
            {onboardingIncomplete && onboardingProgressLabel && (
              <StatusBadge label={onboardingProgressLabel} tone="warning" />
            )}
          </div>
          <div className="mt-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {organization.name}
            </h1>
          </div>
          {organization.description && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600 font-medium">
              {organization.description}
              {organization.marketFocus ? ` - ${organization.marketFocus}` : ""}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 items-center print:hidden">
          {children}
          {onboardingIncomplete ? (
            <Link
              href={onboardingNextHref ?? `/${organization.slug}/settings/organization`}
                className="rounded-lg bg-brand-500 px-6 py-3 text-[15px] font-bold text-white transition-all duration-200 hover:bg-brand-600 shadow-sm shadow-brand-500/10"
            >
              Continuar configuración
            </Link>
          ) : (
            <>
              <Link
                href={`/${organization.slug}/leads`}
                  className="rounded-lg bg-brand-500 px-6 py-3 text-[15px] font-bold text-white transition-all duration-200 hover:bg-brand-600 shadow-sm shadow-brand-500/10"
              >
                Ver embudo
              </Link>
              <Link
                href={`/${organization.slug}/properties`}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
              >
                Ver propiedades
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
