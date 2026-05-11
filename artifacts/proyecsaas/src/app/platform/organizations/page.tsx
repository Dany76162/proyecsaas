export const dynamic = "force-dynamic";

import { listOrganizationsForPlatform, listPlatformPlans } from "@/modules/platform/service";
import { OrgTable } from "./OrgTable";

import { SectionHeader } from "@/components/ui/layout-ui";

export default async function PlatformOrganizationsPage() {
  const platformOrgId = process.env.WHATSAPP_ORGANIZATION_ID?.trim() || null;
  const [orgs, plans] = await Promise.all([
    listOrganizationsForPlatform(),
    listPlatformPlans(),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Clientes / Inmobiliarias" 
        description={`${orgs.length} inmobiliaria${orgs.length !== 1 ? "s" : ""} registrada${orgs.length !== 1 ? "s" : ""} en la plataforma, incluyendo papelera.`}
      />
      <OrgTable orgs={orgs} plans={plans} platformOrgId={platformOrgId} />
    </div>
  );
}
