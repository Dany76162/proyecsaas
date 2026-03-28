"use server";

import { VisitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { MembershipRole } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import {
  createVisitForAutomation,
  VisitAutomationError,
} from "@/modules/visits/service";
import { assertMinimumRole, requireOrganizationMembership } from "@/server/auth/access";
import { getAutomationQueue } from "@/server/queues";

const createVisitSchema = z.object({
  scheduledAt: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date"),
  status: z.nativeEnum(VisitStatus),
});

function redirectToVisitError(orgSlug: string, leadId: string, error: string): never {
  redirect(`/${orgSlug}/leads/${leadId}?error=${error}`);
}

export async function createVisitAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);
  const organization = membership.organization;

  const parsed = createVisitSchema.safeParse({
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    status: String(formData.get("status") ?? ""),
  });

  if (!parsed.success) {
    redirectToVisitError(orgSlug, leadId, "invalid-visit");
  }

  let propertyId = "";

  try {
    const result = await createVisitForAutomation(prisma, {
      organizationId: organization.id,
      leadId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      status: parsed.data.status,
      notes: "Visit created directly from lead detail.",
    });

    propertyId = result.propertyId;
  } catch (error) {
    if (error instanceof VisitAutomationError) {
      redirectToVisitError(orgSlug, leadId, error.code);
    }

    redirectToVisitError(orgSlug, leadId, "visit-create-failed");
  }

  revalidatePath(`/${orgSlug}/visits`);
  revalidatePath(`/${orgSlug}/leads/${leadId}`);
  revalidatePath(`/${orgSlug}/properties/${propertyId}`);
  revalidatePath(`/${orgSlug}`);
  redirect(`/${orgSlug}/leads/${leadId}?success=visit-created`);
}

const updateVisitStatusSchema = z.object({
  visitId: z.string().trim().min(1),
  nextStatus: z.nativeEnum(VisitStatus),
  tab: z.enum(["upcoming", "all"]).default("upcoming"),
});

function redirectToVisitsResult(
  orgSlug: string,
  tab: "upcoming" | "all",
  params: Record<string, string>,
): never {
  const search = new URLSearchParams(params);

  if (tab === "all") {
    search.set("tab", "all");
  }

  redirect(`/${orgSlug}/visits?${search.toString()}`);
}

function isAllowedVisitStatusTransition(
  currentStatus: VisitStatus,
  nextStatus: VisitStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return false;
  }

  if (currentStatus === VisitStatus.PENDING) {
    return nextStatus === VisitStatus.CONFIRMED || nextStatus === VisitStatus.CANCELED;
  }

  if (currentStatus === VisitStatus.CONFIRMED) {
    return nextStatus === VisitStatus.COMPLETED || nextStatus === VisitStatus.CANCELED;
  }

  return false;
}

export async function updateVisitStatusAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const { membership } = await requireOrganizationMembership(orgSlug);
  assertMinimumRole(membership.role, MembershipRole.AGENT);

  const parsed = updateVisitStatusSchema.safeParse({
    visitId: String(formData.get("visitId") ?? ""),
    nextStatus: String(formData.get("nextStatus") ?? ""),
    tab: String(formData.get("tab") ?? "upcoming"),
  });

  const fallbackTab = parsed.success ? parsed.data.tab : "upcoming";

  if (!parsed.success) {
    redirectToVisitsResult(orgSlug, fallbackTab, { error: "invalid-visit-status" });
  }

  const visit = await prisma.visit.findFirst({
    where: {
      id: parsed.data.visitId,
      organizationId: membership.organization.id,
    },
    select: {
      id: true,
      status: true,
      leadId: true,
      propertyId: true,
    },
  });

  if (!visit) {
    redirectToVisitsResult(orgSlug, parsed.data.tab, { error: "visit-not-found" });
  }

  if (!isAllowedVisitStatusTransition(visit.status, parsed.data.nextStatus)) {
    redirectToVisitsResult(orgSlug, parsed.data.tab, { error: "invalid-visit-transition" });
  }

  await prisma.visit.update({
    where: {
      id: visit.id,
    },
    data: {
      status: parsed.data.nextStatus,
    },
  });

  // Trigger post-visit follow-up automation when a visit is marked completed
  if (parsed.data.nextStatus === VisitStatus.COMPLETED && visit.leadId) {
    try {
      const queue = getAutomationQueue();
      await queue.add("post-visit-follow-up", {
        source: "post-visit" as const,
        organizationId: membership.organization.id,
        visitId: visit.id,
        leadId: visit.leadId,
        propertyId: visit.propertyId,
      });
    } catch (error) {
      // Don't fail the action if Redis is unavailable — visit is already updated
      console.error(
        JSON.stringify({
          scope: "visits",
          event: "post-visit-enqueue-failed",
          visitId: visit.id,
          leadId: visit.leadId,
          error: error instanceof Error ? error.message : "unknown",
        }),
      );
    }
  }

  revalidatePath(`/${orgSlug}/visits`);
  revalidatePath(`/${orgSlug}`);

  if (visit.leadId) {
    revalidatePath(`/${orgSlug}/leads/${visit.leadId}`);
  }

  revalidatePath(`/${orgSlug}/properties/${visit.propertyId}`);

  redirectToVisitsResult(orgSlug, parsed.data.tab, {
    success: `visit-${parsed.data.nextStatus.toLowerCase()}`,
  });
}
