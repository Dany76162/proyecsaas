import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      email: "dany76162@gmail.com",
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
      slug: "north-hill",
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