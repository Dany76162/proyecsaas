"use server";

import { VisitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  createDemoVisit,
  getDemoLeadById,
  getDemoOrganizationBySlug,
  listDemoUsersByOrganization,
} from "@/server/demo/workspace-store";

const createVisitSchema = z.object({
  scheduledAt: z.string().min(1),
  status: z.nativeEnum(VisitStatus),
});

export async function createVisitAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return;
  }

  const lead = getDemoLeadById(organization.id, leadId);

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

  const owner = listDemoUsersByOrganization(organization.id)[0];

  createDemoVisit({
    organizationId: organization.id,
    leadId,
    propertyId: lead.propertyId,
    createdById: owner?.id ?? "",
    scheduledAt: new Date(parsed.data.scheduledAt).toISOString(),
    status: parsed.data.status,
  });

  revalidatePath(`/${orgSlug}/visits`);
  revalidatePath(`/${orgSlug}/leads/${leadId}`);
  revalidatePath(`/${orgSlug}/properties/${lead.propertyId}`);
  revalidatePath(`/${orgSlug}`);
}
