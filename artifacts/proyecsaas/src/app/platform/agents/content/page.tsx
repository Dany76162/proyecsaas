import { listAgentContentDrafts } from "@/modules/agents/service";

const DRAFT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export default async function PlatformAgentsContentPage() {
  const drafts = await listAgentContentDrafts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Borradores de contenido</h1>
        <p className="text-sm text-slate-500">Revisa los borradores generados por el Agente de Marketing.</p>
      </div>

      <div className="grid gap-4">
        {drafts.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            No hay borradores disponibles todavía.
          </div>
        ) : (
          drafts.map((draft) => (
            <div key={draft.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">{draft.platform}</p>
                  <h2 className="text-xl font-semibold text-slate-900">{draft.title ?? "Título no proporcionado"}</h2>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {DRAFT_STATUS_LABELS[draft.status] || draft.status}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-700">{draft.content}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {draft.hashtags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
