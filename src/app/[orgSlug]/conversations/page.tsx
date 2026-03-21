import { WorkspaceIntro } from "@/components/workspace/workspace-intro";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <WorkspaceIntro
      title="Conversations"
      orgSlug={orgSlug}
      description="Message history placeholder for future inbox, contact timeline, and omnichannel tracking."
    />
  );
}
