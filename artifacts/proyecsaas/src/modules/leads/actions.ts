"use server";

import { LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { MembershipRole } from "@prisma/client";

import {
  readLeadCommercialSignals,
  writeLeadCommercialSignals,
} from "@/modules/leads/commercial-signals";
import { createLeadSchema, updateLeadSchema } from "@/modules/leads/schemas";
import { ACTIVATION_EVENTS, trackActivationEventOnce } from "@/server/activation/events";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { prisma } from "@/server/db/prisma";

const confirmLeadPropertySchema = z.object({
  orgSlug: z.string().trim().min(1),
  leadId: z.string().trim().min(1),
  propertyId: z.string().trim().min(1),
  redirectTo: z.string().trim().optional(),
});

function resolveSafeLeadRedirect(orgSlug: string, redirectTo?: string) {
  const fallback = `/${orgSlug}/leads`;

  if (!redirectTo) {
    return null;
  }

  if (!redirectTo.startsWith(`/${orgSlug}/`)) {
    return null;
  }

  return redirectTo;
}

export async function createLeadAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;

  const parsed = createLeadSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  const defaultOwner = await prisma.membership.findFirst({
    where: {
      organizationId: organization.id,
    },
    select: {
      userId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const leadCountBefore = await prisma.lead.count({
    where: {
      organizationId: organization.id,
    },
  });

  const lead = await prisma.lead.create({
    data: {
      organizationId: organization.id,
      ownerId: defaultOwner?.userId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      status: LeadStatus.NEW,
      source: "Ingreso manual",
      notes: "Creado manualmente desde el workspace del CRM.",
      interestLabel: "Nueva consulta",
      budgetLabel: "Pendiente de calificación",
      lastContactAt: new Date(),
    },
  });

  if (leadCountBefore === 0) {
    await trackActivationEventOnce(prisma, {
      event: ACTIVATION_EVENTS.firstLeadCreated,
      organizationId: organization.id,
      organizationSlug: organization.slug,
      organizationName: organization.name,
      metadata: {
        source: "manual",
        leadId: lead.id,
      },
    });
  }

  revalidatePath(`/${orgSlug}/leads`);
  revalidatePath(`/${orgSlug}`);
  redirect(`/${orgSlug}/leads/${lead.id}?success=lead-created`);
}

export async function updateLeadAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;

  const parsed = updateLeadSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    status: String(formData.get("status") ?? ""),
    propertyId: String(formData.get("propertyId") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  if (parsed.data.propertyId) {
    const property = await prisma.property.findFirst({
      where: {
        id: parsed.data.propertyId,
        organizationId: organization.id,
      },
      select: {
        id: true,
      },
    });

    if (!property) {
      return;
    }
  }

  const currentLead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      propertyId: true,
      notes: true,
      interestLabel: true,
      budgetLabel: true,
    },
  });

  if (!currentLead) {
    return;
  }

  const lead = await prisma.lead.updateMany({
    where: {
      id: leadId,
      organizationId: organization.id,
    },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      status: parsed.data.status,
      propertyId: parsed.data.propertyId || null,
      lastContactAt: new Date(),
    },
  });

  if (!lead.count) {
    return;
  }

  const updatedLead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: organization.id,
    },
    select: {
      id: true,
    },
  });

  if (!updatedLead) {
    return;
  }

  if (currentLead.propertyId !== (parsed.data.propertyId || null)) {
    const propertyTitle = parsed.data.propertyId
      ? (
          await prisma.property.findFirst({
            where: {
              id: parsed.data.propertyId,
              organizationId: organization.id,
            },
            select: {
              title: true,
            },
          })
        )?.title ?? null
      : null;
    const currentSignals = readLeadCommercialSignals({
      notes: currentLead.notes,
      interestLabel: currentLead.interestLabel,
      budgetLabel: currentLead.budgetLabel,
    });

    await prisma.lead.update({
      where: {
        id: updatedLead.id,
      },
      data: {
        notes: writeLeadCommercialSignals(currentLead.notes, {
          leadTemperature: currentSignals.leadTemperature,
          extractedPreferences: currentSignals.extractedPreferences,
          nextBestAction: currentSignals.nextBestAction,
          automationSummary: parsed.data.propertyId
            ? `Un miembro del equipo ${currentLead.propertyId ? "modificó" : "confirmó"} manualmente la propiedad vinculada al lead.`
            : "Un miembro del equipo eliminó manualmente la propiedad vinculada al lead.",
          requiresFollowUp: currentSignals.requiresFollowUp,
          followUpReason: currentSignals.followUpReason,
          propertyMatch: parsed.data.propertyId
            ? {
                status: currentLead.propertyId ? "manual-overridden" : "manual-confirmed",
                propertyId: parsed.data.propertyId,
                propertyTitle,
                score: null,
                consideredSignals:
                  currentSignals.propertyMatch?.consideredSignals ?? [],
                shortlist: currentSignals.propertyMatch?.shortlist ?? [],
                reasons: [
                  currentLead.propertyId
                    ? "Un miembro del equipo reemplazó manualmente la propiedad vinculada desde el workspace."
                    : "Un miembro del equipo confirmó manualmente una propiedad desde el contexto sugerido.",
                ],
              }
            : {
                status: "no-match",
                propertyId: null,
                propertyTitle: null,
                score: null,
                consideredSignals: currentSignals.propertyMatch?.consideredSignals ?? [],
                shortlist: currentSignals.propertyMatch?.shortlist ?? [],
                reasons: ["Un miembro del equipo eliminó manualmente la propiedad vinculada."],
              },
        }),
      },
    });
  }

  revalidatePath(`/${orgSlug}/leads`);
  revalidatePath(`/${orgSlug}/leads/${leadId}`);
  revalidatePath(`/${orgSlug}/properties`);
  revalidatePath(`/${orgSlug}`);
  redirect(`/${orgSlug}/leads/${updatedLead.id}?success=lead-updated`);
}

