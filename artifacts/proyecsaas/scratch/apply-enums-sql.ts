import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Applying conversion states...");
  
  try {
    // Postgres specific: Alter enum
    // Note: ADD VALUE cannot be executed inside a transaction block in some PG versions
    await prisma.$executeRawUnsafe(`ALTER TYPE "ProspectStatus" ADD VALUE 'CONVERTED'`).catch(e => console.log("ProspectStatus.CONVERTED already exists or error."));
    await prisma.$executeRawUnsafe(`ALTER TYPE "ProspectActivityType" ADD VALUE 'converted_to_org'`).catch(e => console.log("ProspectActivityType.converted_to_org already exists or error."));
    
    console.log("DONE.");
  } catch (err) {
    console.error("Error applying SQL:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
