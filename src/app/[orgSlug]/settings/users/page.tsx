import { notFound } from "next/navigation";

import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import { getUserRoleBreakdown, listOrganizationUsers } from "@/modules/users/service";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";

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

      <section className="grid gap-4 md:grid-cols-3">
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
        description="Directorio principal de miembros del espacio de trabajo."
      >
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 p-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-lg font-semibold text-slate-950">{user.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {user.jobTitle} / {user.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={user.isActive ? "Activo" : "Inactivo"} tone="success" />
                <StatusBadge label={ROLE_MAP[user.role] ?? user.role} tone="info" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
