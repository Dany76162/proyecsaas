export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ImportedReviewList } from "@/components/properties/imported-review-list";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { listImportedDraftProperties } from "@/modules/properties/service";

export default async function ImportedReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, properties] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listImportedDraftProperties(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization}>
        <Link
          href={`/${orgSlug}/properties`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a propiedades
        </Link>
      </WorkspaceHeader>

      <section className="space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Revisar propiedades importadas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Propiedades sincronizadas desde un sitio web que quedaron en borrador (internas). Revisá los
            datos detectados y publicalas, o descartalas de la revisión (siguen existiendo en borrador).
          </p>
        </div>
        <ImportedReviewList orgSlug={orgSlug} properties={properties} />
      </section>
    </>
  );
}
