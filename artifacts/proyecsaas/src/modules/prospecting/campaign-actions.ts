"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/server/auth/access";
import { 
  createCampaign, 
  addRecipientsToCampaign, 
  sendTestEmail, 
  processCampaignBatch 
} from "./campaign-service";
import { prisma } from "@/server/db/prisma";

export async function createCampaignAction(formData: FormData) {
  const user = await requirePlatformAdmin();
  
  const name = formData.get("name") as string;
  if (!name) throw new Error("Nombre de campaña es obligatorio");

  const campaign = await createCampaign({
    name,
    subject: formData.get("subject") as string,
    body: formData.get("body") as string,
    createdByUserId: user.id
  });

  revalidatePath("/platform/agents/prospecting/campaigns");
  redirect(`/platform/agents/prospecting/campaigns/${campaign.id}`);
}

export async function addRecipientsToCampaignAction(campaignId: string, prospectIds: string[]) {
  await requirePlatformAdmin();
  const res = await addRecipientsToCampaign(campaignId, prospectIds);
  revalidatePath(`/platform/agents/prospecting/campaigns/${campaignId}`);
  return res;
}

export async function sendTestEmailAction(campaignId: string, testEmail: string) {
  const user = await requirePlatformAdmin();
  const res = await sendTestEmail(campaignId, testEmail, user.id);
  return res;
}

export async function runCampaignBatchAction(campaignId: string, confirmText: string) {
  const user = await requirePlatformAdmin();
  
  if (confirmText !== "ENVIAR") {
    throw new Error("Confirmación incorrecta");
  }

  const res = await processCampaignBatch(campaignId, 20, user.id);
  
  revalidatePath("/platform/agents/prospecting/campaigns");
  revalidatePath(`/platform/agents/prospecting/campaigns/${campaignId}`);
  
  return res;
}

export async function updateCampaignContentAction(campaignId: string, formData: FormData) {
  await requirePlatformAdmin();
  
  await prisma.prospectingCampaign.update({
    where: { id: campaignId },
    data: {
      subject: formData.get("subject") as string,
      body: formData.get("body") as string,
    }
  });

  revalidatePath(`/platform/agents/prospecting/campaigns/${campaignId}`);
  return { success: true };
}
