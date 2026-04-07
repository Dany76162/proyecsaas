import { requireOrganizationMembership, assertMinimumRole } from "@/server/auth/access";
import { listOrganizationAvailability } from "@/modules/availability/service";
import { AvailabilitySettingsUI } from "./AvailabilitySettingsUI";

export default async function AvailabilitySettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, "ADMIN");

  const slots = await listOrganizationAvailability(orgSlug);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Disponibilidad para Visitas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configurá los bloques horarios de la inmobiliaria. Nuestro Agente IA usará estar información real para 
          proponerle fechas de visitas a los leads cuando estén interesados en una propiedad.
        </p>
      </div>
      
      <AvailabilitySettingsUI orgSlug={orgSlug} initialSlots={slots} />
    </div>
  );
}
