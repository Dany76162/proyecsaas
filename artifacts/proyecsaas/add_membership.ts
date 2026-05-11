import { prisma } from "./src/server/db/prisma";
import { MembershipRole } from "@prisma/client";

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
    where: { slug: "north-hill" }
  });

  if (!org) {
    console.error("Organization north-hill not found");
    return;
  }

  await prisma.membership.upsert({
    where: {
      id: "membership_superadmin_north_hill"
    },
    update: {
      role: MembershipRole.OWNER
    },
    create: {
      id: "membership_superadmin_north_hill",
      userId: user.id,
      organizationId: org.id,
      role: MembershipRole.OWNER
    }
  });

  console.log(`Membership added for ${superadminEmail} in north-hill`);
}

addMembership().catch(console.error);
