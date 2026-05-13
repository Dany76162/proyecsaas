import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgSlug = 'seventoop-marketing-digital';
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return;

  console.log("--- SCENARIO 2: PENDING REQUEST ---");
  
  // Create a pending request
  await prisma.whatsAppChannelConnectionRequest.create({
    data: {
      organizationId: org.id,
      requestedPhoneNumber: '5491112345678',
      businessName: 'Seventoop QA',
      contactName: 'Tester',
      contactEmail: 'tester@seventoop.com',
      status: 'PENDING'
    }
  });

  const [tenantChannels, connectionRequests] = await Promise.all([
    prisma.whatsAppChannel.findMany({
      where: { organization: { slug: orgSlug }, isActive: true }
    }),
    prisma.whatsAppChannelConnectionRequest.findMany({
      where: { organization: { slug: orgSlug } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const activeTenantChannel = tenantChannels.find(ch => ch.status === "ACTIVE");
  const hasOwnChannel = !!activeTenantChannel;
  const hasPendingRequest = !hasOwnChannel && connectionRequests.some(r => r.status === "PENDING" || r.status === "IN_REVIEW");

  console.log("Has Own Channel:", hasOwnChannel);
  console.log("Has Pending Request:", hasPendingRequest);
  console.log("Pending Numbers:", connectionRequests.filter(r => r.status === "PENDING").map(r => r.requestedPhoneNumber));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
