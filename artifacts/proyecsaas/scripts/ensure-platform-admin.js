const { PrismaClient } = require("@prisma/client");
const { randomBytes, scrypt } = require("node:crypto");
const { promisify } = require("node:util");

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64");
  const buf = await scryptAsync(password, salt, 64);
  return `${salt}:${buf.toString("base64")}`;
}

async function main() {
  const passwordHash = await hashPassword("123456");

  const user = await prisma.user.upsert({
    where: { email: "admin@raicespilot.local" },
    update: {
      fullName: "Admin RaicesPilot",
      jobTitle: "Superadmin",
      isActive: true,
      isPlatformAdmin: true,
      passwordHash,
    },
    create: {
      id: "user_platform_admin",
      email: "admin@raicespilot.local",
      fullName: "Admin RaicesPilot",
      jobTitle: "Superadmin",
      isActive: true,
      isPlatformAdmin: true,
      passwordHash,
    },
  });

  console.log(`Platform admin listo: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
