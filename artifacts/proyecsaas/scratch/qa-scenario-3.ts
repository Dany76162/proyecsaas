import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgSlug = 'seventoop-marketing-digital';
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return;

  console.log("--- SCENARIO 3: OWN ACTIVE CHANNEL ---");
  
  // Crear canal propio activo
  await prisma.whatsAppChannel.create({
    data: {
      organizationId: org.id,
      phoneNumberId: '1234567890',
      displayPhoneNumber: '5491177778888',
      name: 'WhatsApp Propio Seventoop',
      status: 'ACTIVE',
      isPrimary: true,
      provider: 'WHATSAPP_CLOUD'
    }
  });

  const [tenantChannels] = await Promise.all([
    prisma.whatsAppChannel.findMany({
      where: { organization: { slug: orgSlug }, isActive: true }
    })
  ]);

  const activeTenantChannel = tenantChannels.find(ch => ch.status === "ACTIVE");
  const hasOwnChannel = !!activeTenantChannel;
  const platformPhone = "5491161630205";

  // Lógica de prioridad
  const activeNumber = hasOwnChannel ? activeTenantChannel.displayPhoneNumber : platformPhone;
  const isPlatformFallback = !hasOwnChannel && !!platformPhone;
  const routingCode = `[ref:${orgSlug}]`;
  const prefilledText = isPlatformFallback 
    ? `${routingCode} Hola, me interesan sus propiedades.`
    : `Hola, me interesan sus propiedades de Seventoop.`;

  console.log("Selected Number:", activeNumber);
  console.log("Is Own Channel Active:", hasOwnChannel);
  console.log("Includes routing code?", prefilledText.includes(routingCode));
  console.log("Link Generated:", `https://wa.me/${activeNumber?.replace(/\D/g, '')}?text=${encodeURIComponent(prefilledText)}`);
}

main().finally(() => prisma.$disconnect());
