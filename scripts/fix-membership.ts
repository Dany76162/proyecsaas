import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const orgSlug = process.argv[3];

  if (!email || !orgSlug) {
    console.error("Usage: npx ts-node scripts/fix-membership.ts <email> <orgSlug>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log("ORGANIZATIONS:", orgs);

  const org = await prisma.organization.findFirst({
    where: {
      slug: orgSlug,
    },
  });

  if (!user) {
    console.log("❌ Usuario no encontrado");
    return;
  }

  if (!org) {
    console.log("❌ Organización no encontrada");
    return;
  }

  await prisma.membership.deleteMany({
    where: {
      userId: user.id,
    },
  });

  await prisma.membership.create({
    data: {
      role: "OWNER",
      userId: user.id,
      organizationId: org.id,
    },
  });

  console.log("✅ Membership creado correctamente");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
