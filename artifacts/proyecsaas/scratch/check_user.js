const { PrismaClient } = require("@prisma/client");

const p = new PrismaClient({
  datasourceUrl: "postgresql://proyecsaas_user:1234@localhost:5432/proyecsaas",
});

async function main() {
  const user = await p.user.findFirst({
    where: { email: "dany76162@gmail.com" },
    select: {
      id: true,
      email: true,
      isPlatformAdmin: true,
      isActive: true,
      passwordHash: true,
      fullName: true,
      memberships: {
        select: {
          role: true,
          organization: { select: { slug: true, name: true, isActive: true } },
        },
      },
    },
  });

  if (!user) {
    console.log("USER NOT FOUND: dany76162@gmail.com");
    console.log("\nAll users:");
    const all = await p.user.findMany({
      select: { id: true, email: true, isPlatformAdmin: true, isActive: true },
    });
    console.log(JSON.stringify(all, null, 2));
  } else {
    console.log("USER FOUND:");
    console.log(JSON.stringify(user, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => p.$disconnect());
