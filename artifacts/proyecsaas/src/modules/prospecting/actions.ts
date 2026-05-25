"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/server/auth/access";
import { 
  createProspect, 
  updateProspect, 
  logProspectActivity, 
  calculateProspectScores,
  canGenerateEmail,
  detectPotentialDuplicates
} from "./service";
import { 
  ProspectStatus, 
  ProspectCompanyType, 
  ManualRating,
  ProspectPriority,
  ManualProspectStatus,
  Prisma 
} from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getOpenAIClient, OPENAI_MODEL } from "@/modules/agents/service";
import { generateUnsubscribeToken } from "./campaign-service";

// ─── Search API Integration (Serper.dev) ────────────────────────────────────

export async function convertToOrganizationAction(prospectId: string) {
  const p = await prisma.commercialProspect.findUnique({ where: { id: prospectId } });
  if (!p) throw new Error("Prospecto no encontrado");

  const slug = p.companyName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Math.random().toString(36).substring(2, 5);

  const org = await prisma.organization.create({
    data: {
      name: p.companyName,
      slug,
      city: p.city,
      contactEmail: p.email,
      website: p.website,
      marketFocus: p.companyType,
      isActive: true,
      planLabel: "PROSPECT_CONVERTED"
    }
  });

  await prisma.commercialProspect.update({
    where: { id: prospectId },
    data: { 
      status: "CONVERTED" as any,
      manualStatus: "APTO_CONTACTO" 
    }
  });

  await logProspectActivity(
    prospectId,
    "converted_to_org" as any,
    `Convertido a organización real: ${org.name} (Slug: ${slug})`
  );

  return org;
}

async function searchWebViaSerper(query: string) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY no configurada");

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: query,
      gl: "ar", // Default to Argentina, but will be dynamic
      hl: "es"
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error en Serper: ${error}`);
  }

  return response.json();
}

// ─── Create ─────────────────────────────────────────────────────────────────

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

// ─── Status ─────────────────────────────────────────────────────────────────

export async function updateProspectStatusAction(id: string, status: ProspectStatus, reason?: string) {
  const user = await requirePlatformAdmin();
  
  const data: Prisma.CommercialProspectUpdateInput = { status };
  
  if (status === "APPROVED") {
    data.approvedAt = new Date();
    data.approvedByUserId = user.id;
    data.manualStatus = "APTO_CONTACTO";
    data.reviewedByUserId = user.id;
    data.reviewedAt = new Date();
  } else if (status === "DISCARDED") {
    data.discardedAt = new Date();
    data.discardedReason = reason;
    data.manualStatus = "DESCARTAR";
  } else if (status === "DO_NOT_CONTACT") {
    data.isDoNotContact = true;
    data.doNotContactReason = reason;
    data.manualStatus = "NO_CONTACTAR";
  }

  await updateProspect(id, data, user.id);
  await logProspectActivity(id, status.toLowerCase() as any, `Estado cambiado a ${status}${reason ? `: ${reason}` : ""}`, user.id);
  
  revalidatePath("/platform/agents/prospecting");
  revalidatePath(`/platform/agents/prospecting/${id}`);
  return { success: true };
}

// ─── Manual Qualification ───────────────────────────────────────────────────

export async function updateManualQualificationAction(formData: FormData) {
  const user = await requirePlatformAdmin();
  
  const prospectId = formData.get("prospectId") as string;
  if (!prospectId) throw new Error("ID del prospecto es obligatorio");

  const manualRating = (formData.get("manualRating") as ManualRating) || null;
  const priority = (formData.get("priority") as ProspectPriority) || null;
  const manualStatus = (formData.get("manualStatus") as ManualProspectStatus) || null;
  const manualNotes = (formData.get("manualNotes") as string) || null;
  const contactLaterDateStr = formData.get("contactLaterDate") as string;

  const data: Prisma.CommercialProspectUpdateInput = {
    reviewedByUserId: user.id,
    reviewedAt: new Date(),
  };

  if (manualRating) data.manualRating = manualRating;
  if (priority) data.priority = priority;
  if (manualNotes !== null) data.manualNotes = manualNotes;
  if (contactLaterDateStr) data.contactLaterDate = new Date(contactLaterDateStr);

  if (manualStatus) {
    data.manualStatus = manualStatus;
    
    // Sync system status based on manual decision
    if (manualStatus === "APTO_CONTACTO") {
      data.status = "CONTACT_READY";
      data.approvedAt = new Date();
      data.approvedByUserId = user.id;
    } else if (manualStatus === "DESCARTAR") {
      data.status = "DISCARDED";
      data.discardedAt = new Date();
    } else if (manualStatus === "NO_CONTACTAR") {
      data.status = "DO_NOT_CONTACT";
      data.isDoNotContact = true;
    } else if (manualStatus === "REVISAR") {
      data.status = "NEEDS_REVIEW";
    }
  }

  await prisma.commercialProspect.update({ where: { id: prospectId }, data });

  // Log individual changes
  if (manualRating) {
    await logProspectActivity(prospectId, "manual_rating_updated", `Calificación manual: ${manualRating}`, user.id);
  }
  if (priority) {
    await logProspectActivity(prospectId, "priority_updated", `Prioridad: ${priority}`, user.id);
  }
  if (manualStatus) {
    await logProspectActivity(prospectId, "manual_status_updated", `Estado manual: ${manualStatus}`, user.id);
  }

  await logProspectActivity(prospectId, "review_completed", "Revisión manual completada", user.id);

  revalidatePath("/platform/agents/prospecting");
  revalidatePath(`/platform/agents/prospecting/${prospectId}`);
}

// ─── Email Generation (with eligibility check) ─────────────────────────────

export async function generateProspectingEmailAction(prospectId: string) {
  const user = await requirePlatformAdmin();
  
  const p = await prisma.commercialProspect.findUnique({ where: { id: prospectId } });
  if (!p) throw new Error("Prospecto no encontrado");

  // Check eligibility using manual qualification rules
  const eligibility = canGenerateEmail(p);
  if (!eligibility.allowed) {
    throw new Error(eligibility.reason);
  }

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

  const token = generateUnsubscribeToken(p.id);
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://raicespilot.com"}/unsubscribe/${token}`;
  const bodyWithUnsubscribe = `${content.body}\n\n---\nSi no deseas recibir más información, puedes desuscribirte aquí: ${unsubscribeUrl}`;

  const draft = await prisma.prospectingMessageDraft.create({
    data: {
      prospectId: p.id,
      subject: content.subject,
      body: bodyWithUnsubscribe,
      generatedByAgent: true,
      status: "DRAFT"
    }
  });

  await logProspectActivity(p.id, "email_draft_generated", "Borrador de email generado por IA", user.id);
  
  revalidatePath(`/platform/agents/prospecting/${p.id}`);
  return { success: true, draft };
}

