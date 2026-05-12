import { requirePlatformAdmin } from "@/server/auth/access";
import { getMetaConnectionStatus } from "@/modules/agents/meta-service";
import MetaIntegrationClient from "./MetaIntegrationClient";

export default async function MetaIntegrationPage() {
  await requirePlatformAdmin();
  const status = await getMetaConnectionStatus();

  return (
    <div className="p-6">
      <MetaIntegrationClient initialStatus={status} />
    </div>
  );
}
