import { requirePlatformAdmin } from "@/server/auth/access";
import { getPlatformGovernanceOverview } from "@/modules/agents/governance-service";
import GovernanceClient from "./GovernanceClient";

export default async function AgentGovernancePage() {
  await requirePlatformAdmin();
  const overview = await getPlatformGovernanceOverview();

  return (
    <div className="p-6">
      <GovernanceClient initialOverview={overview} />
    </div>
  );
}
