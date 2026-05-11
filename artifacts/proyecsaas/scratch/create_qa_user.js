const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

// Minimal hash function for testing (should match verifyPassword logic in auth.ts)
// Wait, I should use the real password hashing if possible.
// Actually, for platform admin, it uses timingSafePasswordEqual with AUTH_SHARED_PASSWORD.
// So I just need a user with email and isPlatformAdmin: true.

async function createQaUser() {
  const email = "qa@raicespilot.com";
  const user = await prisma.user.upsert({
    where: { email },
    update: { isPlatformAdmin: true, isActive: true },
    create: {
      email,
      fullName: "QA Auditor",
      isPlatformAdmin: true,
      isActive: true,
    }
  });
  console.log("QA User created/updated:", user.email);
}

createQaUser().finally(() => prisma.$disconnect());
