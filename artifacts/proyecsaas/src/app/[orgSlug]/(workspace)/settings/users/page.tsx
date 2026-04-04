export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
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
      <WorkspaceHeader organization={organization}>
        <InviteUserDialog orgSlug={orgSlug} />
      </WorkspaceHeader>

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