export async function confirmLeadPropertyAction(formData: FormData) {
  const parsed = confirmLeadPropertySchema.safeParse({
    orgSlug: String(formData.get("orgSlug") ?? ""),
    leadId: String(formData.get("leadId") ?? ""),
    propertyId: String(formData.get("propertyId") ?? ""),
    redirectTo: String(formData.get("redirectTo") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  const { orgSlug, leadId, propertyId, redirectTo } = parsed.data;
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;
  const safeRedirect = resolveSafeLeadRedirect(orgSlug, redirectTo || undefined);

  const [lead, property] = await Promise.all([
    prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: organization.id,
      },
      select: {
        id: true,
        propertyId: true,
        notes: true,
        interestLabel: true,
        budgetLabel: true,
      },
    }),
    prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId: organization.id,
      },
      select: {
        id: true,
        title: true,
      },
    }),
  ]);

  if (!lead || !property) {
    return;
  }

  const currentSignals = readLeadCommercialSignals({
    notes: lead.notes,
    interestLabel: lead.interestLabel,
    budgetLabel: lead.budgetLabel,
  });

  await prisma.$transaction([
    prisma.lead.update({
      where: {
        id: lead.id,
      },
      data: {
        propertyId: property.id,
        lastContactAt: new Date(),
        notes: writeLeadCommercialSignals(lead.notes, {
          leadTemperature: currentSignals.leadTemperature,
          extractedPreferences: currentSignals.extractedPreferences,
          nextBestAction: currentSignals.nextBestAction,
          automationSummary: lead.propertyId
            ? "Un miembro del equipo reemplazó la propiedad vinculada desde la lista sugerida."
            : "Un miembro del equipo confirmó una propiedad desde la lista sugerida.",
          requiresFollowUp: currentSignals.requiresFollowUp,
          followUpReason: currentSignals.followUpReason,
          propertyMatch: {
            status: lead.propertyId ? "manual-overridden" : "manual-confirmed",
            propertyId: property.id,
            propertyTitle: property.title,
            score:
              currentSignals.propertyMatch?.shortlist.find(
                (candidate) => candidate.propertyId === property.id,
              )?.score ?? null,
            consideredSignals: currentSignals.propertyMatch?.consideredSignals ?? [],
            shortlist: currentSignals.propertyMatch?.shortlist ?? [],
            reasons: [
              lead.propertyId
                ? "Un miembro del equipo seleccionó manualmente una propiedad diferente de la lista sugerida."
                : "Un miembro del equipo confirmó manualmente esta propiedad sugerida.",
            ],
          },
        }),
      },
    }),
    prisma.conversation.updateMany({
      where: {
        organizationId: organization.id,
        leadId: lead.id,
      },
      data: {
        propertyId: property.id,
        propertyContextNote: lead.propertyId
          ? "El vínculo de propiedad fue reemplazado manualmente desde la lista sugerida."
          : "El vínculo de propiedad fue confirmado manualmente desde la lista sugerida.",
      },
    }),
  ]);

  revalidatePath(`/${orgSlug}/leads`);
  revalidatePath(`/${orgSlug}/leads/${leadId}`);
  revalidatePath(`/${orgSlug}/conversations`);
  revalidatePath(`/${orgSlug}/properties`);
  revalidatePath(`/${orgSlug}`);
  redirect(
    safeRedirect
      ? `${safeRedirect}${safeRedirect.includes("?") ? "&" : "?"}success=property-linked`
      : `/${orgSlug}/leads/${leadId}?success=lead-updated`,
  );
}
