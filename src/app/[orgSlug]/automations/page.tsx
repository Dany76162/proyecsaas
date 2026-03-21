import { WorkspaceIntro } from "@/components/workspace/workspace-intro";

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <WorkspaceIntro
      title="Automations"
      orgSlug={orgSlug}
      description="Lightweight automation surface prepared for queue-backed jobs, triggers, and rule execution later."
    />
  );
}
