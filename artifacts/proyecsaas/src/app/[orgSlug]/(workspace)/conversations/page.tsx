export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";

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
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
              <span className="text-sm font-semibold text-emerald-700">Chat Centralizado</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Inbox IA
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Seguí en tiempo real las charlas de tus clientes con la IA e intervení cuando sea necesario.
            </p>
          </div>
        </div>
      </section>
      {success === "property-linked" ? (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800 shadow-soft">
          Propiedad vinculada actualizada desde el Inbox IA.
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
              ← Volver al Inbox
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