// ─── Mark Sent ──────────────────────────────────────────────────────────────

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

// ─── Analysis & Extraction ──────────────────────────────────────────────────

export async function analyzeProspectsAction(rawText: string) {
  try {
    await requirePlatformAdmin();
    
    if (!rawText || rawText.length < 10) {
      throw new Error("El texto es demasiado corto para analizar.");
    }

    // Validate API Key before calling OpenAI to provide a gorgeous user friendly Spanish error message
    const rawKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const isKeyDummy = !rawKey || rawKey.trim() === "" || rawKey.trim() === "dummy" || rawKey.trim() === "placeholder" || rawKey.trim() === "sk-...";
    if (isKeyDummy) {
      return {
        success: false,
        error: "La clave de OpenAI (OPENAI_API_KEY) no está configurada o es inválida en Railway. Por favor, copiá tu clave API real (sk-proj-...) desde tu panel de OpenAI y configurala en las variables de entorno de tu servicio en Railway."
      };
    }

    const openai = getOpenAIClient();
    
    const prompt = `Analiza el siguiente texto y extrae una lista de empresas candidatas para prospección comercial en el rubro inmobiliario.
Texto:
"${rawText}"

Para cada empresa detectada, extrae:
- companyName (obligatorio)
- companyType (elige uno de: REAL_ESTATE_AGENCY, CONSTRUCTION_COMPANY, DEVELOPER, PROPERTY_MANAGER, ARCHITECTURE_STUDIO, REAL_ESTATE_INVESTOR, BROKER_AGENT, LAND_DEVELOPER, REAL_ESTATE_GROUP, OTHER_REAL_ESTATE)
- country
- region (provincia/estado)
- city
- website (url completa si es posible)
- email
- phone
- whatsapp
- sourceName (donde se encontró, ej: Google, Directorio X, etc)
- notes (breve descripción de lo que hace o por qué es candidato)

Devuelve un JSON con una lista:
{
  "candidates": [
    { ... },
    { ... }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: "Eres un experto en extracción de datos y lead generation para el sector inmobiliario." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = JSON.parse(response.choices[0].message.content || '{"candidates": []}');
    const candidates = content.candidates || [];

    // Check for duplicates/existing clients in the database for each candidate
    const enrichedCandidates = await Promise.all(candidates.map(async (c: any) => {
      const duplicates = await detectPotentialDuplicates(c.email, c.website, c.companyName);
      return {
        ...c,
        isDuplicate: duplicates.length > 0,
        existingId: duplicates[0]?.id || null,
        status: duplicates[0]?.status || null
      };
    }));

    return { success: true, candidates: enrichedCandidates };
  } catch (err: any) {
    console.error("Error in analyzeProspectsAction:", err);
    return {
      success: false,
      error: err.message || "Ocurrió un error inesperado al analizar los prospectos con IA."
    };
  }
}

// ─── Bulk Import ───────────────────────────────────────────────────────────

export async function importProspectsAction(candidates: any[]) {
  const user = await requirePlatformAdmin();
  
  const results = [];
  for (const c of candidates) {
    try {
      // Basic validation
      if (!c.companyName) continue;

      const prospect = await createProspect({
        companyName: c.companyName,
        companyType: c.companyType || "OTHER_REAL_ESTATE",
        country: c.country || null,
        region: c.region || null,
        city: c.city || null,
        website: c.website || null,
        email: c.email || null,
        phone: c.phone || null,
        whatsapp: c.whatsapp || null,
        instagramUrl: c.instagramUrl || null,
        facebookUrl: c.facebookUrl || null,
        linkedinUrl: c.linkedinUrl || null,
        sourceUrl: c.sourceUrl || null,
        sourceName: c.sourceName || "Importación Asistida",
        notes: c.notes || null,
        status: "NEEDS_REVIEW",
        manualStatus: "REVISAR"
      }, user.id);

      await calculateProspectScores(prospect.id);
      
      await logProspectActivity(prospect.id, "imported_from_search" as any, "Prospecto importado desde búsqueda asistida", user.id);
      
      results.push(prospect.id);
    } catch (err) {
      console.error(`Error importing candidate ${c.companyName}:`, err);
    }
  }

  revalidatePath("/platform/agents/prospecting");
  return { success: true, count: results.length };
}

// ─── Recalculate Scores ─────────────────────────────────────────────────────

export async function recalculateScoresAction(prospectId: string) {
  await requirePlatformAdmin();
  await calculateProspectScores(prospectId);
  revalidatePath(`/platform/agents/prospecting/${prospectId}`);
  revalidatePath("/platform/agents/prospecting");
  return { success: true };
}
// ─── Automated Web Search ───────────────────────────────────────────────────

export async function performWebSearchAction(params: {
  topic: string;
  city?: string;
  country?: string;
  region?: string;
}) {
  try {
    await requirePlatformAdmin();
    
    const { topic, city, country, region } = params;
    if (!topic) throw new Error("El rubro/tema es obligatorio");

    // Construct a powerful search query
    let query = `${topic}`;
    if (city) query += ` en ${city}`;
    if (region) query += `, ${region}`;
    if (country) query += `, ${country}`;
    
    // Specific terms to find contact info
    query += ' "email" "contacto" "web"';

    console.log(`[ProspectingSearch] Searching for: ${query}`);

    const searchResults = await searchWebViaSerper(query);
    
    // Convert results to a single text block for LLM analysis
    const resultsText = searchResults.organic?.map((r: any) => 
      `TITLE: ${r.title}\nLINK: ${r.link}\nSNIPPET: ${r.snippet}\n---`
    ).join("\n") || "";

    if (!resultsText) {
      return { success: true, candidates: [], message: "No se encontraron resultados relevantes." };
    }

    // Use the existing analysis logic but with the search results
    return await analyzeProspectsAction(`RESULTADOS DE BÚSQUEDA WEB PARA: ${query}\n\n${resultsText}`);
  } catch (err: any) {
    console.error("Error in performWebSearchAction:", err);
    return {
      success: false,
      error: err.message || "Ocurrió un error al realizar la búsqueda web automatizada."
    };
  }
}
