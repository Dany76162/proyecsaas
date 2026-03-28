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

  const lead = await prisma.lead.create({
    data: {
      organizationId: organization.id,
      ownerId: defaultOwner?.userId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      status: LeadStatus.NEW,
      source: "Manual entry",
      notes: "Created manually from the CRM workspace.",
      interestLabel: "New inquiry",
      budgetLabel: "Pending qualification",
      lastContactAt: new Date(),
    },
  });

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
            ? `A team member manually ${currentLead.propertyId ? "overrode" : "confirmed"} the property link from the lead workspace.`
            : "A team member manually removed the property link from the lead workspace.",
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
                    ? "A team member replaced the linked property manually from the lead workspace."
                    : "A team member confirmed one property manually from the suggested workspace context.",
                ],
              }
            : {
                status: "no-match",
                propertyId: null,
                propertyTitle: null,
                score: null,
                consideredSignals: currentSignals.propertyMatch?.consideredSignals ?? [],
                shortlist: currentSignals.propertyMatch?.shortlist ?? [],
                reasons: ["A team member cleared the property link manually."],
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
            ? "A team member overrode the property link from the shortlist."
            : "A team member confirmed one property from the shortlist.",
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
                ? "A team member selected a different property manually from the shortlist."
                : "A team member confirmed this suggested property manually from the shortlist.",
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
          ? "Property link was overridden manually from the shortlist."
          : "Property link was confirmed manually from the shortlist.",
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
