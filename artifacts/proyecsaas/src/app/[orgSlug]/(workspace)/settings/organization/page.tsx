export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { getOrganizationWorkspace } from "@/modules/organizations/service";
import {
  OrganizationProfileForm,
  PropertySourceForm,
} from "@/components/organizations/organization-settings-forms";

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const [organization, orgProfile] = await Promise.all([
    getOrganizationWorkspace(orgSlug),
    prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: {
        name: true,
        city: true,
        marketFocus: true,
        description: true,
        contactEmail: true,
        contactPhone: true,
        contactWhatsapp: true,
        website: true,
        businessHours: true,
        propertySourceUrl: true,
        propertySourceType: true,
        propertySourceStatus: true,
        propertySourceSyncedAt: true,
      },
    }),
  ]);

  if (!organization || !orgProfile) {
    notFound();
  }

  return (
    <>
      <WorkspaceHeader organization={organization} />

      <section className="grid gap-6 md:grid-cols-3">
        <MetricCard
          label="Identificador (slug)"
          value={organization.slug}
          hint="Identificador único del tenant. No se puede modificar."
        />
        <MetricCard
          label="Plan"
          value={organization.planLabel || "Sin asignar"}
          hint="Plan comercial asignado desde el panel superadmin."
        />
        <MetricCard
          label="Mercado"
          value={organization.city || "Sin definir"}
          hint="Ciudad o zona principal de operación."
        />
      </section>

      <SectionCard
        eyebrow="Configuración"
        title="Perfil de la inmobiliaria"
        description="Nombre, contacto y horario operativo. Solo los administradores pueden editar estos datos."
      >
        <OrganizationProfileForm
          orgSlug={orgSlug}
          initial={{
            name: orgProfile.name,
            city: orgProfile.city,
            marketFocus: orgProfile.marketFocus,
            description: orgProfile.description,
            contactEmail: orgProfile.contactEmail,
            contactPhone: orgProfile.contactPhone,
            contactWhatsapp: orgProfile.contactWhatsapp,
            website: orgProfile.website,
            businessHours: orgProfile.businessHours,
          }}
        />
      </SectionCard>

      <SectionCard
        eyebrow="Inventario"
        title="Fuente de propiedades"
        description="Pegá la URL del listado de propiedades de tu sitio web y hacé clic en 'Sincronizar ahora'. El sistema importará todas las propiedades automáticamente usando IA."
      >
        <PropertySourceForm
          orgSlug={orgSlug}
          initial={{
            propertySourceUrl: orgProfile.propertySourceUrl,
            propertySourceType: orgProfile.propertySourceType,
            propertySourceStatus: orgProfile.propertySourceStatus,
            propertySourceSyncedAt: orgProfile.propertySourceSyncedAt?.toISOString() ?? null,
            websiteFallback: orgProfile.website,
          }}
        />
      </SectionCard>
    </>
  );
}
