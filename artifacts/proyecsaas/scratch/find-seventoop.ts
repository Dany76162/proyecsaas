import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: 'seventoop', mode: 'insensitive' } },
        { slug: { contains: 'seventoop', mode: 'insensitive' } }
      ]
    }
  });
  console.log("MATCHING ORGS:", orgs.length);
  orgs.forEach(o => console.log(` - ${o.slug} (${o.name})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
