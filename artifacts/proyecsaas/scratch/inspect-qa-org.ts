import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = 'seventoop-marketing-digital';
  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      whatsappChannels: true,
      whatsappConnectionRequests: true
    }
  });

  if (!org) {
    console.log(`Organization ${slug} not found`);
    return;
  }

  console.log("ORGANIZATION:", org.name, `(${org.id})`);
  console.log("CHANNELS:", org.whatsappChannels.length);
  org.whatsappChannels.forEach(ch => {
    console.log(` - ID: ${ch.id}, Num: ${ch.displayPhoneNumber}, Status: ${ch.status}, Primary: ${ch.isPrimary}`);
  });
  console.log("REQUESTS:", org.whatsappConnectionRequests.length);
  org.whatsappConnectionRequests.forEach(req => {
    console.log(` - ID: ${req.id}, Num: ${req.requestedPhoneNumber}, Status: ${req.status}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
