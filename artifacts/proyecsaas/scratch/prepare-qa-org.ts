import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = 'seventoop-marketing-digital';
  const name = 'Seventoop Marketing Digital';

  console.log(`Creating/Updating organization: ${slug}`);
  const org = await prisma.organization.upsert({
    where: { slug },
    create: {
      slug,
      name,
      isActive: true,
      contactWhatsapp: '5491100000000',
    },
    update: {
      isActive: true,
    }
  });

  console.log(`Organization ready: ${org.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
