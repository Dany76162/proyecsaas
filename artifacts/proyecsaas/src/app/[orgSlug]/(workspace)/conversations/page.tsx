export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { ConversationInbox } from "@/components/crm/conversation-inbox";
import { listOrganizationConversations } from "@/modules/conversations/service";
import { getOrganizationWorkspace } from "@/modules/organizations/service";

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ cursor?: string; success?: string; selected?: string }>;
}) {
  const { orgSlug } = await params;
  const { cursor, success, selected } = await searchParams;

  const [organization, { items: conversations, nextCursor }] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationConversations(orgSlug, cursor),
  ]);

  if (!organization) {
    notFound();
  }

  const isFirstPage = !cursor;

  return (
    <>
      <WorkspaceHeader organization={organization} />
      {success === "property-linked" ? (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-soft">
          Propiedad vinculada actualizada desde Conversaciones.
        </section>
      ) : null}

      {/* Pagination bar — only rendered when there are multiple pages */}
      {(!isFirstPage || nextCursor) && (
        <nav className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm">
          {!isFirstPage ? (
            <Link
              href={`/${orgSlug}/conversations`}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              ← Conversaciones recientes
            </Link>
          ) : (
            <span />
          )}
          {nextCursor ? (
            <Link
              href={`/${orgSlug}/conversations?cursor=${nextCursor}`}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Cargar más antiguas →
            </Link>
          ) : (
            <span className="text-slate-400">No hay más conversaciones</span>
          )}
        </nav>
      )}

      <ConversationInbox
        conversations={conversations}
        orgSlug={orgSlug}
        currentCursor={cursor}
        initialSelectedId={selected}
      />
    </>
  );
}
