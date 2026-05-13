import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { slug: true, name: true },
    take: 20
  });
  console.log("ORGANIZATIONS FOUND:");
  orgs.forEach(o => console.log(` - ${o.slug} (${o.name})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
