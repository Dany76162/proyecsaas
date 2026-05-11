const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function addMembership() {
  const superadminEmail = "dany76162@gmail.com";
  const user = await prisma.user.findFirst({
    where: { email: superadminEmail }
  });

  if (!user) {
    console.error("Superadmin user not found");
    return;
  }

  const org = await prisma.organization.findFirst({
    where: { slug: "alberto-capelli" }
  });

  if (!org) {
    console.error("Organization alberto-capelli not found");
    return;
  }

  await prisma.membership.upsert({
    where: {
      id: "membership_superadmin_alberto_capelli"
    },
    update: {
      role: "OWNER"
    },
    create: {
      id: "membership_superadmin_alberto_capelli",
      userId: user.id,
      organizationId: org.id,
      role: "OWNER"
    }
  });

  console.log(`Membership added for ${superadminEmail} in alberto-capelli`);
}

addMembership()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
