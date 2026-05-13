import { prisma } from "@/server/db/prisma";
import { 
  CampaignStatus, 
  CampaignRecipientStatus, 
  ProspectStatus,
  ManualProspectStatus,
  Prisma
} from "@prisma/client";
import { canGenerateEmail } from "./service";

export async function getCampaigns() {
  return prisma.prospectingCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { recipients: true }
      }
    }
  });
}

export async function getCampaignById(id: string) {
  return prisma.prospectingCampaign.findUnique({
    where: { id },
    include: {
      recipients: {
        include: {
          prospect: true
        }
      }
    }
  });
}

export async function createCampaign(data: {
  name: string;
  subject?: string;
  body?: string;
  createdByUserId?: string;
}) {
  return prisma.prospectingCampaign.create({
    data: {
      ...data,
      status: "DRAFT"
    }
  });
}

export async function getEligibleProspectsForCampaign(filters: any = {}) {
  const where: Prisma.CommercialProspectWhereInput = {
    email: { not: null },
    isDoNotContact: false,
    status: { in: ["APPROVED", "CONTACT_READY"] },
    manualStatus: "APTO_CONTACTO"
  };

  // Additional filters based on segment rules
  if (filters.companyType) where.companyType = filters.companyType;
  if (filters.country) where.country = { contains: filters.country, mode: "insensitive" };
  if (filters.region) where.region = { contains: filters.region, mode: "insensitive" };
  if (filters.city) where.city = { contains: filters.city, mode: "insensitive" };
  if (filters.priority) where.priority = filters.priority;
  if (filters.manualRating) where.manualRating = filters.manualRating;

  return prisma.commercialProspect.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Validates and adds recipients to a campaign.
 * This checks for suppressions, duplicates within the campaign, and eligibility.
 */
export async function addRecipientsToCampaign(campaignId: string, prospectIds: string[]) {
  let finalProspectIds = prospectIds;
  
  if (prospectIds.length === 0) {
    const eligible = await getEligibleProspectsForCampaign();
    finalProspectIds = eligible.map(p => p.id);
  }

  const prospects = await prisma.commercialProspect.findMany({
    where: { id: { in: finalProspectIds } }
  });

  const suppressions = await prisma.prospectingSuppression.findMany({
    where: { email: { in: prospects.map(p => p.email).filter(Boolean) as string[] } }
  });

  const suppressedEmails = new Set(suppressions.map(s => s.email.toLowerCase()));
  
  const recipientsData: Prisma.ProspectingCampaignRecipientCreateManyInput[] = [];
  const skipped: any[] = [];

  for (const p of prospects) {
    const email = p.email?.toLowerCase();
    
    if (!email) {
      skipped.push({ prospectId: p.id, reason: "Email vacío" });
      continue;
    }

    if (suppressedEmails.has(email)) {
      skipped.push({ prospectId: p.id, reason: "En lista de supresión" });
      continue;
    }

    const eligibility = canGenerateEmail(p);
    if (!eligibility.allowed) {
      skipped.push({ prospectId: p.id, reason: eligibility.reason });
      continue;
    }

    recipientsData.push({
      campaignId,
      prospectId: p.id,
      email: p.email!,
      status: "PENDING"
    });
  }

  if (recipientsData.length > 0) {
    await prisma.prospectingCampaignRecipient.createMany({
      data: recipientsData,
      skipDuplicates: true
    });
  }

  // Update campaign counts
  const total = await prisma.prospectingCampaignRecipient.count({ where: { campaignId } });
  await prisma.prospectingCampaign.update({
    where: { id: campaignId },
    data: { 
      totalRecipients: total,
      skippedCount: { increment: skipped.length }
    }
  });

  return { added: recipientsData.length, skipped };
}

export async function markProspectAsSuppressed(email: string, reason: any, source?: string) {
  return prisma.prospectingSuppression.upsert({
    where: { email: email.toLowerCase() },
    update: { reason, source },
    create: { email: email.toLowerCase(), reason, source }
  });
}

import { sendEmailViaMailgun } from "@/server/email/mailgun";
import { logProspectActivity } from "./service";

export async function sendTestEmail(campaignId: string, testEmail: string, userId?: string) {
  const campaign = await prisma.prospectingCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign || !campaign.subject || !campaign.body) {
    throw new Error("Campaña incompleta para enviar prueba");
  }

  const result = await sendEmailViaMailgun({
    to: testEmail,
    subject: `[PRUEBA] ${campaign.subject}`,
    body: campaign.body,
    tags: ["prospecting-test"],
    metadata: { campaignId: campaign.id, userId: userId || "unknown" }
  });

  return result;
}

export async function processCampaignBatch(campaignId: string, limit: number = 20, userId?: string) {
  const campaign = await prisma.prospectingCampaign.findUnique({ 
    where: { id: campaignId },
    include: {
      recipients: {
        where: { status: "PENDING" },
        take: limit,
        include: { prospect: true }
      }
    }
  });

  if (!campaign || !campaign.subject || !campaign.body) {
    throw new Error("Campaña no encontrada o incompleta");
  }

  if (campaign.status === "SENT" || campaign.status === "CANCELED") {
    throw new Error("Campaña ya finalizada o cancelada");
  }

  // Update campaign status to SENDING if it was DRAFT or READY
  if (campaign.status !== "SENDING") {
    await prisma.prospectingCampaign.update({
      where: { id: campaignId },
      data: { status: "SENDING" }
    });
  }

  let sent = 0;
  let failed = 0;

  for (const recipient of campaign.recipients) {
    const result = await sendEmailViaMailgun({
      to: recipient.email,
      subject: campaign.subject,
      body: campaign.body,
      tags: ["prospecting-campaign"],
      metadata: { 
        campaignId: campaign.id, 
        prospectId: recipient.prospectId,
        recipientId: recipient.id
      }
    });

    if (result.success) {
      sent++;
      await prisma.prospectingCampaignRecipient.update({
        where: { id: recipient.id },
        data: { 
          status: "SENT", 
          sentAt: new Date(), 
          providerMessageId: result.messageId 
        }
      });

      // Mark prospect as contacted
      await prisma.commercialProspect.update({
        where: { id: recipient.prospectId },
        data: { 
          status: "CONTACTED", 
          lastContactedAt: new Date(),
          contactedAt: {
            set: recipient.prospect.contactedAt || new Date()
          }
        }
      });

      await logProspectActivity(
        recipient.prospectId, 
        "contact_marked_sent" as any, 
        `Email enviado vía campaña: ${campaign.name}`, 
        userId,
        { campaignId: campaign.id }
      );
    } else {
      failed++;
      await prisma.prospectingCampaignRecipient.update({
        where: { id: recipient.id },
        data: { 
          status: "FAILED", 
          failedAt: new Date(), 
          errorMessage: result.error 
        }
      });
    }
  }

  // Update final counts
  const updatedCampaign = await prisma.prospectingCampaign.update({
    where: { id: campaignId },
    data: {
      sentCount: { increment: sent },
      failedCount: { increment: failed }
    },
    include: {
      _count: {
        select: {
          recipients: { where: { status: "PENDING" } }
        }
      }
    }
  });

  // If no more pending recipients, mark as SENT
  if (updatedCampaign._count.recipients === 0) {
    await prisma.prospectingCampaign.update({
      where: { id: campaignId },
      data: { 
        status: "SENT",
        sentAt: new Date()
      }
    });
  }

  return { sent, failed, remaining: updatedCampaign._count.recipients };
}
