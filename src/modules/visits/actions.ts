"use server";

import { VisitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getOrganizationBySlug } from "@/server/db/organization-context";
import {
  createVisitForAutomation,
  VisitAutomationError,
} from "@/modules/visits/service";

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
  const organization = await getOrganizationBySlug(orgSlug);

  if (!organization) {
    redirect("/login");
  }

  const parsed = createVisitSchema.safeParse({
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    status: String(formData.get("status") ?? ""),
  });

  if (!parsed.success) {
    redirectToVisitError(orgSlug, leadId, "invalid-visit");
  }

  let propertyId = "";

  try {
    const result = await createVisitForAutomation({
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
