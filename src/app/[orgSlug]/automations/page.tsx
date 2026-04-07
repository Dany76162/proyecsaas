import { WorkspaceIntro } from "@/components/workspace/workspace-intro";

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <WorkspaceIntro
      title="Automations"
      orgSlug={orgSlug}
      description="Esta funcionalidad se encuentra en desarrollo. Próximamente podrás configurar flujos y reglas automáticas desde aquí."
    />
  );
}
