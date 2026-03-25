import { notFound } from "next/navigation";

import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { ConversationInbox } from "@/components/crm/conversation-inbox";
import { listOrganizationConversations } from "@/modules/conversations/service";
import { getOrganizationWorkspace } from "@/modules/organizations/service";

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, conversations] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationConversations(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />
      <ConversationInbox conversations={conversations} orgSlug={orgSlug} />
    </>
  );
}
