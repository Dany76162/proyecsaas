import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.organization.count();
  console.log("ORGANIZATION COUNT:", count);
  
  const channels = await prisma.whatsAppChannel.findMany();
  console.log("WHATSAPP CHANNELS:", channels.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
