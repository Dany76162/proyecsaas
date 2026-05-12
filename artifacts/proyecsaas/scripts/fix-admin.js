const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: "dany76162@gmail.com" },
    data: {
      isPlatformAdmin: true,
      isActive: true,
      passwordHash: null,
    },
  });

  console.log("Usuario actualizado:", user.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
