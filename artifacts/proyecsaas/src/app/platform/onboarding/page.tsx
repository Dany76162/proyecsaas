export const dynamic = "force-dynamic";

import { prisma } from "@/server/db/prisma";

function statusChip(usedAt: Date | null, expiresAt: Date) {
  const now = new Date();
  if (usedAt) return { label: "Activada", cls: "bg-emerald-50 text-emerald-700" };
  if (expiresAt < now) return { label: "Expirada", cls: "bg-slate-100 text-slate-400" };
  return { label: "Pendiente", cls: "bg-amber-50 text-amber-700" };
}

export default async function PlatformOnboardingPage() {
  const invites = await prisma.inviteToken.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      organization: {
        select: {
          name: true,
          slug: true,
        },
      },
      user: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
  });

  const pending = invites.filter((i) => !i.usedAt && i.expiresAt >= new Date()).length;
  const activated = invites.filter((i) => i.usedAt).length;
  const expired = invites.filter((i) => !i.usedAt && i.expiresAt < new Date()).length;

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historial de Altas</h1>
        <p className="text-sm text-slate-500">
          Invitaciones generadas desde el panel superadmin. El primer acceso se genera desde{" "}
          <a href="/platform/organizations" className="font-semibold text-slate-700 underline underline-offset-2">
            Clientes / Inmobiliarias
          </a>
          .
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pendientes</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Activadas</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-600">{activated}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Expiradas</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-400">{expired}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5">Usuario</th>
                <th className="px-5 py-3.5">Organización</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Generada</th>
                <th className="px-5 py-3.5">Expira / Usada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.map((invite) => {
                const chip = statusChip(invite.usedAt, invite.expiresAt);
                return (
                  <tr key={invite.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{invite.user.fullName}</p>
                      <p className="text-xs text-slate-500">{invite.user.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      {invite.organization ? (
                        <div>
                          <p className="font-medium text-slate-800">{invite.organization.name}</p>
                          <p className="text-xs text-slate-400">/{invite.organization.slug}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${chip.cls}`}>
                        {chip.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{formatDate(invite.createdAt)}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {invite.usedAt ? formatDate(invite.usedAt) : formatDate(invite.expiresAt)}
                    </td>
                  </tr>
                );
              })}
              {invites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <p className="text-base font-semibold text-slate-900">Sin invitaciones generadas</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Creá una inmobiliaria y generá el primer acceso desde la tabla de Clientes.
                    </p>
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
