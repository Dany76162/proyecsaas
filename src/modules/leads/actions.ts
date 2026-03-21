"use server";

import { LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createLeadSchema, updateLeadSchema } from "@/modules/leads/schemas";
import { getOrganizationBySlug } from "@/server/db/organization-context";
import { prisma } from "@/server/db/prisma";

export async function createLeadAction(formData: FormData) {
  const orgSlug = String(formData.get("orgSlug") ?? "");
  const organization = await getOrganizationBySlug(orgSlug);

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
  const organization = await getOrganizationBySlug(orgSlug);

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

  const updatedLead = await prisma.lead.findUnique({
    where: {
      id: leadId,
    },
    select: {
      id: true,
    },
  });

  if (!updatedLead) {
    return;
  }

  revalidatePath(`/${orgSlug}/leads`);
  revalidatePath(`/${orgSlug}/leads/${leadId}`);
  revalidatePath(`/${orgSlug}/properties`);
  revalidatePath(`/${orgSlug}`);
  redirect(`/${orgSlug}/leads/${updatedLead.id}?success=lead-updated`);
}
