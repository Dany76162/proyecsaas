"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/server/auth/access";
import { 
  createProspect, 
  updateProspect, 
  logProspectActivity, 
  calculateProspectScores 
} from "./service";
import { 
  ProspectStatus, 
  ProspectCompanyType, 
  Prisma 
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getOpenAIClient, OPENAI_MODEL } from "@/modules/agents/service";

export async function createProspectAction(formData: FormData) {
  const user = await requirePlatformAdmin();
  
  const companyName = formData.get("companyName") as string;
  if (!companyName) throw new Error("Nombre de empresa es obligatorio");

  const prospect = await createProspect({
    companyName,
    companyType: (formData.get("companyType") as ProspectCompanyType) || "OTHER_REAL_ESTATE",
    country: formData.get("country") as string,
    region: formData.get("region") as string,
    city: formData.get("city") as string,
    website: formData.get("website") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    whatsapp: formData.get("whatsapp") as string,
    instagramUrl: formData.get("instagramUrl") as string,
    facebookUrl: formData.get("facebookUrl") as string,
    linkedinUrl: formData.get("linkedinUrl") as string,
    sourceUrl: formData.get("sourceUrl") as string,
    sourceName: formData.get("sourceName") as string,
    notes: formData.get("notes") as string,
    status: "NEEDS_REVIEW"
  }, user.id);

  await calculateProspectScores(prospect.id);
  
  revalidatePath("/platform/agents/prospecting");
  redirect(`/platform/agents/prospecting/${prospect.id}`);
}

export async function updateProspectStatusAction(id: string, status: ProspectStatus, reason?: string) {
  const user = await requirePlatformAdmin();
  
  const data: Prisma.CommercialProspectUpdateInput = { status };
  
  if (status === "APPROVED") {
    data.approvedAt = new Date();
    data.approvedByUserId = user.id;
  } else if (status === "DISCARDED") {
    data.discardedAt = new Date();
    data.discardedReason = reason;
  } else if (status === "DO_NOT_CONTACT") {
    data.isDoNotContact = true;
    data.doNotContactReason = reason;
  }

  await updateProspect(id, data, user.id);
  await logProspectActivity(id, status.toLowerCase() as any, `Estado cambiado a ${status}${reason ? `: ${reason}` : ""}`, user.id);
  
  revalidatePath("/platform/agents/prospecting");
  revalidatePath(`/platform/agents/prospecting/${id}`);
  return { success: true };
}

export async function generateProspectingEmailAction(prospectId: string) {
  const user = await requirePlatformAdmin();
  
  const prospect = await prisma.commercialProspect.findUnique({ where: { prospectId: prospectId } as any }); // Fix Prisma where if needed
  // Correct Prisma syntax for unique find:
  const p = await prisma.commercialProspect.findUnique({ where: { id: prospectId } });
  if (!p) throw new Error("Prospecto no encontrado");

  const openai = getOpenAIClient();
  
  const prompt = `Genera un email comercial personalizado para una empresa del rubro inmobiliario.
Empresa: ${p.companyName}
Tipo: ${p.companyType}
Ubicación: ${p.city}, ${p.country}
Website: ${p.website || "N/A"}

El objetivo es presentar RaicesPilot: una plataforma de infraestructura operativa que centraliza leads, propiedades y usa IA para seguimiento comercial.
Tono: Profesional, no invasivo, consultivo.
CTA: "Conocer RaicesPilot" o "Solicitar una demo de 15 min".

IMPORTANTE:
- Sé breve.
- Personaliza según el tipo de empresa.
- Incluye una despedida que permita la baja (ej: "Si no deseas recibir más información, responde 'baja'").
- Identifica claramente que contactas de parte de RaicesPilot.

Devuelve un JSON con:
{
  "subject": "Asunto atractivo",
  "body": "Cuerpo del email"
}`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: "Eres un experto en ventas B2B para el sector PropTech / Real Estate." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const content = JSON.parse(response.choices[0].message.content || "{}");

  const draft = await prisma.prospectingMessageDraft.create({
    data: {
      prospectId: p.id,
      subject: content.subject,
      body: content.body,
      generatedByAgent: true,
      status: "DRAFT"
    }
  });

  await logProspectActivity(p.id, "email_draft_generated", "Borrador de email generado por IA", user.id);
  
  revalidatePath(`/platform/agents/prospecting/${p.id}`);
  return { success: true, draft };
}

export async function markDraftSentAction(draftId: string) {
  const user = await requirePlatformAdmin();
  
  const draft = await prisma.prospectingMessageDraft.update({
    where: { id: draftId },
    data: {
      status: "SENT_MANUALLY",
      updatedAt: new Date()
    }
  });

  await prisma.commercialProspect.update({
    where: { id: draft.prospectId },
    data: {
      status: "CONTACTED",
      lastContactedAt: new Date(),
      contactedAt: {
        set: (await prisma.commercialProspect.findUnique({ where: { id: draft.prospectId } }))?.contactedAt || new Date()
      }
    }
  });

  await logProspectActivity(draft.prospectId, "contact_marked_sent", "Mensaje marcado como enviado manualmente", user.id);
  
  revalidatePath("/platform/agents/prospecting");
  return { success: true };
}
