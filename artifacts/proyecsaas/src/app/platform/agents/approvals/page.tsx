import { approveOrRejectDraft } from "@/modules/agents/actions";
import { listAgentApprovals } from "@/modules/agents/service";

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

export default async function PlatformAgentsApprovalsPage() {
  const approvals = await listAgentApprovals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Aprobaciones pendientes</h1>
        <p className="text-sm text-slate-500">Aprueba o rechaza el contenido generado por AgentOS.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Tarea</th>
                <th className="px-6 py-4 font-semibold">Agente</th>
                <th className="px-6 py-4 font-semibold">Solicitado</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {approvals.map((approval) => (
                <tr key={approval.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{approval.task.title}</p>
                    <p className="text-xs text-slate-500">{approval.task.description ?? "Sin descripción"}</p>
                  </td>
                  <td className="px-6 py-4">{approval.requestedByAgent?.name ?? "Agente IA"}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(approval.requestedAt).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
                      {APPROVAL_STATUS_LABELS[approval.status] || approval.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <form action={approveOrRejectDraft} className="flex-1">
                        <input type="hidden" name="approvalId" value={approval.id} />
                        <input type="hidden" name="decision" value="APPROVED" />
                        <input type="hidden" name="comments" value="Aprobado desde Superadmin" />
                        <button
                          type="submit"
                          className="w-full rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Aprobar
                        </button>
                      </form>
                      <form action={approveOrRejectDraft} className="flex-1">
                        <input type="hidden" name="approvalId" value={approval.id} />
                        <input type="hidden" name="decision" value="REJECTED" />
                        <input type="hidden" name="comments" value="Rechazado desde Superadmin" />
                        <button
                          type="submit"
                          className="w-full rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                        >
                          Rechazar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {approvals.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No hay aprobaciones pendientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
