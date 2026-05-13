export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";

import { requireOrganizationMembership, assertMinimumRole } from "@/server/auth/access";
import { getAvailableChannels } from "@/modules/agents/service";
import { createAgent } from "@/modules/agents/actions";
import { AgentForm } from "../agent-form";

export default async function NewAgentPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  
  try {
    const { membership } = await requireOrganizationMembership(orgSlug);
    assertMinimumRole(membership.role, "ADMIN");

    const orgId = membership.organization.id;
    
    // getAvailableChannels uses isActive filter which might fail if DB is out of sync
    let channels: any[] = [];
    try {
      channels = await getAvailableChannels(orgId);
    } catch (err) {
      console.error("[NewAgentPage] Error fetching channels:", err);
      // Fallback: try without isActive filter if it fails
      // Note: we can't easily change the service here without modifying it, 
      // but we can at least catch the error and continue with empty channels.
    }

    async function handleCreate(formData: FormData) {
      "use server";
      const result = await createAgent(orgSlug, {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || undefined,
        tone: (formData.get("tone") as "FORMAL" | "FRIENDLY" | "NEUTRAL") ?? "FRIENDLY",
        language: (formData.get("language") as string) || "es-AR",
        persona: (formData.get("persona") as string) || undefined,
        is24x7: formData.get("is24x7") === "true",
        whatsappChannelId: (formData.get("whatsappChannelId") as string) || null,
        zoneFilters: ((formData.get("zoneFilters") as string) || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        propertyTypes: formData.getAll("propertyTypes") as string[],
        minBudget: formData.get("minBudget") ? Number(formData.get("minBudget")) : null,
        maxBudget: formData.get("maxBudget") ? Number(formData.get("maxBudget")) : null,
        escalateAfterMessages: Number(formData.get("escalateAfterMessages") ?? "5"),
        escalateOnKeywords: ((formData.get("escalateOnKeywords") as string) || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        humanHandoffMessage: (formData.get("humanHandoffMessage") as string) || undefined,
      });

      if (result.success) {
        redirect(`/${orgSlug}/agents`);
      }
    }

    return (
      <AgentForm
        orgSlug={orgSlug}
        action={handleCreate}
        channels={channels}
        mode="create"
      />
    );
  } catch (error: any) {
    console.error("[NewAgentPage] Critical error:", error);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-white rounded-[2rem] border border-slate-200 p-10 shadow-soft max-w-lg w-full">
          <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">
            ⚠️
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Antes de crear tu agente IA</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Ocurrió un error al cargar la configuración. Asegúrate de tener al menos un canal de WhatsApp conectado o contacta a soporte técnico si el problema persiste.
          </p>
          <div className="flex flex-col gap-3">
            <Link 
              href={`/${orgSlug}/settings/integrations`}
              className="bg-brand-500 text-white font-bold py-3 px-6 rounded-xl hover:bg-brand-600 transition"
            >
              Configurar WhatsApp
            </Link>
            <Link 
              href={`/${orgSlug}/onboarding`}
              className="bg-slate-50 text-slate-600 font-bold py-3 px-6 rounded-xl hover:bg-slate-100 transition"
            >
              Volver a Bienvenida
            </Link>
          </div>
          <p className="mt-6 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Código de error: {error.code || "500_AGENT_CONFIG"}
          </p>
        </div>
      </div>
    );
  }
}
