import { PrismaClient } from "@prisma/client";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64");
  const buf = (await scryptAsync(password, salt, 64));
  return `${salt}:${buf.toString("base64")}`;
}

const prisma = new PrismaClient();

async function main() {
  const password = "password123";
  const hash = await hashPassword(password);
  
  await prisma.user.updateMany({
    where: { email: "camila@northhill.example" },
    data: { passwordHash: hash, isActive: true }
  });

  await prisma.user.updateMany({
    where: { email: "danielcata2023@gmail.com" },
    data: { passwordHash: hash, isActive: true }
  });

  // Ensure danielcata2023@gmail.com has an organization membership if it doesn't already
  const cataUser = await prisma.user.findUnique({ where: { email: "danielcata2023@gmail.com" } });
  if (cataUser) {
    const org = await prisma.organization.findUnique({ where: { slug: "north-hill" } });
    if (org) {
      await prisma.membership.upsert({
        where: {
          userId_organizationId: {
            userId: cataUser.id,
            organizationId: org.id
          }
        },
        update: { role: "OWNER" },
        create: {
          userId: cataUser.id,
          organizationId: org.id,
          role: "OWNER"
        }
      });
    }
  }

  console.log("Local auth setup complete.");
  console.log("===============================");
  console.log("User 1:");
  console.log("Email: camila@northhill.example");
  console.log("Password: " + password);
  console.log("===============================");
  console.log("User 2 (if exists):");
  console.log("Email: danielcata2023@gmail.com");
  console.log("Password: " + password);
  console.log("===============================");
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
