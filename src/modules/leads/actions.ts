"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createDemoLead,
  getDemoOrganizationBySlug,
  updateDemoLead,
} from "@/server/demo/workspace-store";
import { createLeadSchema, updateLeadSchema } from "@/modules/leads/schemas";

export async function createLeadAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return;
  }

  const parsed = createLeadSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
  });

  if (!parsed.success) {
    return;
  }

  const lead = createDemoLead({
    organizationId: organization.id,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
  });

  revalidatePath(`/${orgSlug}/leads`);
  revalidatePath(`/${orgSlug}`);
  redirect(`/${orgSlug}/leads/${lead.id}`);
}

export async function updateLeadAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const leadId = String(formData.get("leadId") ?? "");
  const organization = getDemoOrganizationBySlug(orgSlug);

  if (!organization) {
    return;
  }

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

  const lead = updateDemoLead({
    organizationId: organization.id,
    leadId,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    status: parsed.data.status,
    propertyId: parsed.data.propertyId || undefined,
  });

  if (!lead) {
    return;
  }

  revalidatePath(`/${orgSlug}/leads`);
  revalidatePath(`/${orgSlug}/leads/${leadId}`);
  revalidatePath(`/${orgSlug}/properties`);
  revalidatePath(`/${orgSlug}`);
  redirect(`/${orgSlug}/leads/${lead.id}`);
}
