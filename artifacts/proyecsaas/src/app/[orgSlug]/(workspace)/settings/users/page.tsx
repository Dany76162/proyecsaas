export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getUserRoleBreakdown, listOrganizationUsers } from "@/modules/users/service";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { EditMemberDialog } from "@/components/users/edit-member-dialog";

const ROLE_MAP: Record<string, string> = {
  OWNER: "Titular",
  ADMIN: "Administrador",
  AGENT: "Agente de ventas",
  ASSISTANT: "Asistente",
};

export default async function UsersSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const [organization, users, roleBreakdown] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    listOrganizationUsers(orgSlug),
    getUserRoleBreakdown(orgSlug),
  ]);

  if (!organization) {
    notFound();
  }

  return (
    <>
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]" />
              <span className="text-sm font-semibold text-blue-700">Administración de Equipo</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Usuarios y roles
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Gestioná los miembros de tu equipo, sus accesos y roles dentro del espacio de trabajo.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <InviteUserDialog orgSlug={orgSlug} />
          </div>
        </div>
      </section>

      {/* Tarjeta explicativa sobre accesos de equipo y roles */}
      <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>👥</span> ¿Cómo funciona el acceso para tu equipo?
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
              Podés invitar a todos los asesores y empleados de tu inmobiliaria enviándoles un enlace personal de registro. Esto permite colaborar en el panel, dar seguimiento a las oportunidades e intervenir manualmente en chats de WhatsApp cuando sea necesario, sin compartir claves maestras.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { role: "Titular", desc: "Dueño de la inmobiliaria. Acceso total a configuraciones, facturación y eliminación de datos." },
            { role: "Administrador", desc: "Gestión completa de propiedades, agentes de IA, invitaciones de equipo y asignación de números." },
            { role: "Agente de ventas", desc: "Puede ver propiedades, gestionar sus propias oportunidades asignadas y chatear con clientes." },
            { role: "Asistente", desc: "Acceso de lectura y actualización básica para mantenimiento de catálogo y fichas." }
          ].map((r) => (
            <div key={r.role} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">{r.role}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <MetricCard
          label="Miembros"
          value={String(users.length)}
          hint="Personas con acceso asignado a esta organización."
        />
        <MetricCard
          label="Roles activos"
          value={String(roleBreakdown.length)}
          hint="Visibilidad clara de los roles para asegurar transparencia."
        />
        <MetricCard
          label="Titulares/Administradores"
          value={String(
            roleBreakdown
              .filter((item) => item.role !== "ASSISTANT" && item.role !== "AGENT")
              .reduce((sum, item) => sum + item.count, 0),
          )}
          hint="Roles de liderazgo actualmente representados en la cuenta."
        />
      </section>

      <SectionCard
        eyebrow="Equipo"
        title="Usuarios y roles"
        description="Directorio de miembros del espacio de trabajo con su perfil de contacto."
      >
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 p-5 md:flex-row md:items-start md:justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-slate-950">{user.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {user.jobTitle} · {user.email}
                </p>
                {/* Contact details — show if populated */}
                {(user.phone || user.whatsapp || user.zone) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {user.phone && <span>Tel: {user.phone}</span>}
                    {user.whatsapp && <span>WA: {user.whatsapp}</span>}
                    {user.zone && <span>Zona: {user.zone}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge label={user.isActive ? "Activo" : "Inactivo"} tone={user.isActive ? "success" : "neutral"} />
                <StatusBadge label={ROLE_MAP[user.role] ?? user.role} tone="info" />
                <EditMemberDialog orgSlug={orgSlug} member={user} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
