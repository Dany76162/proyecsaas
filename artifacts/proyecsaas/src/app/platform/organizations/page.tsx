export const dynamic = "force-dynamic";

import { listOrganizationsForPlatform } from "@/modules/platform/service";
import { OrgTable } from "./OrgTable";

export default async function PlatformOrganizationsPage() {
  const orgs = await listOrganizationsForPlatform();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Clientes / Inmobiliarias
        </h1>
        <p className="text-sm text-slate-500">
          {orgs.length} inmobiliaria{orgs.length !== 1 ? "s" : ""} registrada{orgs.length !== 1 ? "s" : ""} en la plataforma.
        </p>
      </div>
      <OrgTable orgs={orgs} />
    </div>
  );
}
