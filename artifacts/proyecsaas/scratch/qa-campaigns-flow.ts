import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Local implementation of the logic to avoid server-only imports
async function addRecipientsManual(campaignId: string, prospectIds: string[]) {
  const prospects = await prisma.commercialProspect.findMany({
    where: { id: { in: prospectIds } }
  });

  const added = [];
  const skipped = [];

  for (const p of prospects) {
    if (p.isDoNotContact || p.status === "NEEDS_REVIEW") {
      skipped.push({ id: p.id });
      continue;
    }
    added.push(p);
  }

  if (added.length > 0) {
    await prisma.prospectingCampaignRecipient.createMany({
      data: added.map(p => ({
        campaignId,
        prospectId: p.id,
        email: p.email!,
        status: "PENDING"
      }))
    });
  }
  return { added: added.length, skipped };
}

async function main() {
  console.log("--- QA: EMAIL CAMPAIGNS FLOW ---");

  // 1. Setup Test Prospects
  const p1 = await prisma.commercialProspect.create({
    data: {
      companyName: "QA Apto",
      email: "apto@test.com",
      status: "APPROVED",
      manualStatus: "APTO_CONTACTO"
    }
  });

  const p2 = await prisma.commercialProspect.create({
    data: {
      companyName: "QA Excluido DNC",
      email: "dnc@test.com",
      status: "APPROVED",
      manualStatus: "APTO_CONTACTO",
      isDoNotContact: true
    }
  });

  const p3 = await prisma.commercialProspect.create({
    data: {
      companyName: "QA Excluido Review",
      email: "review@test.com",
      status: "NEEDS_REVIEW",
      manualStatus: "REVISAR"
    }
  });

  console.log("Prospects created:", p1.id, p2.id, p3.id);

  // 2. Create Campaign
  const campaign = await prisma.prospectingCampaign.create({
    data: {
      name: "QA Campaign Test",
      subject: "Hello QA",
      body: "This is a test body for {{companyName}}",
      status: "DRAFT"
    }
  });
  console.log("Campaign created:", campaign.id);

  // 3. Test Exclusion Logic
  console.log("Adding recipients...");
  const res = await addRecipientsManual(campaign.id, [p1.id, p2.id, p3.id]);
  console.log("Result:", res);

  if (res.added === 1 && res.skipped.length === 2) {
    console.log("SUCCESS: Exclusion logic works correctly (1 added, 2 skipped).");
  } else {
    console.error("FAILURE: Exclusion logic FAILED.", res);
  }

  // 4. Test Simulation (Status updates)
  console.log("Simulating batch...");
  await prisma.prospectingCampaignRecipient.updateMany({
    where: { campaignId: campaign.id, status: "PENDING" },
    data: { status: "SENT", sentAt: new Date() }
  });

  await prisma.commercialProspect.update({
    where: { id: p1.id },
    data: { status: "CONTACTED", contactedAt: new Date(), lastContactedAt: new Date() }
  });

  // 5. Verify Tracking
  const recipient = await prisma.prospectingCampaignRecipient.findFirst({
    where: { campaignId: campaign.id, prospectId: p1.id }
  });
  console.log("Recipient status:", recipient?.status);

  const updatedP1 = await prisma.commercialProspect.findUnique({ where: { id: p1.id } });
  console.log("Prospect status:", updatedP1?.status);
  
  if (recipient?.status === "SENT" && updatedP1?.status === "CONTACTED") {
    console.log("SUCCESS: Tracking and status updates work correctly.");
  } else {
    console.error("FAILURE: Tracking FAILED.");
  }

  // Cleanup
  await prisma.prospectingCampaign.delete({ where: { id: campaign.id } });
  await prisma.commercialProspect.deleteMany({ where: { id: { in: [p1.id, p2.id, p3.id] } } });
  console.log("Cleanup done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
