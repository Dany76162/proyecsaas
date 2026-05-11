const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function listOrgs() {
  const orgs = await prisma.organization.findMany({
    select: { slug: true, name: true }
  });
  console.log("Organizations in DB:", orgs);
}

listOrgs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
