export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { prisma } from "@/server/db/prisma";
import { MetricCard } from "@/components/workspace/metric-card";
import { SectionCard } from "@/components/workspace/section-card";
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
        propertySourceErrorMessage: true,
        propertySourceAttemptCount: true,
      },
    }),
  ]);

  if (!organization || !orgProfile) {
    notFound();
  }

  return (
    <>
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.15)]" />
              <span className="text-sm font-semibold text-slate-600">Perfil de empresa</span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              Organización
            </h1>
            <p className="mt-2 max-w-xl text-base text-slate-500 font-medium">
              Gestioná la identidad de tu inmobiliaria, datos de contacto y fuentes de sincronización de propiedades.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <MetricCard
          label="Identificador único"
          value={organization.slug}
          hint="Identificador único de tu organización. No se puede modificar."
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
            propertySourceErrorMessage: orgProfile.propertySourceErrorMessage,
            propertySourceAttemptCount: orgProfile.propertySourceAttemptCount,
            websiteFallback: orgProfile.website,
          }}
        />
      </SectionCard>
    </>
  );
}
