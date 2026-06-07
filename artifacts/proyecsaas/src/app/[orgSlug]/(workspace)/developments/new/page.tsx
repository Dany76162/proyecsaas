export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { requireOrganizationMembership, assertMinimumRole } from "@/server/auth/access";
import { createDevelopmentAction } from "@/modules/developments/actions";
import { MembershipRole } from "@prisma/client";
import { Button } from "@/components/ui/button";

export default async function NewDevelopmentPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.ADMIN);

  async function handleCreate(formData: FormData) {
    "use server";
    const result = await createDevelopmentAction(orgSlug, {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
      address: String(formData.get("address") ?? "") || undefined,
      city: String(formData.get("city") ?? "") || undefined,
      province: String(formData.get("province") ?? "") || undefined,
    });
    if (result.success && result.data?.developmentId) {
      redirect(`/${orgSlug}/developments/${result.data.developmentId}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/${orgSlug}/developments`} className="text-slate-500 hover:text-slate-800 transition">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Nuevo Desarrollo</h1>
      </div>

      <form action={handleCreate} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
            placeholder="Ej. Barrio Privado El Parque"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Descripción</label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 resize-none"
            placeholder="Descripción del desarrollo..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ciudad</label>
            <input
              name="city"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
              placeholder="Ej. Rosario"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Provincia</label>
            <input
              name="province"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
              placeholder="Ej. Santa Fe"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Dirección</label>
          <input
            name="address"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30"
            placeholder="Ruta 9, Km 45"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="ghost" asChild>
            <Link href={`/${orgSlug}/developments`}>Cancelar</Link>
          </Button>
          <Button type="submit">Crear desarrollo</Button>
        </div>
      </form>
    </div>
  );
}
