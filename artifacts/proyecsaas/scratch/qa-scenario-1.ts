import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgSlug = 'seventoop-marketing-digital';
  
  // Scenario 1: No channels, no requests
  const [tenantChannels, connectionRequests] = await Promise.all([
    prisma.whatsAppChannel.findMany({
      where: { organization: { slug: orgSlug }, isActive: true }
    }),
    prisma.whatsAppChannelConnectionRequest.findMany({
      where: { organization: { slug: orgSlug } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  console.log("--- SCENARIO 1: NO CHANNELS ---");
  console.log("Tenant Channels:", tenantChannels.length);
  console.log("Connection Requests:", connectionRequests.length);
  
  // Simulation of priority logic in WhatsAppConnectionForm
  const activeTenantChannel = tenantChannels.find(ch => ch.status === "ACTIVE");
  const hasOwnChannel = !!activeTenantChannel;
  const platformPhone = "5491161630205"; // Mock platform phone
  const isPlatformFallback = !hasOwnChannel && !!platformPhone;
  
  const activeNumber = hasOwnChannel ? activeTenantChannel.displayPhoneNumber : platformPhone;
  const routingCode = `[ref:${orgSlug}]`;
  const prefilledText = isPlatformFallback 
    ? `${routingCode} Hola, me interesan sus propiedades.`
    : `Hola, me interesan sus propiedades de Seventoop.`;

  console.log("Selected Number:", activeNumber);
  console.log("Is Platform Fallback:", isPlatformFallback);
  console.log("Routing Code Required:", isPlatformFallback);
  console.log("Prefilled Text:", prefilledText);
  console.log("Link Generated:", `https://wa.me/${activeNumber?.replace(/\D/g, '')}?text=${encodeURIComponent(prefilledText)}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
