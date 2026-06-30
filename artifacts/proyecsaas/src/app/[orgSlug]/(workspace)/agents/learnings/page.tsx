export const dynamic = "force-dynamic";

import { Lightbulb } from "lucide-react";

import { requireOrganizationMembership } from "@/server/auth/access";
import { getAllLearningsForOrg, countActiveLearnings } from "@/modules/learnings/service";
import { MAX_ACTIVE_LEARNINGS } from "@/modules/learnings/service";
import { LearningsPanel } from "./learnings-panel";

const TYPE_LABELS: Record<string, string> = {
  CORRECCION_HUMANA: "Corrección humana",
  PATRON_DE_EXITO: "Patrón de éxito",
  OBJECION_FRECUENTE: "Objeción frecuente",
  PREFERENCIA_COMERCIAL: "Preferencia comercial",
  REGLA_OPERATIVA: "Regla operativa",
};

export default async function LearningsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);
  const orgId = membership.organization.id;
  const isManager = membership.role === "OWNER" || membership.role === "ADMIN";

  const [learnings, activeCount] = await Promise.all([
    getAllLearningsForOrg(orgId),
    countActiveLearnings(orgId),
  ]);

  return (
    <>
      <section className="rounded-[1.75rem] border bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-700">
                {activeCount}/{MAX_ACTIVE_LEARNINGS} activos
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Aprendizajes del agente
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-slate-500">
              Registra correcciones, patrones exitosos y reglas que tus agentes IA
              deben seguir. Se inyectan automáticamente en cada respuesta.
            </p>
          </div>
        </div>
      </section>

      <LearningsPanel
        orgSlug={orgSlug}
        learnings={learnings.map((l) => ({
          id: l.id,
          type: l.type,
          typeLabel: TYPE_LABELS[l.type] ?? l.type,
          title: l.title,
          content: l.content,
          priority: l.priority,
          isActive: l.isActive,
          createdByName: l.createdBy?.fullName ?? "—",
          createdAt: l.createdAt.toISOString(),
        }))}
        activeCount={activeCount}
        maxActive={MAX_ACTIVE_LEARNINGS}
        isManager={isManager}
      />
    </>
  );
}
