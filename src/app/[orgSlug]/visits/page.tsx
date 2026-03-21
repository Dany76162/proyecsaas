import { WorkspaceIntro } from "@/components/workspace/workspace-intro";

export default async function VisitsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <WorkspaceIntro
      title="Visits"
      orgSlug={orgSlug}
      description="Scheduling shell for upcoming property visits, availability coordination, and status updates."
    />
  );
}
