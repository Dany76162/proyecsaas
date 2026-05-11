const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      passwordHash: true,
      isPlatformAdmin: true,
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

checkUsers().finally(() => prisma.$disconnect());
