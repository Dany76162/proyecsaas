import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.whatsAppChannelConnectionRequest.count();
    console.log("REQUESTS COUNT:", count);
  } catch (e: any) {
    console.log("ERROR QUERYING REQUESTS:", e.message);
  }
}

main()
  .finally(() => prisma.$disconnect());
