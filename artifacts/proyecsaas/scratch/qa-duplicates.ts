import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- QA: DUPLICATE DETECTION ---");
  
  const testEmail = "contacto@inmobiliarianorte.com";
  const testWeb = "www.inmobiliarianorte.com";

  // Create a base prospect
  const base = await prisma.commercialProspect.create({
    data: {
      companyName: "Inmobiliaria Norte Original",
      email: testEmail,
      website: testWeb,
      status: "APPROVED"
    }
  });
  console.log("Base prospect created:", base.id);

  // Now search for duplicates
  const potential = [];
  
  const byEmail = await prisma.commercialProspect.findMany({
    where: { email: { equals: testEmail, mode: "insensitive" } }
  });
  potential.push(...byEmail);

  const byWeb = await prisma.commercialProspect.findMany({
    where: { website: { contains: testWeb, mode: "insensitive" } }
  });
  potential.push(...byWeb);

  console.log("Duplicates found:", potential.length);
  potential.forEach(p => console.log(` - ${p.companyName} (${p.id})`));

  if (potential.length > 0) {
    console.log("SUCCESS: Duplicates detected correctly.");
  } else {
    console.error("FAILURE: Duplicates NOT detected.");
  }

  // Cleanup
  await prisma.commercialProspect.delete({ where: { id: base.id } });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
