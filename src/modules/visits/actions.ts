"use server";

import { LeadStatus, VisitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getOrganizationBySlug } from "@/server/db/organization-context";
import { prisma } from "@/server/db/prisma";

const createVisitSchema = z.object({
  scheduledAt: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date"),
  status: z.nativeEnum(VisitStatus),
});

export async function createVisitAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    return;
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      organizationId: organization.id,
    },
    select: {
      id: true,
      propertyId: true,
      ownerId: true,
    },
  });

  if (!lead?.propertyId) {
    return;
  }

  const parsed = createVisitSchema.safeParse({
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    status: String(formData.get("status") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  const property = await prisma.property.findFirst({
    where: {
      id: lead.propertyId,
      organizationId: organization.id,
    },
    select: {
      id: true,
    },
  });

  if (!property) {
    return;
  }

  const fallbackOwner = await prisma.membership.findFirst({
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

  const ownerId = lead.ownerId || fallbackOwner?.userId;

  if (!ownerId) {
    return;
  }

  const visit = await prisma.visit.create({
    data: {
      organizationId: organization.id,
      leadId,
      propertyId: lead.propertyId,
      createdById: ownerId,
      scheduledAt: new Date(parsed.data.scheduledAt),
      status: parsed.data.status,
      notes: "Visit created directly from lead detail.",
    },
  });

  if (!visit) {
    return;
  }

  await prisma.lead.update({
    where: {
      id: leadId,
    },
    data: {
      status: LeadStatus.VISIT,
      lastContactAt: new Date(),
    },
  });

  revalidatePath(`/${orgSlug}/visits`);
  revalidatePath(`/${orgSlug}/leads/${leadId}`);
  revalidatePath(`/${orgSlug}/properties/${lead.propertyId}`);
  revalidatePath(`/${orgSlug}`);
  redirect(`/${orgSlug}/leads/${leadId}?success=visit-created`);
}
