import { notFound } from "next/navigation";

import { SectionCard } from "@/components/workspace/section-card";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";

export default async function WhatsAppIntegrationPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const organization = await getOrganizationWorkspace(orgSlug);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <SectionCard
        eyebrow="WhatsApp"
        title="Connect your number"
        description="Link your WhatsApp Business number (via Meta Cloud API) to start receiving inbound messages and automating lead responses."
      >
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <svg
              className="h-6 w-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            WhatsApp connection — coming next
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            You will be able to paste your Phone Number ID and Access Token here
            to activate automatic lead handling via WhatsApp Cloud API.
          </p>
        </div>
      </SectionCard>
    </>
  );
}
